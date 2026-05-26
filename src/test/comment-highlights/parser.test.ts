import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {FakeDocument, installVscodeMock, Range, setAppInstance} from '../helpers/vscode';

interface ICreatedDecoration {
    style: Record<string, unknown>;
    disposed: boolean;
    dispose(): void;
}

const createdDecorations: ICreatedDecoration[] = [];
const restoreVscodeMock = installVscodeMock({
    window: {
        createTextEditorDecorationType: (style: Record<string, unknown>) => {
            const decoration = {
                style,
                disposed: false,
                dispose() {
                    this.disposed = true;
                },
            };
            createdDecorations.push(decoration);

            return decoration;
        },
    },
});
const {default: Parser} = require('../../features/comment-highlights/parser');

function createConfig(commentConfiguration = {lineComment: '//', blockComment: ['/*', '*/']}) {
    return {
        commentTags: [{
            backgroundColor: 'transparent',
            bold: true,
            color: '#FF8C00',
            italic: false,
            strikethrough: false,
            tag: 'TODO',
            underline: false,
        }],
        getCommentConfiguration: async () => commentConfiguration,
        highlightMultilineComments: true,
        highlightPlainText: true,
    };
}

function setParserAppInstance(document: FakeDocument, appliedDecorations: Array<{ranges: Array<{range: Range}>}>) {
    setAppInstance({
        editor: {
            document,
            setDecorations: (_decoration: unknown, ranges: Array<{range: Range}>) => {
                appliedDecorations.push({ranges: [...ranges]});
            },
        },
        toDecorationOptions: (range: Range) => ({range}),
    });
}

describe('Comment highlights Parser', () => {
    it('finds configured tags in single-line comments', async () => {
        createdDecorations.length = 0;
        const document = new FakeDocument('// TODO: line\nconst value = 1;', 'javascript');
        const appliedDecorations: Array<{ranges: Array<{range: Range}>}> = [];
        setParserAppInstance(document, appliedDecorations);
        const parser = new Parser(createConfig());

        await parser.setRegex('javascript');
        parser.findSingleLineComments();
        parser.applyDecorations();

        assert.equal(createdDecorations.length, 1);
        assert.equal(appliedDecorations.length, 1);
        assert.equal(appliedDecorations[0].ranges.length, 1);
        assert.equal(document.getText(appliedDecorations[0].ranges[0].range), '// TODO: line');
    });

    it('finds configured tags in block comments', async () => {
        const document = new FakeDocument('/*\n TODO: block\n*/', 'javascript');
        const appliedDecorations: Array<{ranges: Array<{range: Range}>}> = [];
        setParserAppInstance(document, appliedDecorations);
        const parser = new Parser(createConfig());

        await parser.setRegex('javascript');
        parser.findBlockComments();
        parser.applyDecorations();

        assert.equal(appliedDecorations.length, 1);
        assert.equal(appliedDecorations[0].ranges.length, 1);
        assert.equal(document.getText(appliedDecorations[0].ranges[0].range), 'TODO: block');
    });

    it('finds configured tags in JSDoc comments for JavaScript-like languages', async () => {
        const document = new FakeDocument('/**\n * TODO: docs\n */', 'typescript');
        const appliedDecorations: Array<{ranges: Array<{range: Range}>}> = [];
        setParserAppInstance(document, appliedDecorations);
        const parser = new Parser(createConfig());

        await parser.setRegex('typescript');
        parser.findJSDocComments();
        parser.applyDecorations();

        assert.equal(appliedDecorations.length, 1);
        assert.equal(appliedDecorations[0].ranges.length, 1);
        assert.equal(document.getText(appliedDecorations[0].ranges[0].range), 'TODO: docs');
    });

    it('marks languages without comment configuration as unsupported', async () => {
        const parser = new Parser({
            ...createConfig(),
            getCommentConfiguration: async () => undefined,
        });

        await parser.setRegex('unknown');

        assert.equal(parser.supportedLanguage, false);
    });

    it('disposes old tag decorations on refresh', async () => {
        createdDecorations.length = 0;
        const parser = new Parser(createConfig());

        await parser.setRegex('javascript');
        parser.refreshTags();

        assert.equal(createdDecorations[0].disposed, true);
        assert.equal(createdDecorations.length, 2);
    });
});

restoreVscodeMock();
