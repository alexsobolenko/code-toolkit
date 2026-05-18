import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand('advanced-code-toolkit.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from advanced-code-toolkit!');
    }));
}

export function deactivate() {}
