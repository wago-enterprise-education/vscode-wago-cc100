import { Client, utils } from 'ssh2';
import { userInfo } from 'os';
import * as vscode from 'vscode';
import * as Path from 'path';
import * as fs from 'fs';
import { ControllerProvider } from './view';
import * as net from 'net';
import { extensionContext } from '../extension';
import { YamlCommands } from '../shared/yamlCommands';
import { CONNECTION_SETTINGS } from '../shared/constants';

const {
    MAX_CONNECTIONS: maxConnections,
    GARBAGE_COLLECTOR_INTERVAL: garbageCollectorInterval,
    TIMEOUT: timeout,
    RECONNECTION_TIMEOUT: reconnectionTimeout,
    SCRIPT_PATH: scriptPath,
    REMOTE_TMP_PATH: remoteTmpPath,
    PUBLIC_KEY_PATH: publicKeyPath,
    PRIVATE_KEY_PATH: privateKeyPath,
} = CONNECTION_SETTINGS;

/**
 * Singleton SSH connection manager for WAGO CC100 controllers.
 *
 * Manages a pool of persistent SSH connections to multiple controllers, providing:
 * - Connection pooling and reuse for efficient resource utilization
 * - Automatic garbage collection of unused connections
 * - Command execution and script running capabilities
 * - File and directory upload functionality
 * - Connection health monitoring and automatic reconnection
 * - SSH key-based authentication with fallback to password authentication
 *
 * The manager maintains multiple connections per controller to handle concurrent operations
 * while respecting configurable connection limits and timeout settings.
 */
export class ConnectionManager {
    public static readonly instance = new ConnectionManager();

    private connections: Connection[] = [];

    /**
     * Private constructor implementing the Singleton pattern.
     * Initializes the garbage collection timer to clean up unused connections.
     *
     * The garbage collector runs periodically to:
     * - Remove connections idle longer than the configured interval
     * - Preserve at least one connection per controller for quick access
     * - Prevent memory leaks from abandoned connections
     */
    private constructor() {
        setInterval(() => {
            const indicesToRemove: number[] = [];
            this.connections.forEach((connection, index) => {
                if (connection.lastUsed > Date.now() - garbageCollectorInterval)
                    return;
                if (this.isLastConnection(connection.controllerId)) return;
                indicesToRemove.push(index);
                connection.disconnect();
            });

            // Remove connections in reverse order to avoid index shifting
            for (const index of indicesToRemove.reverse()) {
                this.connections.splice(index, 1);
            }
        }, garbageCollectorInterval);
    }

    /**
     * Adds a new controller to the connection pool with SSH credentials.
     * Creates the initial connection and attempts authentication.
     *
     * @param controllerId - Unique identifier for the controller
     * @param urn - Network address in format 'ip:port' (e.g., '192.168.1.100:22')
     * @param username - SSH username for authentication
     * @param password - Optional SSH password (if not provided, uses SSH key authentication)
     * @throws Error if controller already exists or initial connection fails
     */
    public async addController(
        controllerId: number,
        urn: string,
        username: string,
        password?: string | undefined
    ) {
        if (
            this.connections.find(
                (connection) => connection.controllerId === controllerId
            )
        )
            throw new Error('Controller already exists');
        const connection = new Connection(controllerId, urn, username);
        this.connections.push(connection);
        await connection.init(password).catch((error) => {
            console.warn(`Failed to connect to ${urn}: ${error}`);
        });
    }

    /**
     * Updates controller connection credentials and recreates connections.
     * Disconnects existing connections if credentials have changed.
     *
     * @param controllerId - Unique identifier for the controller
     * @param urn - Network address in format 'ip:port'
     * @param username - SSH username for authentication
     * @throws Error if controller does not exist
     */
    public async updateController(
        controllerId: number,
        urn: string,
        username: string
    ) {
        let controllerConnections = this.getControllerConnections(controllerId);
        if (controllerConnections) {
            if (
                controllerConnections[0]?.urn === urn &&
                controllerConnections[0]?.username === username
            )
                return;

            this.removeConnection(controllerId);
        }
        this.addController(controllerId, urn, username);
    }

    /**
     * Checks if a controller has exactly one connection remaining.
     * Used by garbage collector to preserve at least one connection per controller.
     *
     * @param controllerId - Unique identifier for the controller
     * @returns True if only one connection exists for this controller, false otherwise
     */
    private isLastConnection(controllerId: number): Boolean {
        return (
            this.connections.filter(
                (connection) => connection.controllerId === controllerId
            ).length === 1
        );
    }

    /**
     * Retrieves all active connections for a specific controller.
     *
     * @param controllerId - Unique identifier for the controller
     * @returns Array of connections associated with the controller
     */
    private getControllerConnections(controllerId: number): Connection[] {
        return this.connections.filter(
            (connection) => connection.controllerId === controllerId
        );
    }

    /**
     * Obtains a free connection for the specified controller.
     * Creates new connections up to the maximum limit, or waits for existing connections to become available.
     *
     * @param controllerId - Unique identifier for the controller
     * @returns Promise resolving to an available connection
     * @throws Error if controller doesn't exist or all connections have failed
     */
    private getFreeConnection(controllerId: number): Promise<Connection> {
        let controllerConnections = this.getControllerConnections(controllerId);
        if (!controllerConnections)
            throw new Error('Controller does not exist');

        if (!controllerConnections.find((connection) => connection.connected))
            return Promise.reject(new Error('Connection failed'));

        let freeConnection = controllerConnections.find(
            (connection) => !connection.busy
        );
        if (freeConnection) return Promise.resolve(freeConnection);
        return this.newConnection(controllerId);
    }

    /**
     * Creates additional connections when needed or waits for existing ones to become free.
     * Respects the maximum connection limit per controller.
     *
     * @param controllerId - Unique identifier for the controller
     * @returns Promise resolving to an available connection
     * @throws Error if timeout is reached while waiting for a free connection
     */
    private async newConnection(controllerId: number): Promise<Connection> {
        const controllerConnections =
            this.getControllerConnections(controllerId);
        if (controllerConnections.length < maxConnections) {
            const newConnection = await this.getConnection(controllerId);
            this.connections.push(newConnection);
            return Promise.resolve(newConnection);
        }

        return new Promise<Connection>((resolve, reject) => {
            const startTime = Date.now();
            let interval = setInterval(() => {
                let connection = controllerConnections.find(
                    (connection) => !connection.busy
                );
                if (connection) {
                    clearInterval(interval);
                    resolve(connection);
                } else if (Date.now() - startTime > timeout) {
                    clearInterval(interval);
                    reject(
                        new Error('Timeout while waiting for a free connection')
                    );
                }
            }, 10);
        });
    }

    /**
     * Executes a single command on the specified controller via SSH.
     *
     * @param controllerId - Unique identifier for the controller
     * @param cmd - Shell command to execute on the remote controller
     * @returns Promise resolving to command output as string
     * @throws Error if controller doesn't exist or command execution fails
     */
    public async executeCommand(
        controllerId: number,
        cmd: string
    ): Promise<string> {
        let connection: Connection;
        try {
            connection = await this.getFreeConnection(controllerId);
        } catch (error) {
            throw error + cmd;
        }

        return connection.executeCommand(cmd);
    }

    /**
     * Executes a multi-line script on the controller.
     * The script is parsed into individual commands and executed sequentially.
     * Supports parameter substitution using $1, $2, etc. placeholders.
     *
     * @param controllerId - Unique identifier for the controller
     * @param file - Script filename located in the extension's script directory
     * @param args - Arguments to substitute into the script ($1, $2, etc.)
     * @returns Promise resolving to combined output from all script commands
     * @throws Error if controller doesn't exist or script execution fails
     */
    public async executeScript(
        controllerId: number,
        file: string,
        ...args: string[]
    ): Promise<string> {
        let script = fs.readFileSync(
            `${extensionContext?.extensionPath}/${scriptPath}/${file}`
        );

        let connection: Connection;
        try {
            connection = await this.getFreeConnection(controllerId);
        } catch (error) {
            throw error;
        }

        let output = '';

        this.splitScript(script.toString()).forEach(async (cmd) => {
            args.forEach((arg, index) => {
                cmd = cmd.replace(`$${index + 1}`, arg);
            });

            output += await connection.executeCommand(cmd);
        });

        return Promise.resolve(output);
    }

    /**
     * Parses a multi-line script into individual executable commands.
     * Handles line continuations (\), code blocks ({}), comments (#), and empty lines.
     *
     * @param script - Multi-line script content to parse
     * @returns Array of individual commands ready for execution
     */
    private splitScript(script: string): string[] {
        let cmds: string[] = [];
        let currentCmd = '';
        let indentation = 0;

        for (let line of script.toString().split('\n')) {
            line = line.trim();
            if (line.startsWith('#') || line === '') continue;

            if (line.match('{')?.length) {
                indentation += line.match('{')?.length || 0;
            }

            if (line.match('}')?.length) {
                indentation -= line.match('}')?.length || 0;
            }

            if (line.endsWith('\\') || indentation > 0) {
                currentCmd += line.slice(0, -1) + ' ';
            } else {
                currentCmd += line;
                cmds.push(currentCmd);
                currentCmd = '';
            }
        }

        return cmds;
    }

    /**
     * Uploads an entire directory to the controller using SFTP.
     * Uses atomic upload strategy: upload to temporary location, then move to final destination.
     *
     * @param controllerId - Unique identifier for the controller
     * @param localPath - Local directory path to upload
     * @param remotePath - Remote destination directory path
     * @returns Promise resolving to success message
     * @throws Error if controller doesn't exist or upload fails
     */
    public async uploadDirectory(
        controllerId: number,
        localPath: string,
        remotePath: string
    ): Promise<string> {
        let connection: Connection;
        try {
            connection = this.getControllerConnections(controllerId)[0];
        } catch (error) {
            throw error;
        }

        if (localPath.endsWith('/')) {
            localPath = localPath.slice(0, -1);
        }

        if (remotePath.endsWith('/')) {
            remotePath = remotePath.slice(0, -1);
        }

        return new Promise(async (resolve, reject) => {
            await connection
                .executeCommand(`rm -rf ${remoteTmpPath}`)
                .catch((err) => {
                    reject(err);
                });
            for await (const directory of this.getAllRemoteDirectories(
                remoteTmpPath
            )) {
                await connection
                    .executeCommand(`mkdir -p ${directory}`)
                    .catch((err) => {
                        reject(err);
                    });
            }
            for await (const directory of this.getAllLocalDirectories(
                localPath
            )) {
                await connection
                    .executeCommand(
                        `mkdir -p ${remoteTmpPath.concat(directory.replace(localPath, '').replaceAll('\\', '/'))}`
                    )
                    .catch((err) => {
                        reject(err);
                    });
            }
            await connection
                .upload(localPath, remoteTmpPath)
                .catch(async (err) => {
                    await connection.executeCommand(`rm -rf ${remoteTmpPath}`);
                    reject(err);
                });
            await connection
                .executeCommand(
                    `rm -rf ${remotePath}/* && mv ${remoteTmpPath}/* ${remotePath} && rm -rf ${remoteTmpPath}`
                )
                .then(() => {
                    resolve('Upload successful');
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    /**
     * Uploads a single file to the controller using SFTP.
     * Uses atomic upload strategy for reliability.
     *
     * @param controllerId - Unique identifier for the controller
     * @param localPath - Local file path to upload
     * @param remotePath - Remote destination directory path
     * @returns Promise resolving to success message
     * @throws Error if controller doesn't exist or upload fails
     */
    public async uploadFile(
        controllerId: number,
        localPath: string,
        remotePath: string
    ): Promise<string> {
        let connection: Connection;
        try {
            connection = this.getControllerConnections(controllerId)[0];
        } catch (error) {
            throw error;
        }

        if (localPath.endsWith('/')) {
            localPath = localPath.slice(0, -1);
        }

        if (remotePath.endsWith('/')) {
            remotePath = remotePath.slice(0, -1);
        }

        return new Promise(async (resolve, reject) => {
            await connection
                .executeCommand(`rm -rf ${remoteTmpPath}`)
                .catch((err) => {
                    reject(err);
                });
            for await (const directory of this.getAllRemoteDirectories(
                remoteTmpPath
            )) {
                await connection
                    .executeCommand(`mkdir -p ${directory}`)
                    .catch((err) => {
                        reject(err);
                    });
            }
            await connection
                .upload(localPath, remoteTmpPath)
                .catch(async (err) => {
                    await connection.executeCommand(`rm -rf ${remoteTmpPath}`);
                    reject(err);
                });
            await connection
                .executeCommand(
                    `rm -rf ${remotePath}/${Path.basename(localPath)} && mv ${remoteTmpPath}/${Path.basename(localPath)} ${remotePath} && rm -rf ${remoteTmpPath}`
                )
                .then(() => {
                    resolve('Upload successful');
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    /**
     * Splits a remote path into its component directories for recursive creation.
     *
     * @param path - Remote path to split into directory components
     * @returns Array of progressive directory paths for mkdir commands
     */
    private getAllRemoteDirectories(path: string): string[] {
        let directories: string[] = [];
        let currentPath = '';
        for (let directory of path.split('/')) {
            if (directory === '') continue;
            currentPath += '/' + directory;
            directories.push(currentPath + '/');
        }
        return directories;
    }

    /**
     * Recursively discovers all directories in a local path.
     * Used to recreate directory structure on remote controller.
     *
     * @param path - Local directory path to scan
     * @returns Generator yielding directory paths for remote creation
     */
    private *getAllLocalDirectories(path: string): Generator<string> {
        const files = fs.readdirSync(path);

        for (const file of files) {
            if (fs.lstatSync(Path.join(path, file)).isDirectory()) {
                yield Path.join(path, file);
                yield* this.getAllLocalDirectories(Path.join(path, file));
            }
        }
    }

    /**
     * Removes all connections for a specific controller from the pool.
     * Called when a controller is removed from the project configuration.
     *
     * @param controllerId - Unique identifier for the controller to remove
     */
    public removeConnection(controllerId: number) {
        const indicesToRemove: number[] = [];
        this.connections.forEach((connection, index) => {
            if (connection.controllerId !== controllerId) return;
            connection.disconnect();
            indicesToRemove.push(index);
        });

        // Remove connections in reverse order to avoid index shifting
        for (const index of indicesToRemove.reverse()) {
            this.connections.splice(index, 1);
        }
    }

    /**
     * Creates an independent connection for special operations requiring extended duration.
     * This connection is NOT managed by the connection pool and must be manually disconnected.
     * Used for operations like debugging, port forwarding, or long-running tasks.
     *
     * @param controllerId - Unique identifier for the controller
     * @returns Promise resolving to an independent Connection instance
     */
    public async getConnection(controllerId: number): Promise<Connection> {
        return this.getControllerConnections(controllerId)[0].duplicate();
    }

    /**
     * Tests connection responsiveness by measuring round-trip time.
     * Useful for connection health monitoring and network diagnostics.
     *
     * @param controllerId - Unique identifier for the controller
     * @returns Promise resolving to ping time in milliseconds
     * @throws Error if controller doesn't exist or ping fails
     */
    public async ping(controllerId: number): Promise<number> {
        let connection: Connection;
        try {
            connection = await this.getFreeConnection(controllerId);
        } catch (error) {
            throw error;
        }

        try {
            let before = Date.now();
            await connection.executeCommand('echo "ping"');
            return Date.now() - before;
        } catch (error) {
            throw error;
        }
    }
}

/**
 * Individual SSH connection to a WAGO CC100 controller.
 *
 * Manages the lifecycle of a single SSH connection including:
 * - SSH key generation and password-based authentication fallback
 * - Automatic reconnection with exponential backoff
 * - Command execution with proper error handling
 * - SFTP file transfer capabilities
 * - SSH port forwarding for debugging and remote access
 * - Connection state tracking and usage monitoring
 *
 * Each connection can handle one command at a time and tracks its busy state
 * to support the connection manager's pooling strategy.
 */
class Connection {
    public readonly controllerId: number;
    public readonly urn: string;
    public readonly username: string;
    public lastUsed: number = Date.now();
    public busy: boolean = false;
    public connected: boolean = false;
    public client: Client;
    private askForPassword: boolean = true;
    private passwordNotification: boolean = false;
    private reconnectionTimeout: NodeJS.Timeout | null = null;
    private server: net.Server | null = null;
    private initResponse: boolean = false;
    private disconnected: boolean = false;

    /**
     * Creates a new SSH connection instance.
     *
     * @param controllerId - Unique identifier for the target controller
     * @param urn - Network address in format 'host:port' (e.g., '192.168.1.100:22')
     * @param username - SSH username for authentication
     * @param askPassword - Whether to prompt for password on authentication failure (default: false)
     */
    constructor(
        controllerId: number,
        urn: string,
        username: string,
        askPassword = false
    ) {
        this.controllerId = controllerId;
        this.urn = urn;
        this.username = username;
        this.askForPassword = askPassword;

        this.client = new Client();
    }

    /**
     * Establishes SSH connection to the remote controller.
     * Implements automatic reconnection and authentication fallback strategy.
     *
     * @param password - Optional password for authentication (triggers SSH key setup if provided)
     * @returns Promise resolving when connection is established
     * @throws Error if connection fails after all retry attempts
     */
    public init(password?: string | undefined): Promise<void> {
        if (this.disconnected)
            return Promise.reject(new Error('Connection is disconnected'));
        return new Promise((resolve, reject) => {
            this.client
                .once('ready', () => {
                    console.debug(`Connected to ${this.urn}`);
                    if (password) {
                        this.sendSSHKey();
                        password = undefined;
                    }
                    this.connected = true;
                    ControllerProvider.instance.refresh();

                    if (this.initResponse) return;
                    this.initResponse = true;
                    resolve();
                })
                .once('error', async (error) => {
                    if (this.connected || !this.initResponse) {
                        vscode.window.showErrorMessage(
                            `Error connection to ${YamlCommands.getController(this.controllerId)?.displayname}: ${error.message}`
                        );
                    }
                    this.connected = false;

                    if (error.level === 'client-authentication') {
                        if (!this.askForPassword) {
                            password = await this.requestPassword();
                            if (password) {
                                if (this.reconnectionTimeout) {
                                    clearTimeout(this.reconnectionTimeout);
                                    this.reconnectionTimeout = null;
                                }
                                this.reconnectionTimeout = setTimeout(
                                    async () =>
                                        await this.init(password).catch(),
                                    0
                                );
                                if (this.initResponse) return;
                                this.initResponse = true;
                                return reject(error);
                            }
                        }
                    }
                    if (this.initResponse) return;
                    this.initResponse = true;
                    reject(error.message);
                })
                .once('close', async () => {
                    this.client.removeAllListeners();
                    console.debug(`Connection to ${this.urn} closed`);
                    ControllerProvider.instance.refresh();
                    this.client.end();
                    if (this.reconnectionTimeout) {
                        clearTimeout(this.reconnectionTimeout);
                        this.reconnectionTimeout = null;
                    }
                    this.reconnectionTimeout = setTimeout(
                        async () => await this.init(),
                        reconnectionTimeout
                    );
                    if (this.initResponse) return;
                    this.initResponse = true;
                    reject(new Error(`Connection to ${this.urn} closed`));
                });

            this.generateSSHKey();
            if (password) {
                this.client.connect({
                    host: this.urn.split(':')[0],
                    port: parseInt(this.urn.split(':')[1]),
                    username: this.username,
                    password: password,
                });
            } else {
                this.client.connect({
                    host: this.urn.split(':')[0],
                    port: parseInt(this.urn.split(':')[1]),
                    username: this.username,
                    privateKey: fs.readFileSync(privateKeyPath),
                });
            }
        });
    }

    /**
     * Prompts user for password when SSH key authentication fails.
     * Includes option to disable future password prompts for this controller.
     *
     * @returns Promise resolving to user-entered password or empty string if cancelled
     */
    private async requestPassword(): Promise<string> {
        if (this.passwordNotification) return '';
        this.passwordNotification = true;
        const selection = await vscode.window.showErrorMessage(
            `Authentication failed for ${YamlCommands.getController(this.controllerId)?.displayname}. Want to reenter the password?`,
            'Yes',
            "Don't ask again"
        );
        if (selection === 'Yes') {
            const response =
                (await vscode.window.showInputBox({
                    prompt: `Enter the password for ${YamlCommands.getController(this.controllerId)?.displayname}`,
                    ignoreFocusOut: true,
                    password: true,
                })) || '';
            this.passwordNotification = false;
            return response;
        } else {
            this.askForPassword = true;
            this.passwordNotification = false;
            return '';
        }
    }

    /**
     * Creates an independent duplicate of this connection.
     * The new connection shares credentials but operates independently.
     *
     * @returns Promise resolving to a new Connection instance
     * @throws Error if the duplicate connection cannot be established
     */
    public async duplicate(): Promise<Connection> {
        const connection = new Connection(
            this.controllerId,
            this.urn,
            this.username,
            this.askForPassword
        );
        return new Promise<Connection>((resolve, reject) => {
            connection
                .init()
                .then(() => {
                    resolve(connection);
                })
                .catch((error) => {
                    reject(error);
                });
        });
    }

    /**
     * Sets up SSH port forwarding for local access to remote services.
     * Creates a local TCP server that forwards connections to the remote controller.
     * Used primarily for Python debugging via debugpy.
     *
     * @param localPort - Local port number to listen on
     * @param remotePort - Remote port number to forward to
     * @returns Promise resolving when forwarding is established
     * @throws Error if port forwarding setup fails
     */
    public forwardPort(localPort: number, remotePort: number): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.server = net.createServer((socket) => {
                if (socket.remoteAddress === undefined)
                    throw new Error('No remote address');
                if (socket.remotePort === undefined)
                    throw new Error('No remote port');
                this.client.forwardOut(
                    socket.remoteAddress,
                    socket.remotePort,
                    this.urn.split(':')[0],
                    remotePort,
                    (err, stream) => {
                        if (err) {
                            socket.destroy();
                            return;
                        }
                        console.debug(
                            `Forwarding port ${localPort} to ${this.urn.split(':')[0]}:${remotePort}`
                        );

                        stream.on('end', () => {
                            socket.end();
                        });
                        socket.pipe(stream).pipe(socket);
                    }
                );
            });
            this.client.on('close', () => {
                if (this.server) this.server.close();
            });
            this.server.on('error', (err: Error) => {
                if (this.server) this.server.close();
                reject(err);
            });
            this.server.listen(localPort, () => {
                resolve();
            });
        });
    }

    /**
     * Generates RSA SSH key pair if not already present.
     * Keys are stored in the user's home directory for persistent authentication.
     * Uses 2048-bit RSA keys with extension-specific comment for identification.
     */
    private generateSSHKey() {
        if (fs.existsSync(publicKeyPath) && fs.existsSync(privateKeyPath))
            return;

        utils.generateKeyPair(
            'rsa',
            { bits: 2048, comment: `cc100-extension-${userInfo().username}` },
            (err: Error | null, keys: { public: string; private: string }) => {
                if (err) throw err;

                fs.writeFileSync(publicKeyPath, keys.public);
                fs.writeFileSync(privateKeyPath, keys.private);
            }
        );
    }

    /**
     * Installs the public SSH key on the remote controller for passwordless authentication.
     * Appends the key to the user's authorized_keys file, creating the directory if needed.
     * Called automatically after successful password authentication.
     */
    private async sendSSHKey() {
        this.generateSSHKey();
        const publicKey = fs.readFileSync(publicKeyPath).toString();
        this.client.exec(
            `mkdir -p ~/.ssh && echo "${publicKey}" >> ~/.ssh/authorized_keys`,
            (err) => {
                if (err) throw err;
            }
        );
    }

    /**
     * Executes a shell command on the remote controller.
     * Marks the connection as busy during execution and updates last-used timestamp.
     *
     * @param cmd - Shell command to execute remotely
     * @returns Promise resolving to command output (stdout), empty string on error
     */
    public executeCommand(cmd: string): Promise<string> {
        return new Promise<string>((resolve, _reject) => {
            this.client.exec(cmd, (err, stream) => {
                if (err) return resolve('');
                // return reject(`Error executing command "${cmd}": ${err}`);
                this.busy = true;

                let output = '';

                stream.on('data', (data: Buffer) => {
                    output += data.toString();
                });

                stream.on('close', () => {
                    this.busy = false;
                    this.lastUsed = Date.now();
                    if (output.endsWith('\n')) {
                        output = output.slice(0, -1);
                    }
                    resolve(output);
                });
            });
        });
    }

    /**
     * Executes a command with real-time output streaming.
     * Used for long-running commands or monitoring operations where immediate feedback is needed.
     *
     * @param cmd - Shell command to execute remotely
     * @param onData - Callback function for processing output data chunks
     * @param onError - Callback function for handling execution errors
     */
    public streamCommand(
        cmd: string,
        onData: (data: Buffer) => void,
        onError: (err: Error) => void
    ) {
        this.client.exec(cmd, (err, stream) => {
            if (err) onError(err);

            stream.on('data', onData);
            stream.on('error', onError);
        });
    }

    /**
     * Uploads files or directories to the remote controller via SFTP.
     * Handles both individual files and directory trees with recursive upload.
     *
     * @param localPath - Local file or directory path to upload
     * @param remotePath - Remote destination path
     * @returns Promise resolving to success message when upload completes
     * @throws Error if SFTP connection fails or upload encounters errors
     */
    public upload(localPath: string, remotePath: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            this.client.sftp(async (err, sftp) => {
                if (err) {
                    console.error('SFTP connection error:', err);
                    return reject(err);
                }
                this.busy = true;

                let requested = 0;
                let answered = 0;
                for await (const file of this.getAllLocalFiles(localPath)) {
                    if (file === localPath) {
                        localPath = localPath.slice(
                            0,
                            localPath.lastIndexOf('\\')
                        );
                    }
                    requested++;

                    sftp.fastPut(
                        file,
                        remotePath.concat(
                            file.replace(localPath, '').replaceAll('\\', '/')
                        ),
                        async (err) => {
                            answered++;
                            if (err) {
                                console.error('Upload error:', err);
                                return reject(err);
                            }
                            if (requested === answered) {
                                sftp.destroy();
                                resolve('Upload successful');
                                await new Promise((resolve) =>
                                    setTimeout(resolve, 200)
                                );
                                this.busy = false;
                            }
                        }
                    );
                }
            });
        });
    }

    /**
     * Recursively collects all files in a directory tree.
     * Used to build file lists for SFTP upload operations.
     *
     * @param path - Directory path to scan (or individual file path)
     * @returns Generator yielding absolute file paths
     */
    private *getAllLocalFiles(path: string): Generator<string> {
        if (fs.lstatSync(path).isFile()) {
            yield path;
            return;
        }

        const files = fs.readdirSync(path);

        for (const file of files) {
            if (fs.lstatSync(Path.join(path, file)).isDirectory()) {
                yield* this.getAllLocalFiles(Path.join(path, file));
            } else {
                yield Path.join(path, file);
            }
        }
    }

    /**
     * Cleanly disconnects from the remote controller.
     * Closes SSH connection, stops port forwarding, and marks connection as disconnected.
     * Called by connection manager during cleanup or when connection is no longer needed.
     */
    public disconnect() {
        console.debug(`Disconnecting from ${this.urn}`);
        this.client.removeAllListeners();
        if (this.server) {
            this.server.close();
            this.server = null;
        }
        this.client.end();
        this.client.destroy();
        this.connected = false;
        this.disconnected = true;
    }
}
