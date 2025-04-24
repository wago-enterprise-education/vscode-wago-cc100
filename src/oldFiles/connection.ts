import * as vscode from 'vscode'
import { SSH } from './ssh';

export class Connection {

    /**
     * Method for checking if a ssh connection can be established and for uploading the public key.
     * 
     * @param ssh The `ssh` object for which the connection should be checked.
     * @returns true if a connection can be established, otherwise false
     */
    public async checkConnection(ssh: SSH): Promise<Boolean> {
        console.log("Connect to: " + ssh.ipAdress);
        if (!await this.checkWithoutKey(ssh)) {
            vscode.window.showErrorMessage("Error: Could not connect to CC100");
            return false;
        }
        if (!await this.checkWithKey(ssh)) {
            await ssh.changePassword();
            let resultCopySshKey = await ssh.copySshKeyToCC100();
            if (!resultCopySshKey.startsWith("Error")) {
                console.log("Public Key copied to CC100");
            }
            else {
                console.log("Error: Failed to copy public key to CC100");
                console.log(resultCopySshKey);
                vscode.window.showErrorMessage(resultCopySshKey);
                return false;
            }
        }
        return true;
    }

    /**
     * Method for checking if a ssh connection can be established with a key.
     * 
     * @returns `true` if a ssh connection can be established with a key, otherwise `false` 
     */
    private async checkWithKey(ssh: SSH): Promise<Boolean> {
        let result = await ssh.sshConnectionWithKey();
        await ssh.disconnectSsh();
        return this.printFeedback(result.toString());
    }

    /**
     * Method for checking if a ssh connection can be established without a key.
     * 
     * @param ssh The `ssh` object for which the connection should be checked.
     * @returns `true` if a connection can be established, otherwise returns `false`.
     */
    private async checkWithoutKey(ssh: SSH): Promise<Boolean> {
        let result = await ssh.sshConnectionWithoutKey();
        await ssh.disconnectSsh();
        return this.printFeedback(result.toString());
    }

    /**
     * Method for printing out on the console if the connection was successful based on the given result string.
     * 
     * @param result The result message that is checked
     * @returns `true` if the result doesn't start with 'Error', otherwise `false`
     */
    private printFeedback(result: string) {
        if (!result.toString().startsWith('Error')) {
            console.log("Connection successful");
            return true;
        }
        else {
            console.log("Error: Cannot connect to CC100");
            console.log(result);
            return false;
        }
    }
}