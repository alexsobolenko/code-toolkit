import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {
    EditRecorder,
    FakeDocument,
    installVscodeMock,
    Range,
    Selection,
    setAppInstance,
} from '../helpers/vscode';

const restoreVscodeMock = installVscodeMock();
const {default: CaseToggler} = require('../../features/toggle-case/case-toggler');

function createAppInstance(document: FakeDocument, selections: Selection[], editBuilder: EditRecorder) {
    const appInstance = {
        editor: {
            document,
            selection: selections[0],
            selections,
            edit: (callback: (edit: EditRecorder) => void) => {
                callback(editBuilder);

                return Promise.resolve(true);
            },
        },
        toSelection: (range: Range) => new Selection(range.start, range.end),
        uniq: <T>(items: T[]) => [...new Set(items)],
    };

    return appInstance;
}

describe('CaseToggler', () => {
    it('transforms explicit selections with the requested command', async () => {
        const document = new FakeDocument('hello world');
        const editBuilder = new EditRecorder();
        const selections = [new Selection(0, 0, 0, 11)];
        const appInstance = createAppInstance(document, selections, editBuilder);
        setAppInstance(appInstance);

        new CaseToggler().proceed('upper');
        await Promise.resolve();

        assert.equal(editBuilder.replacements.length, 1);
        assert.equal(editBuilder.replacements[0].text, 'HELLO WORLD');
        assert.equal(appInstance.editor.selections[0].start.character, 0);
        assert.equal(appInstance.editor.selections[0].end.character, 11);
    });

    it('uses the word under an empty selection', async () => {
        const document = new FakeDocument('hello world');
        const editBuilder = new EditRecorder();
        const selections = [new Selection(0, 1, 0, 1)];
        const appInstance = createAppInstance(document, selections, editBuilder);
        setAppInstance(appInstance);

        new CaseToggler().proceed('upper');
        await Promise.resolve();

        assert.equal(editBuilder.replacements.length, 1);
        assert.equal(document.getText(editBuilder.replacements[0].range), 'hello');
        assert.equal(editBuilder.replacements[0].text, 'HELLO');
    });

    it('ignores unknown case commands', async () => {
        const document = new FakeDocument('hello');
        const editBuilder = new EditRecorder();
        const selections = [new Selection(0, 0, 0, 5)];
        const appInstance = createAppInstance(document, selections, editBuilder);
        setAppInstance(appInstance);

        new CaseToggler().proceed('unknown');
        await Promise.resolve();

        assert.deepEqual(editBuilder.replacements, []);
    });
});

restoreVscodeMock();
