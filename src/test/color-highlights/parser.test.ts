import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {FakeDocument, installVscodeMock, Range, setAppInstance} from '../helpers/vscode';

interface ICreatedDecoration {
    style: Record<string, unknown>;
    disposed: boolean;
    dispose(): void;
}

const createdDecorations: ICreatedDecoration[] = [];
const restoreVscodeMock = installVscodeMock({
    window: {
        createTextEditorDecorationType: (style: Record<string, unknown>) => {
            const decoration = {
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
const {default: Parser} = require('../../features/color-highlights/parser');

function createConfig(mode = 'background') {
    return {
        enabled: true,
        highlightCssNames: true,
        highlightHex: true,
        highlightHsl: true,
        highlightRgb: true,
        mode,
    };
}

describe('Color highlights Parser', () => {
    it('creates decorations for found colors and applies them to the editor', () => {
        createdDecorations.length = 0;
        const document = new FakeDocument('color: #fff;\nbackground: tomato;', 'css');
        const appliedDecorations: Array<{decoration: ICreatedDecoration, ranges: Array<{range: Range}>}> = [];
        setAppInstance({
            editor: {
                document,
                setDecorations: (decoration: ICreatedDecoration, ranges: Array<{range: Range}>) => {
                    appliedDecorations.push({decoration, ranges: [...ranges]});
                },
            },
            toDecorationOptions: (range: Range) => ({range}),
        });
        const parser = new Parser(createConfig());

        parser.findColors();
        parser.applyDecorations();

        assert.equal(createdDecorations.length, 2);
        assert.deepEqual(appliedDecorations.map((item) => item.ranges.length), [1, 1]);
        assert.equal(createdDecorations[0].style.backgroundColor, 'rgba(255, 255, 255, 1)');
        assert.equal(createdDecorations[0].style.color, '#000000');
    });

    it('does not scan when the feature is disabled', () => {
        createdDecorations.length = 0;
        const document = new FakeDocument('color: #fff;', 'css');
        const appliedDecorations: unknown[] = [];
        setAppInstance({
            editor: {
                document,
                setDecorations: (...args: unknown[]) => {
                    appliedDecorations.push(args);
                },
            },
            toDecorationOptions: (range: Range) => ({range}),
        });
        const parser = new Parser({...createConfig(), enabled: false});

        parser.findColors();
        parser.applyDecorations();

        assert.deepEqual(createdDecorations, []);
        assert.deepEqual(appliedDecorations, []);
    });

    it('uses configured decoration modes', () => {
        createdDecorations.length = 0;
        const document = new FakeDocument('color: #000;', 'css');
        setAppInstance({
            editor: {
                document,
                setDecorations: () => undefined,
            },
            toDecorationOptions: (range: Range) => ({range}),
        });
        const parser = new Parser(createConfig('border'));

        parser.findColors();

        assert.equal(createdDecorations[0].style.border, '1px solid rgba(0, 0, 0, 1)');
        assert.equal(createdDecorations[0].style.borderRadius, '2px');
    });

    it('disposes and clears existing decorations on refresh', () => {
        createdDecorations.length = 0;
        const document = new FakeDocument('color: #fff;', 'css');
        setAppInstance({
            editor: {
                document,
                setDecorations: () => undefined,
            },
            toDecorationOptions: (range: Range) => ({range}),
        });
        const parser = new Parser(createConfig());

        parser.findColors();
        parser.refreshDecorations();

        assert.equal(createdDecorations.length, 1);
        assert.equal(createdDecorations[0].disposed, true);
    });
});

restoreVscodeMock();
