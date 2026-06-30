import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {
    EditRecorder,
    FakeDocument,
    Selection,
    installVscodeMock,
} from '../helpers/vscode';

const mockEditor: {current: unknown} = {current: undefined};
const mockWindowOverrides = {};
Object.defineProperty(mockWindowOverrides, 'activeTextEditor', {
    get: () => mockEditor.current,
    enumerable: true,
    configurable: true,
});
const restoreVscodeMock = installVscodeMock({window: mockWindowOverrides});
const {default: NumberChanger} = require('../../feature/number-changer');

function setup(
    text: string,
    selections: Selection[],
): {changer: any; editBuilder: EditRecorder; document: FakeDocument} {
    const document = new FakeDocument(text);
    const editBuilder = new EditRecorder();
    const changer = new NumberChanger();

    mockEditor.current = {
        document,
        selections,
        edit: (callback: (edit: EditRecorder) => void) => {
            callback(editBuilder);
        },
    };

    return {changer, editBuilder, document};
}

describe('NumberChanger', () => {
    it('increments the number under the cursor', () => {
        const {changer, editBuilder, document} = setup(
            'version 0099',
            [new Selection(0, 10, 0, 10)],
        );

        changer.proceed(true);

        assert.equal(editBuilder.replacements.length, 1);
        assert.equal(editBuilder.replacements[0].text, '0100');
        assert.equal(document.getText(editBuilder.replacements[0].range), '0099');
    });

    it('decrements the number under the cursor', () => {
        const {changer, editBuilder} = setup(
            'count 50',
            [new Selection(0, 7, 0, 7)],
        );

        changer.proceed(false);

        assert.equal(editBuilder.replacements.length, 1);
        assert.equal(editBuilder.replacements[0].text, '49');
    });

    it('does not decrement below zero', () => {
        const {changer, editBuilder} = setup(
            'count 0',
            [new Selection(0, 6, 0, 6)],
        );

        changer.proceed(false);

        assert.equal(editBuilder.replacements.length, 1);
        assert.equal(editBuilder.replacements[0].text, '0');
    });

    it('preserves leading zeroes', () => {
        const {changer, editBuilder} = setup(
            'id 0010',
            [new Selection(0, 4, 0, 4)],
        );

        changer.proceed(false);

        assert.equal(editBuilder.replacements[0].text, '0009');
    });

    it('deduplicates overlapping selections for the same number', () => {
        const {changer, editBuilder} = setup(
            'value 41',
            [new Selection(0, 6, 0, 6), new Selection(0, 7, 0, 7)],
        );

        changer.proceed(true);

        assert.equal(editBuilder.replacements.length, 1);
        assert.equal(editBuilder.replacements[0].text, '42');
    });

    it('does not edit when the cursor is not on a number', () => {
        const {changer, editBuilder} = setup(
            'value text',
            [new Selection(0, 2, 0, 2)],
        );

        changer.proceed(false);

        assert.deepEqual(editBuilder.replacements, []);
    });

    it('handles multiple selections on different numbers', () => {
        const {changer, editBuilder} = setup(
            'a 10 b 20',
            [new Selection(0, 3, 0, 3), new Selection(0, 8, 0, 8)],
        );

        changer.proceed(true);

        assert.equal(editBuilder.replacements.length, 2);
        assert.equal(editBuilder.replacements[0].text, '11');
        assert.equal(editBuilder.replacements[1].text, '21');
    });

    it('works when cursor is at the left edge of the number', () => {
        const {changer, editBuilder} = setup(
            'x 99',
            [new Selection(0, 2, 0, 2)],
        );

        changer.proceed(true);

        assert.equal(editBuilder.replacements.length, 1);
        assert.equal(editBuilder.replacements[0].text, '100');
    });
});

restoreVscodeMock();
