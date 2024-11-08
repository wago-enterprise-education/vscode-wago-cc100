import * as vscode from 'vscode'
import { SSH } from '../ssh';

export class Connection {

    /**
     * Method for checking if a ssh connection can be established and for uploading the public key.
     * 
     * @param ssh The `ssh` object for which the connection should be checked.
     * @returns true if a connection can be established, otherwise false
     */
    public async check_connection(ssh: SSH): Promise<Boolean> {
        console.log("Connect to: " + ssh.ipAdress);
        if (!await this.check_without_key(ssh)) {
            vscode.window.showErrorMessage("Error: Could not connect to CC100");
            return false;
        }
        if (!await this.check_with_key(ssh)) {
            await ssh.change_password();
            let result_copy_ssh_key = await ssh.copy_ssh_key_to_CC100();
            if (!result_copy_ssh_key.startsWith("Error")) {
                console.log("Public Key copied to CC100");
            }
            else {
                console.log("Error: Failed to copy public key to CC100");
                console.log(result_copy_ssh_key);
                vscode.window.showErrorMessage(result_copy_ssh_key);
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
    private async check_with_key(ssh: SSH): Promise<Boolean> {
        let result = await ssh.ssh_connection_with_key();
        await ssh.disconnect_ssh();
        return this.print_feedback(result.toString());
    }

    /**
     * Method for checking if a ssh connection can be established without a key.
     * 
     * @param ssh The `ssh` object for which the connection should be checked.
     * @returns `true` if a connection can be established, otherwise returns `false`.
     */
    private async check_without_key(ssh: SSH): Promise<Boolean> {
        let result = await ssh.ssh_connection_without_key();
        await ssh.disconnect_ssh();
        return this.print_feedback(result.toString());
    }

    /**
     * Method for printing out on the console if the connection was successful based on the given result string.
     * 
     * @param result The result message that is checked
     * @returns `true` if the result doesn't start with 'Error', otherwise `false`
     */
    private print_feedback(result: string) {
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