import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import SyntaxSupport from '../../features/toggle-multiline-expression/syntax-support';

describe('SyntaxSupport', () => {
    it('detects JavaScript-like languages', () => {
        const syntaxSupport = new SyntaxSupport();

        assert.equal(syntaxSupport.isJavaScriptLike('javascript'), true);
        assert.equal(syntaxSupport.isJavaScriptLike('javascriptreact'), true);
        assert.equal(syntaxSupport.isJavaScriptLike('typescript'), true);
        assert.equal(syntaxSupport.isJavaScriptLike('typescriptreact'), true);
        assert.equal(syntaxSupport.isJavaScriptLike('php'), false);
    });

    it('detects PHP language', () => {
        const syntaxSupport = new SyntaxSupport();

        assert.equal(syntaxSupport.isPhp('php'), true);
        assert.equal(syntaxSupport.isPhp('javascript'), false);
    });

    it('checks trailing comma support by language and expression kind', () => {
        const syntaxSupport = new SyntaxSupport();

        assert.equal(syntaxSupport.isTrailingCommaSupported('typescript', 'function'), true);
        assert.equal(syntaxSupport.isTrailingCommaSupported('typescript', 'array'), true);
        assert.equal(syntaxSupport.isTrailingCommaSupported('typescript', 'object'), true);
        assert.equal(syntaxSupport.isTrailingCommaSupported('php', 'function'), true);
        assert.equal(syntaxSupport.isTrailingCommaSupported('php', 'array'), true);
        assert.equal(syntaxSupport.isTrailingCommaSupported('php', 'object'), false);
        assert.equal(syntaxSupport.isTrailingCommaSupported('python', 'array'), false);
    });

    it('detects control and expression prefix keywords', () => {
        const syntaxSupport = new SyntaxSupport();

        assert.equal(syntaxSupport.isControlKeyword('if'), true);
        assert.equal(syntaxSupport.isControlKeyword('foreach'), true);
        assert.equal(syntaxSupport.isControlKeyword('return'), false);
        assert.equal(syntaxSupport.isExpressionPrefixKeyword('return'), true);
        assert.equal(syntaxSupport.isExpressionPrefixKeyword('throw'), true);
        assert.equal(syntaxSupport.isExpressionPrefixKeyword('if'), false);
    });

    it('checks bracket roles and pairs', () => {
        const syntaxSupport = new SyntaxSupport();

        assert.equal(syntaxSupport.isOpenBracket('('), true);
        assert.equal(syntaxSupport.isOpenBracket(']'), false);
        assert.equal(syntaxSupport.isCloseBracket('}'), true);
        assert.equal(syntaxSupport.isCloseBracket('['), false);
        assert.equal(syntaxSupport.getCloseBracket('('), ')');
        assert.equal(syntaxSupport.getCloseBracket('['), ']');
        assert.equal(syntaxSupport.getCloseBracket('{'), '}');
    });
});
