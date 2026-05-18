import {commands, ExtensionContext} from 'vscode';
import App from './app';
import {CMD_TOGGLE_QUOTES} from './constants';

export function activate(context: ExtensionContext) {
    context.subscriptions.push(commands.registerCommand(CMD_TOGGLE_QUOTES, () => {
        App.instance.toggleQuotes();
    }));
}

export function deactivate() {}
