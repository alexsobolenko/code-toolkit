import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {FakeDocument, installVscodeMock, setAppInstance} from '../helpers/vscode';

const restoreVscodeMock = installVscodeMock();
const {default: BracketPair} = require('../../features/toggle-multiline-expression/bracket-pair');

describe('BracketPair', () => {
    it('checks offsets and extracts trimmed inner text', () => {
        const pair = new BracketPair('(', ')', 4, 11);

        assert.equal(pair.contains(4), true);
        assert.equal(pair.contains(8), true);
        assert.equal(pair.contains(12), false);
        assert.equal(pair.innerText('call( value )'), 'value');
    });

    it('creates a vscode range from document offsets', () => {
        const document = new FakeDocument('call(value)');
        setAppInstance({editor: {document}});
        const pair = new BracketPair('(', ')', 4, 10);
        const range = pair.range();

        assert.equal(range.start.line, 0);
        assert.equal(range.start.character, 4);
        assert.equal(range.end.line, 0);
        assert.equal(range.end.character, 11);
    });

    it('detects whether the bracket pair is single-line', () => {
        setAppInstance({editor: {document: new FakeDocument('call(value)')}});
        assert.equal(new BracketPair('(', ')', 4, 10).isSingleLine(), true);

        setAppInstance({editor: {document: new FakeDocument('call(\nvalue\n)')}});
        assert.equal(new BracketPair('(', ')', 4, 12).isSingleLine(), false);
    });
});

restoreVscodeMock();
