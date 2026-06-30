import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {
    EditRecorder,
    FakeDocument,
    installVscodeMock,
    Selection,
} from '../helpers/vscode';

const mockEditor: {current: unknown} = {current: undefined};
const mockWindowOverrides = {};
Object.defineProperty(mockWindowOverrides, 'activeTextEditor', {
    get: () => mockEditor.current,
    enumerable: true,
    configurable: true,
});
const restoreVscodeMock = installVscodeMock({window: mockWindowOverrides});
const {default: CaseToggler} = require('../../feature/case-toggler');

function setup(text: string, selections: Selection[]): {toggler: any; editBuilder: EditRecorder; editor: any} {
    const document = new FakeDocument(text);
    const editBuilder = new EditRecorder();
    const toggler = new CaseToggler();

    const editor = {
        document,
        selection: selections[0],
        selections,
        edit: (callback: (edit: EditRecorder) => void) => {
            callback(editBuilder);
            
            return Promise.resolve(true);
        },
    };
    mockEditor.current = editor;

    return {toggler, editBuilder, editor};
}

describe('CaseToggler', () => {
    it('converts selection to upper case', async () => {
        const {toggler, editBuilder, editor} = setup(
            'hello world',
            [new Selection(0, 0, 0, 11)],
        );

        toggler.proceed('upper');
        await Promise.resolve();

        assert.equal(editBuilder.replacements.length, 1);
        assert.equal(editBuilder.replacements[0].text, 'HELLO WORLD');
        assert.equal(editor.selections[0].start.character, 0);
        assert.equal(editor.selections[0].end.character, 11);
    });

    it('converts selection to lower case', async () => {
        const {toggler, editBuilder} = setup(
            'HELLO WORLD',
            [new Selection(0, 0, 0, 11)],
        );

        toggler.proceed('lower');
        await Promise.resolve();

        assert.equal(editBuilder.replacements[0].text, 'hello world');
    });

    it('converts selection to camelCase', async () => {
        const {toggler, editBuilder} = setup(
            'hello world',
            [new Selection(0, 0, 0, 11)],
        );

        toggler.proceed('camel');
        await Promise.resolve();

        assert.equal(editBuilder.replacements[0].text, 'helloWorld');
    });

    it('converts selection to CONSTANT_CASE', async () => {
        const {toggler, editBuilder} = setup(
            'hello world',
            [new Selection(0, 0, 0, 11)],
        );

        toggler.proceed('constant');
        await Promise.resolve();

        assert.equal(editBuilder.replacements[0].text, 'HELLO_WORLD');
    });

    it('converts selection to kebab-case', async () => {
        const {toggler, editBuilder} = setup(
            'hello world',
            [new Selection(0, 0, 0, 11)],
        );

        toggler.proceed('kebab');
        await Promise.resolve();

        assert.equal(editBuilder.replacements[0].text, 'hello-world');
    });

    it('converts selection to snake_case', async () => {
        const {toggler, editBuilder} = setup(
            'hello world',
            [new Selection(0, 0, 0, 11)],
        );

        toggler.proceed('snake');
        await Promise.resolve();

        assert.equal(editBuilder.replacements[0].text, 'hello_world');
    });

    it('converts selection to PascalCase', async () => {
        const {toggler, editBuilder} = setup(
            'hello world',
            [new Selection(0, 0, 0, 11)],
        );

        toggler.proceed('pascal');
        await Promise.resolve();

        assert.equal(editBuilder.replacements[0].text, 'HelloWorld');
    });

    it('converts selection to swap case', async () => {
        const {toggler, editBuilder} = setup(
            'Hello World',
            [new Selection(0, 0, 0, 11)],
        );

        toggler.proceed('swap');
        await Promise.resolve();

        assert.equal(editBuilder.replacements[0].text, 'hELLO wORLD');
    });

    it('uses the word under an empty selection', async () => {
        const {toggler, editBuilder} = setup(
            'hello world',
            [new Selection(0, 1, 0, 1)],
        );

        toggler.proceed('upper');
        await Promise.resolve();

        assert.equal(editBuilder.replacements.length, 1);
        assert.equal(editBuilder.replacements[0].text, 'HELLO');
    });

    it('ignores unknown case commands', async () => {
        const {toggler, editBuilder} = setup(
            'hello',
            [new Selection(0, 0, 0, 5)],
        );

        toggler.proceed('unknown');
        await Promise.resolve();

        assert.deepEqual(editBuilder.replacements, []);
    });

    it('does not edit when text is unchanged', async () => {
        const {toggler, editBuilder} = setup(
            'HELLO',
            [new Selection(0, 0, 0, 5)],
        );

        toggler.proceed('upper');
        await Promise.resolve();

        assert.deepEqual(editBuilder.replacements, []);
    });
});

restoreVscodeMock();
