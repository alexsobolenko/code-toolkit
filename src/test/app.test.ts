import {beforeEach, describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {installVscodeMock, Range} from './helpers/vscode';

const messages: string[] = [];
const restoreVscodeMock = installVscodeMock({
    extensions: {
        all: [],
    },
    window: {
        activeTextEditor: {id: 'editor'},
        showErrorMessage: (message: string) => {
            messages.push(`error:${message}`);
        },
        showInformationMessage: (message: string) => {
            messages.push(`info:${message}`);
        },
        showWarningMessage: (message: string) => {
            messages.push(`warning:${message}`);
        },
    },
    workspace: {
        getConfiguration: () => ({
            get: (key: string, defaultValue: unknown) => (key === 'sample.key' ? 'configured' : defaultValue),
        }),
    },
});
const {default: App} = require('../app');

describe('App', () => {
    beforeEach(() => {
        App._instance = undefined;
        messages.length = 0;
    });

    it('reads workspace configuration values', () => {
        assert.equal(App.instance.config('sample.key', 'fallback'), 'configured');
        assert.equal(App.instance.config('missing.key', 'fallback'), 'fallback');
    });

    it('returns the active editor or throws when it is missing', () => {
        assert.deepEqual(App.instance.editor, {id: 'editor'});
    });

    it('provides shared utility helpers', () => {
        const range = new Range(1, 2, 1, 5);
        const selection = App.instance.toSelection(range);

        assert.deepEqual(App.instance.uniq([1, 1, 2]), [1, 2]);
        assert.equal(App.instance.isDigit('5'), true);
        assert.equal(App.instance.isDigit('x'), false);
        assert.equal(App.instance.isDigit(undefined), false);
        assert.equal(selection.start.line, 1);
        assert.equal(selection.end.character, 5);
        assert.deepEqual(App.instance.toDecorationOptions(range), {range});
    });

    it('strips codicon prefixes and routes messages by type', () => {
        App.instance.showMessage('$(alert)  Problem', 'error');
        App.instance.showMessage('Heads up', 'warning');
        App.instance.showMessage('Done');

        assert.deepEqual(messages, [
            'error:Problem',
            'warning:Heads up',
            'info:Done',
        ]);
    });
});

restoreVscodeMock();
