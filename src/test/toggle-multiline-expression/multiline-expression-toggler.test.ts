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
const {default: MultilineExpressionToggler} = require(
    '../../features/toggle-multiline-expression/multiline-expression-toggler',
);

function positionSelection(document: FakeDocument, offset: number): Selection {
    const position = document.positionAt(offset);

    return new Selection(position, position);
}

function createAppInstance(document: FakeDocument, selection: Selection, editBuilder: EditRecorder) {
    return {
        config: (_key: string, defaultValue: unknown) => defaultValue,
        editor: {
            document,
            selection,
            options: {
                insertSpaces: true,
                tabSize: 4,
            },
            edit: (callback: (edit: EditRecorder) => void) => {
                callback(editBuilder);
            },
        },
        showMessage: () => undefined,
    };
}

describe('MultilineExpressionToggler', () => {
    it('expands single-line arrays with indentation and trailing comma', () => {
        const text = 'const values = [one, two];';
        const document = new FakeDocument(text, 'typescript');
        const editBuilder = new EditRecorder();
        setAppInstance(createAppInstance(document, positionSelection(document, text.indexOf('one')), editBuilder));

        new MultilineExpressionToggler().proceed();

        assert.equal(editBuilder.replacements.length, 1);
        assert.equal(editBuilder.replacements[0].text, '[\n    one,\n    two,\n]');
        assert.equal(document.getText(editBuilder.replacements[0].range), '[one, two]');
    });

    it('collapses multiline arrays when all top-level items are single-line', () => {
        const text = 'const values = [\n    one,\n    two,\n];';
        const document = new FakeDocument(text, 'typescript');
        const editBuilder = new EditRecorder();
        setAppInstance(createAppInstance(document, positionSelection(document, text.indexOf('one')), editBuilder));

        new MultilineExpressionToggler().proceed();

        assert.equal(editBuilder.replacements.length, 1);
        assert.equal(editBuilder.replacements[0].text, '[one, two]');
    });

    it('does not collapse multiline expressions containing line comments', () => {
        const text = 'const values = [\n    one, // keep\n    two,\n];';
        const document = new FakeDocument(text, 'typescript');
        const editBuilder = new EditRecorder();
        let message = '';
        const appInstance = createAppInstance(document, positionSelection(document, text.indexOf('one')), editBuilder);
        setAppInstance({
            ...appInstance,
            showMessage: (value: string) => {
                message = value;
            },
        });

        new MultilineExpressionToggler().proceed();

        assert.equal(message, 'Cannot collapse expression with line comments.');
        assert.deepEqual(editBuilder.replacements, []);
    });
});

restoreVscodeMock();
