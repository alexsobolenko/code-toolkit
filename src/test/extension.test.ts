import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {installVscodeMock, setAppInstance} from './helpers/vscode';
import {
    C_LABEL_UPPER,
    CMD_INCREMENT_NUMBER,
    CMD_TOGGLE_CASE_UPPER,
    CMD_TOGGLE_QUOTES,
} from '../constants';

interface IRegisteredCommand {
    command: string;
    callback: () => void;
}

interface IEventRegistration<T> {
    callback: (value: T) => void | Promise<void>;
}

const registeredCommands: IRegisteredCommand[] = [];
const extensionChangeHandlers: IEventRegistration<void>[] = [];
const activeEditorHandlers: IEventRegistration<unknown>[] = [];
const configurationHandlers: IEventRegistration<{affectsConfiguration(name: string): boolean}>[] = [];
const textDocumentHandlers: IEventRegistration<{document: unknown}>[] = [];
const restoreVscodeMock = installVscodeMock({
    commands: {
        registerCommand: (command: string, callback: () => void) => {
            registeredCommands.push({command, callback});

            return {dispose: () => undefined};
        },
    },
    extensions: {
        onDidChange: (callback: () => void) => {
            extensionChangeHandlers.push({callback});

            return {dispose: () => undefined};
        },
    },
    window: {
        onDidChangeActiveTextEditor: (callback: (editor: unknown) => Promise<void>) => {
            activeEditorHandlers.push({callback});

            return {dispose: () => undefined};
        },
    },
    workspace: {
        onDidChangeConfiguration: (callback: (event: {affectsConfiguration(name: string): boolean}) => void) => {
            configurationHandlers.push({callback});

            return {dispose: () => undefined};
        },
        onDidChangeTextDocument: (callback: (event: {document: unknown}) => void) => {
            textDocumentHandlers.push({callback});

            return {dispose: () => undefined};
        },
    },
});
const {activate} = require('../extension');

describe('extension activate', () => {
    it('registers commands and wires editor/configuration events', async () => {
        const calls: string[] = [];
        const document = {languageId: 'typescript'};
        setAppInstance({
            changeNumber: (isIncDirection: boolean) => calls.push(`changeNumber:${isIncDirection}`),
            colorHighlightsParser: {
                refreshDecorations: () => calls.push('color.refreshDecorations'),
            },
            commentHighlightsParser: {
                config: {
                    updateLanguagesDefinitions: () => calls.push('comment.updateLanguagesDefinitions'),
                },
                setRegex: async (languageId: string) => {
                    calls.push(`comment.setRegex:${languageId}`);
                },
            },
            editor: {
                document,
            },
            provider: {
                triggerUpdateDecorations: () => calls.push('provider.triggerUpdateDecorations'),
            },
            refreshConfig: () => calls.push('app.refreshConfig'),
            toggleCase: (label: string | null) => calls.push(`toggleCase:${label}`),
            toggleMultilineExpression: () => calls.push('toggleMultilineExpression'),
            toggleQuotes: () => calls.push('toggleQuotes'),
        });
        const context = {subscriptions: []};

        await activate(context);
        registeredCommands.find((item) => item.command === CMD_TOGGLE_QUOTES)?.callback();
        registeredCommands.find((item) => item.command === CMD_TOGGLE_CASE_UPPER)?.callback();
        registeredCommands.find((item) => item.command === CMD_INCREMENT_NUMBER)?.callback();
        extensionChangeHandlers[0].callback();
        await activeEditorHandlers[0].callback({});
        textDocumentHandlers[0].callback({document});
        configurationHandlers[0].callback({
            affectsConfiguration: (name: string) => name === 'advanced-code-toolkit.color-highlight',
        });

        assert.equal(registeredCommands.length, 19);
        assert.equal(context.subscriptions.length, 19);
        assert.equal(extensionChangeHandlers.length, 1);
        assert.equal(activeEditorHandlers.length, 1);
        assert.equal(textDocumentHandlers.length, 1);
        assert.equal(configurationHandlers.length, 1);
        assert.equal(calls.includes('toggleQuotes'), true);
        assert.equal(calls.includes(`toggleCase:${C_LABEL_UPPER}`), true);
        assert.equal(calls.includes('changeNumber:true'), true);
        assert.equal(calls.filter((call) => call === 'comment.setRegex:typescript').length, 2);
        assert.equal(calls.includes('comment.updateLanguagesDefinitions'), true);
        assert.equal(calls.includes('color.refreshDecorations'), true);
        assert.equal(calls.includes('app.refreshConfig'), true);
        assert.equal(calls.filter((call) => call === 'provider.triggerUpdateDecorations').length, 4);
    });
});

restoreVscodeMock();
