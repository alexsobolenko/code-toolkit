import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {
    EditRecorder,
    FakeDocument,
    installVscodeMock,
    Selection,
    setAppInstance,
} from '../helpers/vscode';

const restoreVscodeMock = installVscodeMock();
const {default: NumberChanger} = require('../../features/change-numbers/number-changer');

describe('NumberChanger', () => {
    it('increments the number under the cursor', () => {
        const document = new FakeDocument('version 0099');
        const editBuilder = new EditRecorder();
        setAppInstance({
            editor: {
                document,
                selections: [new Selection(0, 10, 0, 10)],
                edit: (callback: (edit: EditRecorder) => void) => {
                    callback(editBuilder);
                },
            },
            isDigit: (character: string | undefined) => character !== undefined && /^\d$/.test(character),
        });

        new NumberChanger().proceed(true);

        assert.equal(editBuilder.replacements.length, 1);
        assert.equal(editBuilder.replacements[0].text, '0100');
        assert.equal(document.getText(editBuilder.replacements[0].range), '0099');
    });

    it('deduplicates overlapping selections for the same number', () => {
        const document = new FakeDocument('value 41');
        const editBuilder = new EditRecorder();
        setAppInstance({
            editor: {
                document,
                selections: [
                    new Selection(0, 6, 0, 6),
                    new Selection(0, 7, 0, 7),
                ],
                edit: (callback: (edit: EditRecorder) => void) => {
                    callback(editBuilder);
                },
            },
            isDigit: (character: string | undefined) => character !== undefined && /^\d$/.test(character),
        });

        new NumberChanger().proceed(true);

        assert.deepEqual(editBuilder.replacements.map((replacement) => replacement.text), ['42']);
    });

    it('does not edit when the cursor is not on a number', () => {
        const document = new FakeDocument('value text');
        const editBuilder = new EditRecorder();
        let edited = false;
        setAppInstance({
            editor: {
                document,
                selections: [new Selection(0, 2, 0, 2)],
                edit: (callback: (edit: EditRecorder) => void) => {
                    edited = true;
                    callback(editBuilder);
                },
            },
            isDigit: (character: string | undefined) => character !== undefined && /^\d$/.test(character),
        });

        new NumberChanger().proceed(false);

        assert.equal(edited, false);
        assert.deepEqual(editBuilder.replacements, []);
    });
});

restoreVscodeMock();
