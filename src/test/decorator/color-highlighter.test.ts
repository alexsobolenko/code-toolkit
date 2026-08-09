import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {FakeDocument, installVscodeMock, Position, Range} from '../helpers/vscode';

/* mirrors the default passed to getConfig() in Feature.getVisibleScanRange */
const VISIBLE_RANGE_PADDING_LINES = 500;

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

function makeEditor(
    text: string,
    visibleRange?: Range,
): {document: FakeDocument; visibleRanges: Range[]; setDecorations(): void} {
    const document = new FakeDocument(text);
    const fullRange = new Range(new Position(0, 0), document.lineAt(document.lineCount - 1).range.end);

    return {
        document,
        visibleRanges: [visibleRange ?? fullRange],
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

    it('does not scan colors far outside the padded visible range', () => {
        createdDecorations.length = 0;
        const highlighter = new ColorHighlighter();

        const lines = ['color: #ff0000;'];
        for (let i = 0; i < VISIBLE_RANGE_PADDING_LINES + 50; i++) {
            lines.push('');
        }
        lines.push('color: #00ff00;');
        const text = lines.join('\n');
        const visibleRange = new Range(new Position(0, 0), new Position(0, lines[0].length));

        highlighter.update(makeEditor(text, visibleRange));

        assert.equal(createdDecorations.length, 1);
    });

    it('scans colors within the padded visible range', () => {
        createdDecorations.length = 0;
        const highlighter = new ColorHighlighter();

        const lines = ['color: #ff0000;'];
        for (let i = 0; i < VISIBLE_RANGE_PADDING_LINES - 50; i++) {
            lines.push('');
        }
        lines.push('color: #00ff00;');
        const text = lines.join('\n');
        const visibleRange = new Range(new Position(0, 0), new Position(0, lines[0].length));

        highlighter.update(makeEditor(text, visibleRange));

        assert.equal(createdDecorations.length, 2);
    });
});

restoreVscodeMock();
