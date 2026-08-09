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
const {default: QuotesToggler} = require('../../feature/quotes-toggler');

function setup(
    text: string,
    selections: Selection[],
): {toggler: any; editBuilder: EditRecorder; document: FakeDocument} {
    const document = new FakeDocument(text);
    const editBuilder = new EditRecorder();
    const toggler = new QuotesToggler();

    mockEditor.current = {
        document,
        selections,
        edit: (callback: (edit: EditRecorder) => void) => {
            callback(editBuilder);
        },
    };

    return {toggler, editBuilder, document};
}

describe('QuotesToggler', () => {
    it('wraps selected text with the first configured quote pair', () => {
        const {toggler, editBuilder, document} = setup(
            'hello',
            [new Selection(0, 0, 0, 5)],
        );

        toggler.proceed();

        assert.equal(editBuilder.replacements.length, 1);
        assert.equal(editBuilder.replacements[0].text, '\'hello\'');
        assert.equal(document.getText(editBuilder.replacements[0].range), 'hello');
    });

    it('cycles single-quoted string to double quotes', () => {
        const {toggler, editBuilder} = setup(
            'const x = \'hello\';',
            [new Selection(0, 11, 0, 11)],
        );

        toggler.proceed();

        assert.equal(editBuilder.replacements.length, 1);
        assert.equal(editBuilder.replacements[0].text, '"hello"');
    });

    it('cycles double-quoted string to backtick', () => {
        const {toggler, editBuilder} = setup(
            'const x = "hello";',
            [new Selection(0, 11, 0, 11)],
        );

        toggler.proceed();

        assert.equal(editBuilder.replacements.length, 1);
        assert.equal(editBuilder.replacements[0].text, '`hello`');
    });

    it('cycles backtick string back to single quotes', () => {
        const {toggler, editBuilder} = setup(
            'const x = `hello`;',
            [new Selection(0, 11, 0, 11)],
        );

        toggler.proceed();

        assert.equal(editBuilder.replacements.length, 1);
        assert.equal(editBuilder.replacements[0].text, '\'hello\'');
    });

    it('escapes the next quote character when cycling', () => {
        const {toggler, editBuilder} = setup(
            'const x = \'a "quote"\';',
            [new Selection(0, 10, 0, 21)],
        );

        toggler.proceed();

        assert.equal(editBuilder.replacements.length, 1);
        assert.equal(editBuilder.replacements[0].text, '"a \\"quote\\""');
    });

    it('unescapes the current quote character when cycling', () => {
        const {toggler, editBuilder} = setup(
            'const x = "a \\"quote\\"";',
            [new Selection(0, 14, 0, 14)],
        );

        toggler.proceed();

        assert.equal(editBuilder.replacements.length, 1);
        assert.equal(editBuilder.replacements[0].text, '`a "quote"`');
    });

    it('escapes literal backticks when cycling into backtick quotes', () => {
        const {toggler, editBuilder} = setup(
            'const x = "a `b` c";',
            [new Selection(0, 11, 0, 11)],
        );

        toggler.proceed();

        assert.equal(editBuilder.replacements.length, 1);
        assert.equal(editBuilder.replacements[0].text, '`a \\`b\\` c`');
    });

    it('escapes ${ interpolation marker when cycling into backtick quotes', () => {
        const {toggler, editBuilder} = setup(
            'const x = "price: ${cost}";',
            [new Selection(0, 11, 0, 11)],
        );

        toggler.proceed();

        assert.equal(editBuilder.replacements.length, 1);
        assert.equal(editBuilder.replacements[0].text, '`price: \\${cost}`');
    });

    it('does not escape a lone $ not followed by { when cycling into backtick quotes', () => {
        const {toggler, editBuilder} = setup(
            'const x = "cost: $5";',
            [new Selection(0, 11, 0, 11)],
        );

        toggler.proceed();

        assert.equal(editBuilder.replacements.length, 1);
        assert.equal(editBuilder.replacements[0].text, '`cost: $5`');
    });

    it('unescapes backticks and ${ when cycling out of backtick quotes', () => {
        const {toggler, editBuilder} = setup(
            'const x = `a \\`b\\` price: \\${cost}`;',
            [new Selection(0, 11, 0, 11)],
        );

        toggler.proceed();

        assert.equal(editBuilder.replacements.length, 1);
        assert.equal(editBuilder.replacements[0].text, '\'a `b` price: ${cost}\'');
    });

    it('does nothing when cursor is not inside quotes', () => {
        const {toggler, editBuilder} = setup(
            'const x = 42;',
            [new Selection(0, 6, 0, 6)],
        );

        toggler.proceed();

        assert.deepEqual(editBuilder.replacements, []);
    });

    it('does nothing with empty selection outside quotes', () => {
        const {toggler, editBuilder} = setup(
            'no quotes here',
            [new Selection(0, 3, 0, 3)],
        );

        toggler.proceed();

        assert.deepEqual(editBuilder.replacements, []);
    });

    it('deduplicates multiple cursors inside the same quoted string', () => {
        const {toggler, editBuilder} = setup(
            'const x = \'hello\';',
            [new Selection(0, 11, 0, 11), new Selection(0, 13, 0, 13)],
        );

        toggler.proceed();

        assert.equal(editBuilder.replacements.length, 1);
    });

    it('cycles selected quote pair when selection covers the quotes', () => {
        const {toggler, editBuilder} = setup(
            'const x = \'hello\';',
            [new Selection(0, 10, 0, 17)],
        );

        toggler.proceed();

        assert.equal(editBuilder.replacements.length, 1);
        assert.equal(editBuilder.replacements[0].text, '"hello"');
    });
});

restoreVscodeMock();
