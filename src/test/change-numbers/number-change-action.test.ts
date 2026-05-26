import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {EditRecorder, installVscodeMock, Range} from '../helpers/vscode';

const restoreVscodeMock = installVscodeMock();
const {default: NumberChangeAction} = require('../../features/change-numbers/number-change-action');

describe('NumberChangeAction', () => {
    it('increments numbers while preserving leading zeroes', () => {
        const action = NumberChangeAction.create(new Range(0, 0, 0, 4), '0099', true);

        assert.equal(action.replacement, '0100');
    });

    it('decrements numbers while preserving leading zeroes and stops at zero', () => {
        const decremented = NumberChangeAction.create(new Range(0, 0, 0, 4), '0010', false);
        const zero = NumberChangeAction.create(new Range(0, 0, 0, 4), '0000', false);

        assert.equal(decremented.replacement, '0009');
        assert.equal(zero.replacement, '0000');
    });

    it('uses range coordinates as a stable action key', () => {
        const action = new NumberChangeAction(new Range(2, 3, 2, 7), '42');

        assert.equal(action.key(), '2:3:2:7');
    });

    it('applies its replacement to an edit builder', () => {
        const range = new Range(1, 2, 1, 5);
        const action = new NumberChangeAction(range, '124');
        const editBuilder = new EditRecorder();

        action.apply(editBuilder);

        assert.deepEqual(editBuilder.replacements, [{range, text: '124'}]);
    });
});

restoreVscodeMock();
