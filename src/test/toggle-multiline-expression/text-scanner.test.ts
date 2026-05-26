import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import SyntaxSupport from '../../features/toggle-multiline-expression/syntax-support';
import TextScanner from '../../features/toggle-multiline-expression/text-scanner';
import type {SkippedRangeType} from '../../types';

function createScanner(): TextScanner {
    return new TextScanner(new SyntaxSupport());
}

describe('TextScanner', () => {
    it('skips strings and comments while scanning code characters', () => {
        const scanner = createScanner();
        const text = 'a "skip" b /* skip */ c // skip\nd';
        let scanned = '';

        scanner.scan(text, (character) => {
            if (/\S/.test(character)) {
                scanned += character;
            }
        }, {languageId: 'javascript'});

        assert.equal(scanned, 'abcd');
    });

    it('reports skipped range types', () => {
        const scanner = createScanner();
        const skippedTypes: SkippedRangeType[] = [];

        scanner.scan('const rx = /a\\/b/g; const text = `value`; /* block */', () => undefined, {
            languageId: 'javascript',
            onSkippedRange: (_startOffset, _endOffset, type) => {
                skippedTypes.push(type);
            },
        });

        assert.deepEqual(skippedTypes, ['regex', 'string', 'block-comment']);
    });

    it('detects line comments without treating block comments as line comments', () => {
        const scanner = createScanner();

        assert.equal(scanner.containsLineComment('value // comment', 'javascript'), true);
        assert.equal(scanner.containsLineComment('value /* comment */', 'javascript'), false);
    });

    it('detects whether an offset belongs to a skipped range', () => {
        const scanner = createScanner();
        const text = 'const text = "hello"; const value = 1;';

        assert.equal(scanner.isOffsetInSkippedRange(text, text.indexOf('hello'), 'javascript'), true);
        assert.equal(scanner.isOffsetInSkippedRange(text, text.indexOf('value'), 'javascript'), false);
    });

    it('skips PHP heredoc bodies', () => {
        const scanner = createScanner();
        const text = '$value = <<<TEXT\nignored()\nTEXT;\nvisible();';
        let scanned = '';

        scanner.scan(text, (character) => {
            scanned += character;
        }, {languageId: 'php'});

        assert.equal(scanned.includes('ignored'), false);
        assert.equal(scanned.includes('visible'), true);
    });
});
