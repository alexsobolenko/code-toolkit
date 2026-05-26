import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {EditRecorder, installVscodeMock, Range, Selection} from '../helpers/vscode';

const restoreVscodeMock = installVscodeMock();
const {default: ReplacementAction} = require('../../features/toggle-case/replacement-action');

describe('ReplacementAction', () => {
    it('creates a single-line replacement and adjusted range', () => {
        const range = new Range(0, 0, 0, 5);
        const action = ReplacementAction.create(
            {text: 'hello', range},
            new Selection(0, 0, 0, 5),
            (value: string) => `${value}!`,
        );

        assert.ok(action);
        assert.equal(action.text, 'hello');
        assert.equal(action.replacement, 'hello!');
        assert.equal(action.offset, 1);
        assert.equal(action.newRange.end.character, 6);
        assert.equal(action.hasChanges(), true);
    });

    it('transforms multiline text parts while keeping line breaks', () => {
        const range = new Range(0, 0, 1, 3);
        const action = ReplacementAction.create(
            {text: 'one\ntwo', range},
            new Selection(0, 0, 1, 3),
            (value: string) => value.toUpperCase(),
        );

        assert.ok(action);
        assert.equal(action.replacement, 'ONE\nTWO');
        assert.equal(action.offset, 0);
        assert.equal(action.newRange.end.character, 3);
    });

    it('does not create an action when selected text is missing', () => {
        const range = new Range(0, 0, 0, 0);

        assert.equal(
            ReplacementAction.create({text: undefined, range}, new Selection(0, 0, 0, 0), (value: string) => value),
            undefined,
        );
        assert.equal(
            ReplacementAction.create({text: '', range}, new Selection(0, 0, 0, 0), (value: string) => value),
            undefined,
        );
    });

    it('applies its replacement to an edit builder', () => {
        const range = new Range(0, 1, 0, 4);
        const action = new ReplacementAction('one', range, 'ONE', 0, range);
        const editBuilder = new EditRecorder();

        action.apply(editBuilder);

        assert.deepEqual(editBuilder.replacements, [{range, text: 'ONE'}]);
    });
});

restoreVscodeMock();
