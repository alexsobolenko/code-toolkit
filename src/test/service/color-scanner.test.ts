import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import type {IColorMatch, IColorScanOptions} from '../../interfaces';
import ColorScanner from '../../service/color-scanner';

const ALL_FORMATS: IColorScanOptions = {
    hex: true,
    rgb: true,
    hsl: true,
    cssNames: true,
};

function scan(text: string, options: Partial<IColorScanOptions> = {}): IColorMatch[] {
    const scanner = new ColorScanner();

    return scanner.scan(text, {...ALL_FORMATS, ...options});
}

function literals(text: string, matches: IColorMatch[]): string[] {
    return matches.map((match) => text.substring(match.startOffset, match.endOffset));
}

function colorKeys(matches: IColorMatch[]): string[] {
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
        const matches = scan(text, {rgb: false, hsl: false, cssNames: false});

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
        const matches = scan(text, {hex: false, hsl: false, cssNames: false});

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
        const matches = scan(text, {hex: false, rgb: false, cssNames: false});

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
        const matches = scan(text, {hex: false, rgb: false, hsl: false});

        assert.deepEqual(literals(text, matches), ['DodgerBlue', 'tomato']);
        assert.deepEqual(colorKeys(matches), [
            '30,144,255,1',
            '255,99,71,1',
        ]);
    });

    it('respects disabled color formats', () => {
        const text = 'color: #fff; background: rgb(0, 0, 0); border-color: red;';
        const matches = scan(text, {hex: false, rgb: false, hsl: false});

        assert.deepEqual(literals(text, matches), ['red']);
        assert.deepEqual(colorKeys(matches), ['255,0,0,1']);
    });

    it('returns stable results across repeated scans', () => {
        const scanner = new ColorScanner();
        const text = 'color: #fff; background: tomato;';
        const firstResult = literals(text, scanner.scan(text, ALL_FORMATS));
        const secondResult = literals(text, scanner.scan(text, ALL_FORMATS));

        assert.deepEqual(firstResult, ['#fff', 'tomato']);
        assert.deepEqual(secondResult, firstResult);
    });

    it('filters overlapping matches keeping the first one', () => {
        const text = 'color: #ff0000;';
        const matches = scan(text);

        assert.deepEqual(literals(text, matches), ['#ff0000']);
    });

    it('parses RGB with space syntax and slash alpha', () => {
        const text = 'color: rgb(255 128 0 / 0.5);';
        const matches = scan(text, {hex: false, hsl: false, cssNames: false});

        assert.deepEqual(literals(text, matches), ['rgb(255 128 0 / 0.5)']);
        assert.deepEqual(colorKeys(matches), ['255,128,0,0.5']);
    });

    it('parses RGB with percentage channels', () => {
        const text = 'color: rgb(100%, 50%, 0%);';
        const matches = scan(text, {hex: false, hsl: false, cssNames: false});

        assert.deepEqual(literals(text, matches), ['rgb(100%, 50%, 0%)']);
        assert.deepEqual(colorKeys(matches), ['255,128,0,1']);
    });

    it('parses HSL with rad and turn units', () => {
        const text = [
            'color: hsl(3.14159rad, 100%, 50%);',
            'border: hsl(0.5turn, 100%, 50%);',
        ].join(' ');
        const matches = scan(text, {hex: false, rgb: false, cssNames: false});

        assert.equal(matches.length, 2);
        assert.deepEqual(colorKeys(matches), ['0,255,255,1', '0,255,255,1']);
    });

    it('returns empty array for text with no colors', () => {
        const matches = scan('no colors here at all');

        assert.deepEqual(matches, []);
    });

    it('rejects RGB with out-of-range alpha', () => {
        const text = 'color: rgba(0, 0, 0, 1.5);';
        const matches = scan(text, {hex: false, hsl: false, cssNames: false});

        assert.deepEqual(matches, []);
    });

    it('rejects HSL with out-of-range percentage', () => {
        const text = 'color: hsl(0, 150%, 50%);';
        const matches = scan(text, {hex: false, rgb: false, cssNames: false});

        assert.deepEqual(matches, []);
    });
});
