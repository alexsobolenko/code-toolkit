import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {
    EditRecorder,
    FakeDocument,
    installVscodeMock,
    Selection,
    setAppInstance,
} from '../helpers/vscode';

const restoreVscodeMock = installVscodeMock();
const {default: QuotesToggler} = require('../../features/toggle-quotes/quotes-toggler');

function createAppInstance(document: FakeDocument, selection: Selection, editBuilder: EditRecorder) {
    return {
        config: () => ['\'', '"', '`'],
        editor: {
            document,
            selections: [selection],
            edit: (callback: (edit: EditRecorder) => void) => {
                callback(editBuilder);
            },
        },
        showMessage: () => undefined,
    };
}

describe('QuotesToggler', () => {
    it('wraps a selected text with the first configured quote pair', () => {
        const document = new FakeDocument('hello');
        const selection = new Selection(0, 0, 0, 5);
        const editBuilder = new EditRecorder();
        setAppInstance(createAppInstance(document, selection, editBuilder));

        new QuotesToggler().proceed();

        assert.equal(editBuilder.replacements.length, 1);
        assert.equal(editBuilder.replacements[0].text, '\'hello\'');
        assert.equal(document.getText(editBuilder.replacements[0].range), 'hello');
    });

    it('cycles selected quote pairs and escapes the next quote character', () => {
        const document = new FakeDocument('const value = \'a "quote"\';');
        const selection = new Selection(0, 14, 0, 25);
        const editBuilder = new EditRecorder();
        setAppInstance(createAppInstance(document, selection, editBuilder));

        new QuotesToggler().proceed();

        assert.equal(editBuilder.replacements.length, 1);
        assert.equal(editBuilder.replacements[0].text, '"a \\"quote\\""');
    });

    it('reports an error for invalid quote order configuration', () => {
        const document = new FakeDocument('hello');
        const editBuilder = new EditRecorder();
        let message = '';
        setAppInstance({
            config: () => ['\''],
            editor: {
                document,
                selections: [new Selection(0, 0, 0, 5)],
                edit: (callback: (edit: EditRecorder) => void) => callback(editBuilder),
            },
            showMessage: (value: string) => {
                message = value;
            },
        });

        new QuotesToggler().proceed();

        assert.equal(message, 'Wrong chars array quotes pair format.');
        assert.deepEqual(editBuilder.replacements, []);
    });
});

restoreVscodeMock();
