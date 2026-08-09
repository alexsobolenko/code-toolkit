import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {FakeDocument, installVscodeMock} from '../helpers/vscode';

interface IFakeDecoration {
    style: unknown;
    disposed: boolean;
    dispose(): void;
}

const createdDecorations: IFakeDecoration[] = [];
const restoreVscodeMock = installVscodeMock({
    window: {
        createTextEditorDecorationType: (style: unknown): IFakeDecoration => {
            const decoration: IFakeDecoration = {
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
const {default: ColorHighlighter} = require('../../decorator/color-highlighter');

function makeEditor(text: string): {document: FakeDocument; setDecorations(): void} {
    return {
        document: new FakeDocument(text),
        setDecorations: () => undefined,
    };
}

describe('ColorHighlighter', () => {
    it('disposes decoration types for colors no longer present in a later update', () => {
        createdDecorations.length = 0;
        const highlighter = new ColorHighlighter();

        highlighter.update(makeEditor('color: #ff0000; color: #00ff00;'));

        assert.equal(createdDecorations.length, 2);
        assert.equal(createdDecorations.filter((d) => d.disposed).length, 0);
        assert.equal(highlighter.decorations.size, 2);

        highlighter.update(makeEditor('color: #ff0000;'));

        assert.equal(createdDecorations.filter((d) => d.disposed).length, 1);
        assert.equal(highlighter.decorations.size, 1);
    });

    it('does not recreate a decoration type for a color that persists across updates', () => {
        createdDecorations.length = 0;
        const highlighter = new ColorHighlighter();

        highlighter.update(makeEditor('color: #ff0000;'));
        assert.equal(createdDecorations.length, 1);

        highlighter.update(makeEditor('color: #ff0000; background: #00ff00;'));

        assert.equal(createdDecorations.length, 2);
        assert.equal(createdDecorations.filter((d) => d.disposed).length, 0);
    });
});

restoreVscodeMock();
