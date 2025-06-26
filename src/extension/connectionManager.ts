import { Client, utils } from 'ssh2';
import { homedir, userInfo } from 'os';
import * as vscode from 'vscode';
import * as Path from 'path';
import * as fs from 'fs';
import { ControllerProvider } from './view';
import YAML from 'yaml';
import * as net from 'net';
import { extensionContext } from '../extension';

const publicKeyPath = Path.join(homedir(), '.ssh', 'id_rsa_wago.pub');
const privateKeyPath = Path.join(homedir(), '.ssh', 'id_rsa_wago');
const scriptPath = `res/scripts`; // Path to scripts folder in extensionPath
const remoteTmpPath = '/tmp/cc100-extension'; // Remote path for temporary files
const maxConnections = 3;
const garbageCollectorInterval = 300_000;
const timeout = 10_000;
const reconnectionTimeout = 10_000;

/**
 * The `ConnectionManager` class is a singleton that manages a pool of connections to controllers.
 * It provides methods to add controllers, execute commands or scripts, and manage connections.
 *
 * This class ensures efficient use of resources by reusing existing connections and removing unused ones
 * through a garbage collection mechanism.
 */
export class ConnectionManager {
    public static readonly instance = new ConnectionManager();

    private connections: Connection[] = [];

    /**
     * Garbage collector that removes unused connections after garbageCollectorInterval, but keeps at least one connection per controller
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
     * Add a new controller to the connection pool with the given credentials
     *
     * @param controllerId The unique identifier of the controller
     * @param urn IP address and port of the controller in the format 'ip:port'
     * @param username User to connect to the controller
     * @param password Password to connect to the controller (optional)
     * @throws Error if the controller already exists or if first connection attempt fails
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
            console.log(`Failed to connect to ${urn}: ${error}`);
        });
    }

    /**
     * Update the credentials of a controller in the connection pool
     *
     * @param controllerId Unique identifier of the controller
     * @param urn IP address and port of the controller in the format 'ip:port'
     * @param username User to connect to the controller
     * @throws Error if the controller does not exist
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
     * Check if the controller has only one connection
     *
     * @param controllerId Unique identifier of the controller
     * @returns Boolean True if the controller has only one connection else False
     */
    private isLastConnection(controllerId: number): Boolean {
        return (
            this.connections.filter(
                (connection) => connection.controllerId === controllerId
            ).length === 1
        );
    }

    /**
     * Get all connections of a controller
     *
     * @param controllerId Unique identifier of the controller
     * @returns Connaction[] Array of connections of the controller
     */
    private getControllerConnections(controllerId: number): Connection[] {
        return this.connections.filter(
            (connection) => connection.controllerId === controllerId
        );
    }

    /**
     * Get a free connection of the controller or create a new one if all connections are busy.
     * Does not create a new connection if the maximum number of connections is reached.
     * Waits for a free connection if all connections are busy.
     *
     * @param controllerId Unique identifier of the controller
     * @returns Promise<Connection> A free connection of the controller
     * @throws Error if the controller does not exist
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
     * Create a new connection for the controller if the maximum number of connections is not reached.
     * Waits for a free connection if all connections are busy.
     *
     * @param controllerId Unique identifier of the controller
     * @returns Promise<Connection> A free connection of the controller
     * @throws Error if timeout is reached
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
     * Execute a command on the controller
     *
     * @param controllerId Unique identifier of the controller
     * @param cmd Command to execute
     * @returns Promise<string> Output of the command
     * @throws Error if the controller does not exist
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
     * Execute a script on the controller. The script is split into individual commands and executed sequentially.
     *
     * @param controllerId Unique identifier of the controller
     * @param file Name of the script file
     * @returns Promise<string> Output of the script
     * @throws Error if the controller does not exist
     */
    public async executeScript(
        controllerId: number,
        file: string,
        ...args: string[]
    ): Promise<string> {
        let script = fs.readFileSync(`${extensionContext?.extensionPath}/${scriptPath}/${file}`);

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
            })

            output += await connection.executeCommand(cmd);
        });

        return Promise.resolve(output);
    }

    /**
     * Split a script into individual commands
     *
     * @param script Script to split
     * @returns string[] Array of commands
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
     * Upload a directory to the controller
     *
     * @param controllerId Unique identifier of the controller
     * @param localPath Path to the local directory
     * @param remotePath Path to the remote directory
     * @returns Promise<string> Output of the upload
     * @throws Error if the controller does not exist
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

        if(localPath.endsWith('/')) {
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
     * Upload a file to the controller
     *
     * @param controllerId Unique identifier of the controller
     * @param localPath Path to the local file
     * @param remotePath Path to the remote file
     * @returns Promise<string> Output of the upload
     * @throws Error if the controller does not exist
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

        if(localPath.endsWith('/')) {
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
     * Remove a controller from the connection pool
     *
     * @param controllerId Unique identifier of the controller
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
     * Get a connection of the controller. The connection is not handled by the connection manager
     * and therefore not removed by the garbage collector and should be disconnected manually.
     *
     * @param controllerId Unique identifier of the controller
     * @returns Connection A connection of the controller
     */
    public async getConnection(controllerId: number): Promise<Connection> {
        return this.getControllerConnections(controllerId)[0].duplicate();
    }

    /**
     * Ping controller and return the time in milliseconds
     *
     * @param controllerId Unique identifier of the controller
     * @returns Promise<number> Time in milliseconds to ping the controller
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
 * Represents a connection to a remote controller using SSH.
 * This class manages the connection lifecycle, including authentication
 * with either a password or an SSH key, and provides methods to execute
 * commands on the remote controller.
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
    private server: net.Server | null = null;
    private initResponse: boolean = false;
    private disconnected: boolean = false;

    /**
     * Creates a new `Connection` instance.
     *
     * @param controllerId - The unique identifier of the controller.
     * @param urn - The URN of the controller, including host and port.
     * @param username - The username used for authentication.
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
     * Initializes the connection to the remote controller.
     *
     * @param password - (Optional) The password for authentication. If not provided, SSH key authentication is used.
     * @returns - Promise that resolves when the connection is established.
     */
    public init(password?: string | undefined): Promise<void> {
        if (this.disconnected) return Promise.reject(new Error("Connection is disconnected"));
        return new Promise((resolve, reject) => {
            this.client
                .once('ready', () => {
                    console.info(`Connected to ${this.urn}`);
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
                                this.client.removeAllListeners();
                                setTimeout(
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
                    setTimeout(
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
                    privateKey: fs.readFileSync(privateKeyPath)
                });
            }
        });
    }

    private async requestPassword(): Promise<string> {
        if(this.passwordNotification) return '';
        this.passwordNotification = true;
        const selection = await vscode.window.showErrorMessage(
            `Authentication failed for ${YamlCommands.getController(this.controllerId)?.displayname}. Want to reenter the password?`,
            'Yes',
            "Don't ask again"
        );
        if (selection === 'Yes') {
            const response = await vscode.window.showInputBox({
                    prompt: `Enter the password for ${YamlCommands.getController(this.controllerId)?.displayname}`,
                    ignoreFocusOut: true,
                    password: true,
                }) || ''
            this.passwordNotification = false;
            return response;
        } else {
            this.askForPassword = true;
            this.passwordNotification = false;
            return '';
        }
    }

    /**
     * Creates a duplicate of the current connection instance.
     *
     * @returns A new `Connection` instance with the same properties as the current one.
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
     * Generates an SSH key pair if it does not already exist.
     * The keys are stored in predefined file paths.
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
     * Sends the public SSH key to the remote controller, adding it to the
     * authorized keys for passwordless authentication.
     * The key is stored on the user's home directory in the `.ssh` folder.
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
     * Executes a command on the remote controller.
     *
     * @param cmd - The command to execute.
     * @returns A promise that resolves with the output of the command.
     */
    public executeCommand(cmd: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            this.client.exec(cmd, (err, stream) => {
                if (err) return resolve("")
                //return reject(`Error executing command "${cmd}": ${err}`);
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
     * Uploads a file or directory to the remote controller.
     *
     * @param localPath Path to the local file or directory.
     * @param remotePath Path to the remote file or directory.
     * @returns Promise that resolves when the upload is complete.
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
                        localPath = localPath.slice(0, localPath.lastIndexOf('\\'));
                    }
                    requested++;
                    console.log(file+" "+remotePath.concat(
                            file
                                .replace(localPath, '')
                                .replaceAll('\\', '/')
                        ));
                    sftp.fastPut(
                        file,
                        remotePath.concat(
                            file
                                .replace(localPath, '')
                                .replaceAll('\\', '/')
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

    private *getAllLocalFiles(path: string): Generator<string> {
        if(fs.lstatSync(path).isFile()) {
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
     * Disconnects the client from the remote controller
     */
    public disconnect() {
        console.info(`Disconnecting from ${this.urn}`);
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

type ControllerType = {
    id: number;
    displayname: string;
    description: string;
    engine: string;
    src: string;
    imageVersion: string;
};
/**
 * Represents the settings for a controller.
 *
 * @property connection - The type of connection used by the controller (e.g., "ethernet", "usb-c").
 * @property ip - The IP address of the controller.
 * @property port - The port number used for communication with the controller.
 * @property user - The username for authentication with the controller.
 * @property autoupdate - The auto-update setting for the controller (e.g., "on", "off").
 */
type ControllerSettingsType = {
    connection: string;
    ip: string;
    port: number;
    user: string;
    autoupdate: string;
};
export class YamlCommands {
    /**
     * Function to read the content of the wago.yaml file.
     *
     * @returns The content of the wago.yaml file as a JS object
     */
    private static getWagoYaml() {
        return YAML.parse(
            fs.readFileSync(
                `${vscode.workspace.workspaceFolders![0].uri.fsPath}/wago.yaml`,
                'utf8'
            )
        );
    }

    /**
     * Function to read the content of the wago.yaml file.
     *
     * @returns The content of the wago.yaml file as a JS object
     */
    private static getControllerYaml(id: number) {
        return YAML.parse(
            fs.readFileSync(
                `${vscode.workspace.workspaceFolders![0].uri.fsPath}/controller/controller${id}.yaml`,
                'utf8'
            )
        );
    }

    /**
     * Retrieves an array of controller objects from the Wago YAML configuration.
     *
     * @returns {Array<ControllerType>} An array of controller objects, each containing:
     * - `id`: The numeric identifier of the controller.
     * - `displayname`: The display name of the controller.
     * - `description`: A brief description of the controller.
     * - `engine`: The engine type associated with the controller.
     * - `src`: The source path or URL of the controller.
     * - `imageVersion`: The version of the controller's image.
     */
    public static getControllers(): Array<ControllerType> {
        const nodes = this.getWagoYaml().nodes;
        return Object.keys(nodes).map((key: string) => ({
            id: Number.parseInt(key),
            displayname: nodes[key].displayname,
            description: nodes[key].description,
            engine: nodes[key].engine,
            src: nodes[key].src,
            imageVersion: nodes[key].imageVersion,
        }));
    }

    /**
     * Retrieves a controller by its unique identifier.
     *
     * @param id - The unique identifier of the controller to retrieve.
     * @returns The controller matching the given ID, or `undefined` if no match is found.
     */
    public static getController(id: number): ControllerType | undefined {
        return this.getControllers().find((controller) => controller.id === id);
    }

    /**
     * Retrieves the controller settings for a given controller ID.
     *
     * @param id - The unique identifier of the controller.
     * @returns An object containing the controller settings, including:
     * - `connection`: The connection type or protocol.
     * - `ip`: The IP address of the controller.
     * - `port`: The port number used for communication.
     * - `user`: The username for authentication.
     * - `autoupdate`: A flag indicating whether auto-update is enabled.
     */
    public static getControllerSettings(id: number): ControllerSettingsType {
        const settings = this.getControllerYaml(id);
        return {
            connection: settings.connection,
            ip: settings.ip,
            port: settings.port,
            user: settings.user,
            autoupdate: settings.autoupdate,
        };
    }

    /**
     * Method for changing the contents of the wago.yaml
     *
     * @param id Id of the controller
     * @param attribute Name of the attribute that is to be changed (enum)
     * @param value Value that is to be written into the attribute (string)
     */
    public static writeWagoYaml(
        id: number,
        attribute: wagoSettings,
        value: string
    ) {
        let yaml = this.getWagoYaml();
        yaml.nodes[id][attribute] = value;
        fs.writeFileSync(
            `${vscode.workspace.workspaceFolders![0].uri.fsPath}/wago.yaml`,
            YAML.stringify(yaml, null, '\t')
        );
    }

    /**
     * Method for changing the contents of the controller.yaml
     *
     * @param id Id of the controller
     * @param attribute Name of the attribute that is to be changed (enum)
     * @param value Value that is to be written into the attribute (string)
     *
     * In Case of the Port attribute, the String is autmatically converted to a number
     */
    public static writeControllerYaml(
        id: number,
        attribute: controllerSettings,
        value: string
    ) {
        let yaml = this.getControllerYaml(id);
        if (attribute === controllerSettings.port) {
            yaml[attribute] = Number(value);
        } else {
            yaml[attribute] = value;
        }
        fs.writeFileSync(
            `${vscode.workspace.workspaceFolders![0].uri.fsPath}/controller/controller${id}.yaml`,
            YAML.stringify(yaml, null, '\t')
        );
    }

    /**
     * Creates a new controller by prompting the user for necessary details and updating the `wago.yaml` file.
     *
     * This function performs the following steps:
     * 1. Finds the next available ID for the new controller.
     * 2. Adds the new controller details to the `wago.yaml` file.
     * 3. Copies a template controller file to the appropriate location with the new controller's ID.
     *
     * @param context - The extension context provided by VS Code.
     * @returns A promise that resolves when the controller has been created.
     */
    public static async createController(
        context: vscode.ExtensionContext,
        displayname: string,
        description: string,
        engine: string,
        src: string,
        imageVersion: string
    ) {
        //Addition of the Controller to wago.yaml
        let id = this.findNextID();

        let obj = {
            nodes: {
                [id]: {
                    displayname: displayname,
                    description: description,
                    engine: engine,
                    src: src,
                    imageVersion: imageVersion,
                },
            },
        };

        let yaml = this.getWagoYaml();
        yaml.nodes[id] = obj.nodes[id];

        fs.writeFileSync(
            `${vscode.workspace.workspaceFolders![0].uri.fsPath}/wago.yaml`,
            YAML.stringify(yaml, null, '\t')
        );

        //Adding Controller to corresponding controllers/controller[id].yaml file
        fs.cpSync(
            `${context.extensionPath}/res/template/controller/controller1.yaml`,
            `${vscode.workspace.workspaceFolders![0].uri.fsPath}/controller/controller${id}.yaml`
        );
    }

    /**
     * Removes a controller configuration by its ID.
     *
     * This method performs the following actions:
     * 1. Reads the `wago.yaml` file and removes the controller entry with the specified ID.
     * 2. Writes the updated `wago.yaml` file back to the filesystem.
     * 3. Deletes the corresponding controller configuration file from the `controllers` directory.
     *
     * @param id - The ID of the controller to be removed.
     */
    public static removeController(id: number) {
        //remove from wago.yaml
        let yaml = this.getWagoYaml();
        delete yaml.nodes[id];
        fs.writeFileSync(
            `${vscode.workspace.workspaceFolders![0].uri.fsPath}/wago.yaml`,
            YAML.stringify(yaml, null, '\t')
        );

        //remove Controller configuration file
        let controllerPath = `${vscode.workspace.workspaceFolders![0].uri.fsPath}/controller/controller${id}.yaml`;
        if (fs.existsSync(controllerPath)) fs.unlinkSync(controllerPath);
    }

    /**
     * Finds the next available ID for a controller in the Wago YAML configuration.
     *
     * This method reads the Wago YAML configuration and iterates through the existing
     * controller IDs to find the next available ID that is not already in use.
     *
     * @returns {number} The next available controller ID.
     */
    private static findNextID(): number {
        let yaml = this.getWagoYaml();
        let id = 1;
        while (yaml.nodes[id] != undefined) {
            id++;
        }
        return id;
    }
}
/**
 * Enum representing available settings for the wago.yaml.
 * Wago.yaml-half of the split "setting" from editSettings.ts
 *
 * @enum {string}
 */
export enum wagoSettings {
    displayname = 'displayname',
    description = 'description',
    engine = 'engine',
    src = 'src',
    imageVersion = 'imageVersion',
}
/**
 * Enum representing available settings for the controller.yaml.
 * Controller-half of the split "setting" from editSettings.ts
 *
 * @enum {string}
 */
export enum controllerSettings {
    connection = 'connection',
    ip = 'ip',
    port = 'port',
    user = 'user',
    autoupdate = 'autoupdate',
}
