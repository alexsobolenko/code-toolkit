import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {
    EditRecorder,
    FakeDocument,
    Selection,
    installVscodeMock,
} from '../helpers/vscode';

const mockEditor: {current: unknown} = {current: undefined};
const messages: string[] = [];
const mockWindowOverrides: Record<string, unknown> = {
    showInformationMessage: (message: string) => {
        messages.push(message);
    },
    showWarningMessage: (message: string) => {
        messages.push(message);
    },
    showErrorMessage: (message: string) => {
        messages.push(message);
    },
};
Object.defineProperty(mockWindowOverrides, 'activeTextEditor', {
    get: () => mockEditor.current,
    enumerable: true,
    configurable: true,
});
const restoreVscodeMock = installVscodeMock({window: mockWindowOverrides});
const {default: MultilineExpressionToggler} = require('../../feature/multiline-expression-toggler');

function setup(
    text: string,
    languageId: string,
    cursorOffset: number,
): {toggler: any; editBuilder: EditRecorder; document: FakeDocument} {
    const document = new FakeDocument(text, languageId);
    const editBuilder = new EditRecorder();
    const toggler = new MultilineExpressionToggler();
    const position = document.positionAt(cursorOffset);

    mockEditor.current = {
        document,
        selection: new Selection(position, position),
        options: {insertSpaces: true, tabSize: 4},
        edit: (callback: (edit: EditRecorder) => void) => {
            callback(editBuilder);
        },
    };

    return {toggler, editBuilder, document};
}

describe('MultilineExpressionToggler', () => {
    it('expands single-line arrays with indentation and trailing comma', () => {
        const text = 'const values = [one, two];';
        const {toggler, editBuilder, document} = setup(text, 'typescript', text.indexOf('one'));

        toggler.proceed();

        assert.equal(editBuilder.replacements.length, 1);
        assert.equal(editBuilder.replacements[0].text, '[\n    one,\n    two,\n]');
        assert.equal(document.getText(editBuilder.replacements[0].range), '[one, two]');
    });

    it('toggles an array even when the cursor sits inside a string element', () => {
        const text = '$a = [\'upgradePassword\', \'__construct\', \'newHashedPassword\'];';
        const {toggler, editBuilder} = setup(text, 'php', text.indexOf('upgradePassword'));

        toggler.proceed();

        assert.equal(editBuilder.replacements.length, 1);
        assert.equal(
            editBuilder.replacements[0].text,
            '[\n    \'upgradePassword\',\n    \'__construct\',\n    \'newHashedPassword\',\n]',
        );
    });

    it('collapses multiline arrays when all top-level items are single-line', () => {
        const text = 'const values = [\n    one,\n    two,\n];';
        const {toggler, editBuilder} = setup(text, 'typescript', text.indexOf('one'));

        toggler.proceed();

        assert.equal(editBuilder.replacements.length, 1);
        assert.equal(editBuilder.replacements[0].text, '[one, two]');
    });

    it('does not collapse multiline expressions containing line comments', () => {
        messages.length = 0;
        const text = 'const values = [\n    one, // keep\n    two,\n];';
        const {toggler, editBuilder} = setup(text, 'typescript', text.indexOf('one'));

        toggler.proceed();

        assert.equal(messages[messages.length - 1], 'Cannot collapse expression with line comments.');
        assert.deepEqual(editBuilder.replacements, []);
    });

    it('does not collapse expressions with multiline nested items', () => {
        messages.length = 0;
        const text = 'const values = [\n    one,\n    [\n        nested,\n    ],\n];';
        const {toggler, editBuilder} = setup(text, 'typescript', text.indexOf('one'));

        toggler.proceed();

        assert.equal(messages[messages.length - 1], 'Cannot collapse expression with multiline nested items.');
        assert.deepEqual(editBuilder.replacements, []);
    });

    it('expands object literal braces with trailing comma', () => {
        const text = 'const obj = {a: 1, b: 2};';
        const {toggler, editBuilder} = setup(text, 'typescript', text.indexOf('a: 1'));

        toggler.proceed();

        assert.equal(editBuilder.replacements.length, 1);
        assert.equal(editBuilder.replacements[0].text, '{\n    a: 1,\n    b: 2,\n}');
    });

    it('expands function declaration parameters and merges next-line opening brace', () => {
        const text = 'function foo(a, b)\n{\n}';
        const {toggler, editBuilder, document} = setup(text, 'typescript', text.indexOf('a'));

        toggler.proceed();

        assert.equal(editBuilder.replacements.length, 1);
        assert.equal(editBuilder.replacements[0].text, '(\n    a,\n    b\n) {');
        assert.equal(document.getText(editBuilder.replacements[0].range), '(a, b)\n{');
    });

    it('expands a PHP method signature and merges the next-line opening brace', () => {
        const text = '    public function upgradePassword(PasswordAuthenticatedUserInterface $user, string $newHashedPassword): void\n    {\n    }';
        const {toggler, editBuilder, document} = setup(text, 'php', text.indexOf('PasswordAuthenticatedUserInterface'));

        toggler.proceed();

        assert.equal(editBuilder.replacements.length, 1);
        assert.equal(
            editBuilder.replacements[0].text,
            '(\n        PasswordAuthenticatedUserInterface $user,\n        string $newHashedPassword\n    ): void {',
        );
        assert.equal(
            document.getText(editBuilder.replacements[0].range),
            '(PasswordAuthenticatedUserInterface $user, string $newHashedPassword): void\n    {',
        );
    });

    it('collapses an already-expanded PHP method signature and pushes the opening brace back to a new line', () => {
        const text = '    public function upgradePassword(\n        PasswordAuthenticatedUserInterface $user,\n        string $newHashedPassword\n    ): void {\n    }';
        const {toggler, editBuilder, document} = setup(text, 'php', text.indexOf('PasswordAuthenticatedUserInterface'));

        toggler.proceed();

        assert.equal(editBuilder.replacements.length, 1);
        assert.equal(
            editBuilder.replacements[0].text,
            '(PasswordAuthenticatedUserInterface $user, string $newHashedPassword): void\n    {',
        );
        assert.equal(
            document.getText(editBuilder.replacements[0].range),
            '(\n        PasswordAuthenticatedUserInterface $user,\n        string $newHashedPassword\n    ): void {',
        );
    });

    it('classifies a generic method call as a function expression', () => {
        const text = 'const response = await client.post<TResponse>(generatePath(url, pathParams), payload, config);';
        const {toggler, editBuilder, document} = setup(text, 'typescript', text.indexOf('payload'));

        toggler.proceed();

        assert.equal(editBuilder.replacements.length, 1);
        assert.equal(
            editBuilder.replacements[0].text,
            '(\n    generatePath(url, pathParams),\n    payload,\n    config\n)',
        );
        assert.equal(
            document.getText(editBuilder.replacements[0].range),
            '(generatePath(url, pathParams), payload, config)',
        );
    });

    it('classifies a call with nested generic type arguments as a function expression', () => {
        const text = 'const value = service.fetch<Promise<Response<T>>>(input);';
        const {toggler, editBuilder} = setup(text, 'typescript', text.indexOf('input'));

        toggler.proceed();

        assert.equal(editBuilder.replacements.length, 1);
        assert.equal(editBuilder.replacements[0].text, '(\n    input\n)');
    });

    it('does not classify a chained comparison as a function call', () => {
        messages.length = 0;
        const text = 'const result = a < b > (c);';
        const {toggler, editBuilder} = setup(text, 'typescript', text.indexOf('c'));

        toggler.proceed();

        assert.deepEqual(editBuilder.replacements, []);
        assert.equal(messages[messages.length - 1], 'Cannot toggle multiline expression at cursor.');
    });

    it('classifies arrow function parameters as a function expression', () => {
        const text = 'const fn = (a, b) => a + b;';
        const {toggler, editBuilder} = setup(text, 'typescript', text.indexOf('a,'));

        toggler.proceed();

        assert.equal(editBuilder.replacements.length, 1);
        assert.equal(editBuilder.replacements[0].text, '(\n    a,\n    b\n)');
    });

    it('classifies PHP array() as an array expression', () => {
        const text = '$values = array(1, 2);';
        const {toggler, editBuilder} = setup(text, 'php', text.indexOf('1'));

        toggler.proceed();

        assert.equal(editBuilder.replacements.length, 1);
        assert.equal(editBuilder.replacements[0].text, '(\n    1,\n    2,\n)');
    });

    it('does not toggle parentheses after a control keyword', () => {
        messages.length = 0;
        const text = 'if (value) {\n    doSomething();\n}';
        const {toggler, editBuilder} = setup(text, 'typescript', text.indexOf('value'));

        toggler.proceed();

        assert.deepEqual(editBuilder.replacements, []);
        assert.equal(messages[messages.length - 1], 'Cannot toggle multiline expression at cursor.');
    });

    it('does not toggle square brackets used for index access', () => {
        messages.length = 0;
        const text = 'const item = list[0];';
        const {toggler, editBuilder} = setup(text, 'typescript', text.indexOf('0'));

        toggler.proceed();

        assert.deepEqual(editBuilder.replacements, []);
        assert.equal(messages[messages.length - 1], 'Cannot toggle multiline expression at cursor.');
    });

    it('does not toggle when the cursor is inside a line comment', () => {
        messages.length = 0;
        const text = 'const values = [one, two]; // a comment\nconst x = 1;';
        const {toggler, editBuilder} = setup(text, 'typescript', text.indexOf('comment'));

        toggler.proceed();

        assert.deepEqual(editBuilder.replacements, []);
        assert.equal(messages[messages.length - 1], 'Cannot toggle multiline expression at cursor.');
    });

    it('does not toggle type literal braces', () => {
        messages.length = 0;
        const text = 'type Foo = { a: string };';
        const {toggler, editBuilder} = setup(text, 'typescript', text.indexOf('string'));

        toggler.proceed();

        assert.deepEqual(editBuilder.replacements, []);
        assert.equal(messages[messages.length - 1], 'Cannot toggle multiline expression at cursor.');
    });

    it('does not toggle when the cursor is not inside any bracket pair', () => {
        messages.length = 0;
        const text = 'const value = 1;';
        const {toggler, editBuilder} = setup(text, 'typescript', text.indexOf('value'));

        toggler.proceed();

        assert.deepEqual(editBuilder.replacements, []);
        assert.equal(messages[messages.length - 1], 'Cannot toggle multiline expression at cursor.');
    });
});

restoreVscodeMock();
