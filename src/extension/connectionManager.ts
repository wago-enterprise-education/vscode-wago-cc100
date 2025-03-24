import { Client, utils } from 'ssh2';
import { homedir, userInfo } from 'os';
import * as vscode from 'vscode';
import * as Path  from 'path';
import * as fs from 'fs';

const publicKeyPath = Path.join(homedir(), '.ssh', 'id_rsa_wago.pub');
const privateKeyPath = Path.join(homedir(), '.ssh', 'id_rsa_wago');
const scriptPath = `${vscode.extensions.getExtension('wago-education.vscode-wago-cc100')?.extensionPath}/scripts`;
const maxConnections = 3;
const garbageCollectorInterval = 300_000;
const timeout = 10_000;

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
            this.connections.forEach((connection, index) => {
                if(connection.lastUsed > Date.now() - garbageCollectorInterval) return;
                if(this.isLastConnection(connection.controllerId)) return;
                this.connections.splice(index, 1);
                connection.disconnect();
            })
        }, garbageCollectorInterval);
    }

    /**
     * Add a new controller to the connection pool with the given credentials
     * 
     * @param controllerId The unique identifier of the controller
     * @param urn IP address and port of the controller in the format 'ip:port'
     * @param username User to connect to the controller
     * @param password Password to connect to the controller (optional)
     * @throws Error if the controller already exists
     */
    public async addController(controllerId: number, urn: string, username: string, password?: string | undefined) {
        if(this.connections.find(connection => connection.controllerId === controllerId) !== undefined) throw new Error('Controller already exists');
        const connection = new Connection(controllerId, urn, username)
        connection.init(password)
            .then(() => {
                this.connections.push(connection)
            })
            .catch((error) => {
                throw error
            })
    }

    /**
     * Check if the controller has only one connection
     * 
     * @param controllerId Unique identifier of the controller
     * @returns Boolean True if the controller has only one connection else False
     */
    private isLastConnection(controllerId: number): Boolean {
        return this.connections.filter(connection => connection.controllerId === controllerId).length === 1;
    }

    /**
     * Get all connections of a controller
     * 
     * @param controllerId Unique identifier of the controller
     * @returns Connaction[] Array of connections of the controller
     */
    private getControllerConnections(controllerId: number): Connection[] {
        return this.connections.filter(connection => connection.controllerId === controllerId);
    }

    /**
     * Get a free connection of the controller or create a new one if all connections are bussy.
     * Does not create a new connection if the maximum number of connections is reached.
     * Waits for a free connection if all connections are bussy.
     * 
     * @param controllerId Unique identifier of the controller
     * @returns Promise<Connection> A free connection of the controller
     * @throws Error if the controller does not exist
     */
    private getFreeConnection(controllerId: number): Promise<Connection> {
        let controllerConnections = this.getControllerConnections(controllerId);
        if(!controllerConnections) throw new Error('Controller does not exist');
        let freeConnection = controllerConnections.find(connection => !connection.bussy);
        if(freeConnection) return Promise.resolve(freeConnection);
        return this.newConnection(controllerId);
    }

    /**
     * Create a new connection for the controller if the maximum number of connections is not reached.
     * Waits for a free connection if all connections are bussy.
     * 
     * @param controllerId Unique identifier of the controller
     * @returns Promise<Connection> A free connection of the controller
     * @throws Error if timeout is reached
     */
    private newConnection(controllerId: number): Promise<Connection> {
        const controllerConnections = this.getControllerConnections(controllerId);
        if(controllerConnections.length < maxConnections) {
            return Promise.resolve(controllerConnections[0].duplicate());
        }

        return new Promise<Connection>((resolve, reject) => {
            const startTime = Date.now();
            let interval = setInterval(() => {
                let connection = controllerConnections.find(connection => !connection.bussy);
                if (connection) {
                    clearInterval(interval);
                    resolve(connection);
                } else if (Date.now() - startTime > timeout) {
                    clearInterval(interval);
                    reject(new Error('Timeout while waiting for a free connection'));
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
    public async executeCommand(controllerId: number, cmd: string): Promise<string> {
        let connection: Connection;
        try {
            connection = await this.getFreeConnection(controllerId);
        } catch (error) {
            throw error;
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
    public async executeScript(controllerId: number, file: string): Promise<string> {
        let script = fs.readFileSync(`${scriptPath}/${file}`);

        let connection: Connection;
        try {
            connection = await this.getFreeConnection(controllerId);
        } catch (error) {
            throw error;
        }

        let output = '';

        this.splitScript(script.toString()).forEach(async cmd => {
            output += await connection.executeCommand(cmd);
        })
        
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
                currentCmd += line.slice(0, -1) + '\n';
            } else {
                currentCmd += line;
                cmds.push(currentCmd);
                currentCmd = '';
            }
        }

        return cmds;
    }

    /**
     * Remove a controller from the connection pool
     * 
     * @param controllerId Unique identifier of the controller
     */
    public removeConnection(controllerId: number) {
        const removedConnection: number[] = [];
        this.connections
            .filter(connection => connection.controllerId === controllerId)
            .forEach((connection, index) => {
                connection.disconnect();
                removedConnection.push(index);
            });

        removedConnection.forEach(index => {
            this.connections.splice(index, 1);
        })
    }

    /**
     * Get a connection of the controller. The connection is not handled by the connection manager
     * and therefore not removed by the garbage collector and should be disconnected manually.
     * 
     * @param controllerId Unique identifier of the controller
     * @returns Connection A connection of the controller
     */
    public getConnection(controllerId: number): Connection {
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
    public bussy: boolean = false;
    public client: Client;

    /**
     * Creates a new `Connection` instance.
     * 
     * @param controllerId - The unique identifier of the controller.
     * @param urn - The URN of the controller, including host and port.
     * @param username - The username used for authentication.
     * @param password - (Optional) The password for authentication. If not provided, SSH key authentication is used.
     */
    constructor(controllerId: number, urn: string, username: string) {
        this.controllerId = controllerId;
        this.urn = urn;
        this.username = username;

        this.client = new Client()
    }

    public init(password?: string | undefined): Promise<void> {
        return new Promise((resolve, reject) => {
            if(password) {
                this.connectWithPassword(password)
                    .then(() => {
                        resolve()
                    })
                    .catch((error) => {
                        reject(error)
                    })
            } else {
                this.connect()
                    .then(() => {
                        resolve()
                    })
                    .catch((error) => {
                        reject(error)
                    })
            }
        })
    }

    /**
     * Creates a duplicate of the current connection instance.
     * 
     * @returns A new `Connection` instance with the same properties as the current one.
     */
    public duplicate(): Connection {
        return new Connection(this.controllerId, this.urn, this.username);
    }

    /**
     * Generates an SSH key pair if it does not already exist.
     * The keys are stored in predefined file paths.
     */
    private generateSSHKey() {
        if((fs.existsSync(publicKeyPath) && fs.existsSync(privateKeyPath))) return;

        utils.generateKeyPair(
            "rsa", 
            {bits: 2048, comment: `cc100-extension-${userInfo().username}`},
            (err: Error | null, keys: { public: string; private: string}) => {
                if(err) throw err;

                fs.writeFileSync(publicKeyPath, keys.public);
                fs.writeFileSync(privateKeyPath, keys.private);
            }
        )
    }

    /**
     * Sends the public SSH key to the remote controller, adding it to the
     * authorized keys for passwordless authentication.
     * The key is stored on the user's home directory in the `.ssh` folder.
     */
    private async sendSSHKey() {
        this.generateSSHKey();
        const publicKey = fs.readFileSync(publicKeyPath).toString();
        this.client.exec(`echo "${publicKey}" >> ~/.ssh/authorized_keys`, (err) => {
            if(err) throw err
        })
    }

    /**
     * Establishes a connection to the remote controller using a password.
     * After connecting, it sends the SSH key for future passwordless authentication.
     * 
     * @param password - The password for authentication.
     */
    private connectWithPassword(password: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.client
                .on('ready', () => {
                    console.debug(`Connected to ${this.urn}`)
                    this.sendSSHKey();
                    resolve();
                })
                .on('error', (error) => {
                    console.log("error")
                    reject(error)
                })
                .connect({
                    host: "192.168.42.42",
                    port: 22,
                    username: "root",
                    password: password
                })
            }
        )
    }


    /**
     * Establishes a connection to the remote controller using an SSH key.
     */
    private connect(): Promise<void> {
        this.generateSSHKey();

        return new Promise((resolve, reject) => {
            this.client
                .on('ready', () => {
                    console.debug(`Connected to ${this.urn}`)
                    resolve()
                })
                .on('error', (error) => {
                    reject()
                })
                .connect({
                    host: this.urn.split(':')[0],
                    port: parseInt(this.urn.split(':')[1]),
                    username: this.username,
                    privateKey: fs.readFileSync(privateKeyPath)
                })
        }) 
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
                this.bussy = true;
                if (err) return reject(err);

                let output = '';

                stream.on('data', (data: Buffer) => {
                    output += data.toString();
                });

                stream.on('close', () => {
                    this.bussy = false;
                    this.lastUsed = Date.now();
                    resolve(output);
                });
            });
        });
    }

    /**
     * Disconnects the client from the remote controller
     */
    public disconnect() {
        this.client.end();
    }
}