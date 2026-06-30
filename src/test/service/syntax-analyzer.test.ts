import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import SyntaxAnalyzer from '../../service/syntax-analyzer';
import type {SkippedRangeType} from '../../types';

describe('SyntaxAnalyzer language and token helpers', () => {
    it('detects JavaScript-like languages', () => {
        const analyzer = new SyntaxAnalyzer();

        assert.equal(analyzer.isJavaScriptLike('javascript'), true);
        assert.equal(analyzer.isJavaScriptLike('javascriptreact'), true);
        assert.equal(analyzer.isJavaScriptLike('typescript'), true);
        assert.equal(analyzer.isJavaScriptLike('typescriptreact'), true);
        assert.equal(analyzer.isJavaScriptLike('php'), false);
    });

    it('detects PHP language', () => {
        const analyzer = new SyntaxAnalyzer();

        assert.equal(analyzer.isPhp('php'), true);
        assert.equal(analyzer.isPhp('javascript'), false);
    });

    it('checks trailing comma support by language and expression kind', () => {
        const analyzer = new SyntaxAnalyzer();

        assert.equal(analyzer.isTrailingCommaSupported('typescript', 'function'), true);
        assert.equal(analyzer.isTrailingCommaSupported('typescript', 'array'), true);
        assert.equal(analyzer.isTrailingCommaSupported('typescript', 'object'), true);
        assert.equal(analyzer.isTrailingCommaSupported('php', 'function'), true);
        assert.equal(analyzer.isTrailingCommaSupported('php', 'array'), true);
        assert.equal(analyzer.isTrailingCommaSupported('php', 'object'), false);
        assert.equal(analyzer.isTrailingCommaSupported('python', 'array'), false);
    });

    it('detects control and expression prefix keywords', () => {
        const analyzer = new SyntaxAnalyzer();

        assert.equal(analyzer.isControlKeyword('if'), true);
        assert.equal(analyzer.isControlKeyword('foreach'), true);
        assert.equal(analyzer.isControlKeyword('return'), false);
        assert.equal(analyzer.isExpressionPrefixKeyword('return'), true);
        assert.equal(analyzer.isExpressionPrefixKeyword('throw'), true);
        assert.equal(analyzer.isExpressionPrefixKeyword('if'), false);
    });

    it('checks bracket roles and pairs', () => {
        const analyzer = new SyntaxAnalyzer();

        assert.equal(analyzer.isOpenBracket('('), true);
        assert.equal(analyzer.isOpenBracket(']'), false);
        assert.equal(analyzer.isCloseBracket('}'), true);
        assert.equal(analyzer.isCloseBracket('['), false);
        assert.equal(analyzer.getCloseBracket('('), ')');
        assert.equal(analyzer.getCloseBracket('['), ']');
        assert.equal(analyzer.getCloseBracket('{'), '}');
    });
});

describe('SyntaxAnalyzer text scanning', () => {
    it('skips strings and comments while scanning code characters', () => {
        const analyzer = new SyntaxAnalyzer();
        const text = 'a "skip" b /* skip */ c // skip\nd';
        let scanned = '';

        analyzer.scan(text, (character) => {
            if (/\S/.test(character)) {
                scanned += character;
            }
        }, {languageId: 'javascript'});

        assert.equal(scanned, 'abcd');
    });

    it('reports skipped range types', () => {
        const analyzer = new SyntaxAnalyzer();
        const skippedTypes: SkippedRangeType[] = [];

        analyzer.scan('const rx = /a\\/b/g; const text = `value`; /* block */', () => undefined, {
            languageId: 'javascript',
            onSkippedRange: (_startOffset, _endOffset, type) => {
                skippedTypes.push(type);
            },
        });

        assert.deepEqual(skippedTypes, ['regex', 'string', 'block-comment']);
    });

    it('detects line comments without treating block comments as line comments', () => {
        const analyzer = new SyntaxAnalyzer();

        assert.equal(analyzer.containsLineComment('value // comment', 'javascript'), true);
        assert.equal(analyzer.containsLineComment('value /* comment */', 'javascript'), false);
    });

    it('detects whether an offset belongs to a skipped range', () => {
        const analyzer = new SyntaxAnalyzer();
        const text = 'const text = "hello"; const value = 1;';

        assert.equal(analyzer.isOffsetInSkippedRange(text, text.indexOf('hello'), 'javascript'), true);
        assert.equal(analyzer.isOffsetInSkippedRange(text, text.indexOf('value'), 'javascript'), false);
    });

    it('detects whether an offset belongs to a comment but not a string', () => {
        const analyzer = new SyntaxAnalyzer();
        const text = 'const text = "hello"; // comment\nconst value = 1;';

        assert.equal(analyzer.isOffsetInComment(text, text.indexOf('comment'), 'javascript'), true);
        assert.equal(analyzer.isOffsetInComment(text, text.indexOf('hello'), 'javascript'), false);
        assert.equal(analyzer.isOffsetInComment(text, text.indexOf('value'), 'javascript'), false);
    });

    it('skips PHP heredoc bodies', () => {
        const analyzer = new SyntaxAnalyzer();
        const text = '$value = <<<TEXT\nignored()\nTEXT;\nvisible();';
        let scanned = '';

        analyzer.scan(text, (character) => {
            scanned += character;
        }, {languageId: 'php'});

        assert.equal(scanned.includes('ignored'), false);
        assert.equal(scanned.includes('visible'), true);
    });
});
