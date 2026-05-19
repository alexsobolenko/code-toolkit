import {commands, ExtensionContext} from 'vscode';
import App from './app';
import {
    C_LABEL_CAMEL,
    C_LABEL_CONSTANT,
    C_LABEL_DOT,
    C_LABEL_KEBAB,
    C_LABEL_LOWER,
    C_LABEL_LOWER_FIRST,
    C_LABEL_PASCAL,
    C_LABEL_PATH,
    C_LABEL_SENTENCE,
    C_LABEL_SNAKE,
    C_LABEL_SWAP,
    C_LABEL_TITLE,
    C_LABEL_UPPER,
    C_LABEL_UPPER_FIRST,
    CMD_TOGGLE_CASE,
    CMD_TOGGLE_CASE_CAMEL,
    CMD_TOGGLE_CASE_CONSTANT,
    CMD_TOGGLE_CASE_DOT,
    CMD_TOGGLE_CASE_KEBAB,
    CMD_TOGGLE_CASE_LOWER,
    CMD_TOGGLE_CASE_LOWER_FIRST,
    CMD_TOGGLE_CASE_PASCAL,
    CMD_TOGGLE_CASE_PATH,
    CMD_TOGGLE_CASE_SENTENCE,
    CMD_TOGGLE_CASE_SNAKE,
    CMD_TOGGLE_CASE_SWAP,
    CMD_TOGGLE_CASE_TITLE,
    CMD_TOGGLE_CASE_UPPER,
    CMD_TOGGLE_CASE_UPPER_FIRST,
    CMD_TOGGLE_QUOTES,
} from './constants';

export function activate(context: ExtensionContext) {
    /* toggle quotes */
    context.subscriptions.push(commands.registerCommand(CMD_TOGGLE_QUOTES, () => {
        App.instance.toggleQuotes();
    }));

    /* toggle case */
    const toggleCaseCommands: Array<{command: string, label: string | null}> = [
        {command: CMD_TOGGLE_CASE, label: null},
        {command: CMD_TOGGLE_CASE_CAMEL, label: C_LABEL_CAMEL},
        {command: CMD_TOGGLE_CASE_CONSTANT, label: C_LABEL_CONSTANT},
        {command: CMD_TOGGLE_CASE_DOT, label: C_LABEL_DOT},
        {command: CMD_TOGGLE_CASE_KEBAB, label: C_LABEL_KEBAB},
        {command: CMD_TOGGLE_CASE_LOWER, label: C_LABEL_LOWER},
        {command: CMD_TOGGLE_CASE_LOWER_FIRST, label: C_LABEL_LOWER_FIRST},
        {command: CMD_TOGGLE_CASE_PASCAL, label: C_LABEL_PASCAL},
        {command: CMD_TOGGLE_CASE_PATH, label: C_LABEL_PATH},
        {command: CMD_TOGGLE_CASE_SENTENCE, label: C_LABEL_SENTENCE},
        {command: CMD_TOGGLE_CASE_SNAKE, label: C_LABEL_SNAKE},
        {command: CMD_TOGGLE_CASE_SWAP, label: C_LABEL_SWAP},
        {command: CMD_TOGGLE_CASE_TITLE, label: C_LABEL_TITLE},
        {command: CMD_TOGGLE_CASE_UPPER, label: C_LABEL_UPPER},
        {command: CMD_TOGGLE_CASE_UPPER_FIRST, label: C_LABEL_UPPER_FIRST},
    ];
    toggleCaseCommands.forEach((item) => {
        context.subscriptions.push(commands.registerCommand(item.command, () => {
            App.instance.toggleCase(item.label);
        }));
    });
}

export function deactivate() {}
