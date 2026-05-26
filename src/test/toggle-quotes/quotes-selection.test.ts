import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {installVscodeMock} from '../helpers/vscode';

const restoreVscodeMock = installVscodeMock();
const {default: QuotesSelection} = require('../../features/toggle-quotes/quotes-selection');

describe('QuotesSelection', () => {
    it('keeps quote selection coordinates and extracts inner text', () => {
        const selection = new QuotesSelection(3, 'const value = "hello";', 14, 20, {begin: '"', end: '"'});

        assert.equal(selection.key(), '3:14:20');
        assert.equal(selection.innerText(), 'hello');
        assert.equal(selection.length(), 6);
    });

    it('creates a replacement with selection covering the current quotes', () => {
        const selection = new QuotesSelection(1, '\'hello\'', 0, 6, {begin: '\'', end: '\''});
        const change = selection.createChange({begin: '"', end: '"'}, 'hello');

        assert.equal(change.text, '"hello"');
        assert.equal(change.selection.start.line, 1);
        assert.equal(change.selection.start.character, 0);
        assert.equal(change.selection.end.line, 1);
        assert.equal(change.selection.end.character, 7);
    });
});

restoreVscodeMock();
