import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import type {IColorHighlightMatch, IColorScannerOptions} from '../../interfaces';
import ColorScanner from '../../features/color-highlights/color-scanner';

const allFormats: IColorScannerOptions = {
    highlightHex: true,
    highlightRgb: true,
    highlightHsl: true,
    highlightCssNames: true,
};

function scan(text: string, options: Partial<IColorScannerOptions> = {}): IColorHighlightMatch[] {
    const scanner = new ColorScanner();

    return scanner.scan(text, {...allFormats, ...options});
}

function literals(text: string, matches: IColorHighlightMatch[]): string[] {
    return matches.map((match) => text.substring(match.startOffset, match.endOffset));
}

function colorKeys(matches: IColorHighlightMatch[]): string[] {
    return matches.map((match) => [
        match.color.red,
        match.color.green,
        match.color.blue,
        match.color.alpha,
    ].join(','));
}

describe('ColorScanner', () => {
    it('finds supported HEX colors and ignores unsupported HEX lengths', () => {
        const text = [
            'color: #f80;',
            'border-color: #ff8800;',
            'outline-color: #ff880080;',
            'invalid: #ffff;',
        ].join(' ');
        const matches = scan(text, {
            highlightRgb: false,
            highlightHsl: false,
            highlightCssNames: false,
        });

        assert.deepEqual(literals(text, matches), ['#f80', '#ff8800', '#ff880080']);
        assert.deepEqual(colorKeys(matches), [
            '255,136,0,1',
            '255,136,0,1',
            '255,136,0,0.502',
        ]);
    });

    it('finds RGB and RGBA colors and rejects invalid channel values', () => {
        const text = [
            'background-color: rgb(46, 139, 87);',
            'box-shadow: 0 0 0 3px rgba(30, 144, 255, 0.25);',
            'invalid: rgb(300, 0, 0);',
        ].join(' ');
        const matches = scan(text, {
            highlightHex: false,
            highlightHsl: false,
            highlightCssNames: false,
        });

        assert.deepEqual(literals(text, matches), [
            'rgb(46, 139, 87)',
            'rgba(30, 144, 255, 0.25)',
        ]);
        assert.deepEqual(colorKeys(matches), [
            '46,139,87,1',
            '30,144,255,0.25',
        ]);
    });

    it('finds HSL and HSLA colors and converts them to RGB values', () => {
        const text = [
            'background-color: hsl(120, 100%, 50%);',
            'outline-color: hsla(240, 100%, 50%, 0.5);',
        ].join(' ');
        const matches = scan(text, {
            highlightHex: false,
            highlightRgb: false,
            highlightCssNames: false,
        });

        assert.deepEqual(literals(text, matches), [
            'hsl(120, 100%, 50%)',
            'hsla(240, 100%, 50%, 0.5)',
        ]);
        assert.deepEqual(colorKeys(matches), [
            '0,255,0,1',
            '0,0,255,0.5',
        ]);
    });

    it('finds CSS color names case-insensitively without matching parts of words', () => {
        const text = 'color: DodgerBlue; content: redacted; border-color: tomato;';
        const matches = scan(text, {
            highlightHex: false,
            highlightRgb: false,
            highlightHsl: false,
        });

        assert.deepEqual(literals(text, matches), ['DodgerBlue', 'tomato']);
        assert.deepEqual(colorKeys(matches), [
            '30,144,255,1',
            '255,99,71,1',
        ]);
    });

    it('respects disabled color formats', () => {
        const text = 'color: #fff; background: rgb(0, 0, 0); border-color: red;';
        const matches = scan(text, {
            highlightHex: false,
            highlightRgb: false,
            highlightHsl: false,
        });

        assert.deepEqual(literals(text, matches), ['red']);
        assert.deepEqual(colorKeys(matches), ['255,0,0,1']);
    });

    it('returns stable results across repeated scans', () => {
        const scanner = new ColorScanner();
        const text = 'color: #fff; background: tomato;';
        const firstResult = literals(text, scanner.scan(text, allFormats));
        const secondResult = literals(text, scanner.scan(text, allFormats));

        assert.deepEqual(firstResult, ['#fff', 'tomato']);
        assert.deepEqual(secondResult, firstResult);
    });
});
