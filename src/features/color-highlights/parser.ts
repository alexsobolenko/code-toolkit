import {
    DecorationRangeBehavior,
    DecorationRenderOptions,
    Range,
    window,
} from 'vscode';
import App from '../../app';
import {IColorFunctionParts, IColorHighlightDecoration, IColorHighlightMatch, IParsedColor} from '../../interfaces';
import {C_CSS_COLOR_NAMES} from '../../constants';
import Configuration from './configuration';

export default class Parser {
    public config: Configuration;
    private decorations = new Map<string, IColorHighlightDecoration>();

    public constructor(config: Configuration) {
        this.config = config;
    }

    public findColors(): void {
        if (!this.config.enabled) {
            return;
        }

        const {document} = App.instance.editor;
        const text = document.getText();
        const matches = this.findMatches(text);
        for (const match of matches) {
            const startPos = document.positionAt(match.startOffset);
            const endPos = document.positionAt(match.endOffset);
            const item = this.getDecoration(match.color);
            item.ranges.push(App.instance.toDecorationOptions(new Range(startPos, endPos)));
        }
    }

    public applyDecorations(): void {
        for (const item of this.decorations.values()) {
            App.instance.editor.setDecorations(item.decoration, item.ranges);
            item.ranges.length = 0;
        }
    }

    public refreshDecorations(): void {
        for (const item of this.decorations.values()) {
            item.decoration.dispose();
        }

        this.decorations.clear();
    }

    private findMatches(text: string): IColorHighlightMatch[] {
        const matches: IColorHighlightMatch[] = [];
        if (this.config.highlightHex) {
            this.findHexColors(text, matches);
        }

        if (this.config.highlightRgb) {
            this.findRgbColors(text, matches);
        }

        if (this.config.highlightHsl) {
            this.findHslColors(text, matches);
        }

        if (this.config.highlightCssNames) {
            this.findCssColorNames(text, matches);
        }

        return this.filterOverlappingMatches(matches);
    }

    private findHexColors(text: string, matches: IColorHighlightMatch[]): void {
        const regEx = /(^|[^A-Za-z0-9_#])(#(?:[0-9A-F]{8}|[0-9A-F]{6}|[0-9A-F]{3}))(?![A-Za-z0-9_])/ig;
        let match: RegExpExecArray | null;
        while (match = regEx.exec(text)) {
            const [, prefix, literal] = match;
            const color = this.parseHexColor(literal);
            if (!color) {
                continue;
            }

            const startOffset = match.index + prefix.length;
            matches.push({
                startOffset,
                endOffset: startOffset + literal.length,
                color,
            });
        }
    }

    private findRgbColors(text: string, matches: IColorHighlightMatch[]): void {
        const regEx = /\brgba?\(\s*[^()\r\n]*\)/ig;
        let match: RegExpExecArray | null;
        while (match = regEx.exec(text)) {
            const [literal] = match;
            const color = this.parseRgbColor(literal);
            if (!color) {
                continue;
            }

            matches.push({
                startOffset: match.index,
                endOffset: match.index + literal.length,
                color,
            });
        }
    }

    private findHslColors(text: string, matches: IColorHighlightMatch[]): void {
        const regEx = /\bhsla?\(\s*[^()\r\n]*\)/ig;
        let match: RegExpExecArray | null;
        while (match = regEx.exec(text)) {
            const [literal] = match;
            const color = this.parseHslColor(literal);
            if (!color) {
                continue;
            }

            matches.push({
                startOffset: match.index,
                endOffset: match.index + literal.length,
                color,
            });
        }
    }

    private findCssColorNames(text: string, matches: IColorHighlightMatch[]): void {
        const regEx = this.getCssColorNameRegExp();
        let match: RegExpExecArray | null;
        while (match = regEx.exec(text)) {
            const [, prefix, literal] = match;
            const color = this.parseHexColor(C_CSS_COLOR_NAMES[literal.toLowerCase()]);
            if (!color) {
                continue;
            }

            const startOffset = match.index + prefix.length;
            matches.push({
                startOffset,
                endOffset: startOffset + literal.length,
                color,
            });
        }
    }

    private filterOverlappingMatches(matches: IColorHighlightMatch[]): IColorHighlightMatch[] {
        const sortedMatches = [...matches].sort((a, b) => {
            if (a.startOffset !== b.startOffset) {
                return a.startOffset - b.startOffset;
            }

            return b.endOffset - a.endOffset;
        });
        const result: IColorHighlightMatch[] = [];
        let previousEndOffset = -1;
        for (const match of sortedMatches) {
            if (match.startOffset < previousEndOffset) {
                continue;
            }

            result.push(match);
            previousEndOffset = match.endOffset;
        }

        return result;
    }

    private getDecoration(color: IParsedColor): IColorHighlightDecoration {
        const key = this.getColorKey(color);
        const existing = this.decorations.get(key);
        if (existing) {
            return existing;
        }

        const item = {
            decoration: window.createTextEditorDecorationType(this.getDecorationOptions(color)),
            ranges: [],
        };
        this.decorations.set(key, item);

        return item;
    }

    private getDecorationOptions(color: IParsedColor): DecorationRenderOptions {
        const options: DecorationRenderOptions = {
            rangeBehavior: DecorationRangeBehavior.ClosedClosed,
        };
        const cssColor = this.toCssColor(color);

        switch (this.config.mode) {
            case 'border':
                options.border = `1px solid ${cssColor}`;
                options.borderRadius = '2px';
                break;
            case 'dot':
                options.before = {
                    contentText: ' ',
                    backgroundColor: cssColor,
                    width: '0.75em',
                    height: '0.75em',
                    margin: '0 0.25em 0 0',
                };
                break;
            case 'background':
            default:
                options.backgroundColor = cssColor;
                options.borderRadius = '2px';
                if (color.alpha >= 0.4) {
                    options.color = this.getReadableTextColor(color);
                } else {
                    options.border = `1px solid ${this.toOpaqueCssColor(color)}`;
                }
                break;
        }

        return options;
    }

    private getCssColorNameRegExp(): RegExp {
        const names = Object.keys(C_CSS_COLOR_NAMES)
            .sort((a, b) => b.length - a.length)
            .join('|');

        return new RegExp(`(^|[^A-Za-z0-9_-])(${names})(?![A-Za-z0-9_-])`, 'ig');
    }

    private parseHexColor(input: string | undefined): IParsedColor | undefined {
        if (!input) {
            return undefined;
        }

        const value = input.replace('#', '');
        if (value.length === 3) {
            const red = parseInt(value[0] + value[0], 16);
            const green = parseInt(value[1] + value[1], 16);
            const blue = parseInt(value[2] + value[2], 16);

            return this.createColor(red, green, blue, 1);
        }

        if (value.length === 6 || value.length === 8) {
            const red = parseInt(value.slice(0, 2), 16);
            const green = parseInt(value.slice(2, 4), 16);
            const blue = parseInt(value.slice(4, 6), 16);
            const alpha = value.length === 8 ? parseInt(value.slice(6, 8), 16) / 255 : 1;

            return this.createColor(red, green, blue, alpha);
        }

        return undefined;
    }

    private parseRgbColor(input: string): IParsedColor | undefined {
        const parts = this.getColorFunctionParts(input);
        if (!parts || parts.channels.length !== 3) {
            return undefined;
        }

        const red = this.parseRgbChannel(parts.channels[0]);
        const green = this.parseRgbChannel(parts.channels[1]);
        const blue = this.parseRgbChannel(parts.channels[2]);
        const alpha = parts.alpha === undefined ? 1 : this.parseAlpha(parts.alpha);
        if (red === undefined || green === undefined || blue === undefined || alpha === undefined) {
            return undefined;
        }

        return this.createColor(red, green, blue, alpha);
    }

    private parseHslColor(input: string): IParsedColor | undefined {
        const parts = this.getColorFunctionParts(input);
        if (!parts || parts.channels.length !== 3) {
            return undefined;
        }

        const hue = this.parseHue(parts.channels[0]);
        const saturation = this.parsePercent(parts.channels[1]);
        const lightness = this.parsePercent(parts.channels[2]);
        const alpha = parts.alpha === undefined ? 1 : this.parseAlpha(parts.alpha);
        if (hue === undefined || saturation === undefined || lightness === undefined || alpha === undefined) {
            return undefined;
        }

        const color = this.hslToRgb(hue, saturation / 100, lightness / 100);

        return this.createColor(color.red, color.green, color.blue, alpha);
    }

    private getColorFunctionParts(input: string): IColorFunctionParts | undefined {
        const body = input.replace(/^[a-z]+\(/i, '').replace(/\)$/, '').trim();
        if (!body) {
            return undefined;
        }

        if (body.includes(',')) {
            const parts = body.split(',').map((item) => item.trim());
            if ((parts.length !== 3 && parts.length !== 4) || parts.some((item) => item === '')) {
                return undefined;
            }

            return {
                channels: parts.slice(0, 3),
                alpha: parts[3],
            };
        }

        const slashParts = body.split('/').map((item) => item.trim());
        if (slashParts.length > 2 || slashParts.some((item) => item === '')) {
            return undefined;
        }

        const channels = slashParts[0].split(/\s+/).filter((item) => item !== '');
        if (channels.length !== 3) {
            return undefined;
        }

        return {
            channels,
            alpha: slashParts[1],
        };
    }

    private parseRgbChannel(input: string): number | undefined {
        if (input.endsWith('%')) {
            const percent = this.parsePercent(input);
            if (percent === undefined) {
                return undefined;
            }

            return Math.round(255 * percent / 100);
        }

        const value = Number(input);
        if (!Number.isFinite(value) || value < 0 || value > 255) {
            return undefined;
        }

        return Math.round(value);
    }

    private parseAlpha(input: string): number | undefined {
        if (input.endsWith('%')) {
            const percent = this.parsePercent(input);
            if (percent === undefined) {
                return undefined;
            }

            return percent / 100;
        }

        const value = Number(input);
        if (!Number.isFinite(value) || value < 0 || value > 1) {
            return undefined;
        }

        return value;
    }

    private parsePercent(input: string): number | undefined {
        if (!input.endsWith('%')) {
            return undefined;
        }

        const value = Number(input.slice(0, -1));
        if (!Number.isFinite(value) || value < 0 || value > 100) {
            return undefined;
        }

        return value;
    }

    private parseHue(input: string): number | undefined {
        const match = input.match(/^([+-]?(?:\d+|\d*\.\d+))(deg|rad|turn)?$/i);
        if (!match) {
            return undefined;
        }

        const [, rawValue, rawUnit] = match;
        const value = Number(rawValue);
        if (!Number.isFinite(value)) {
            return undefined;
        }

        const unit = rawUnit?.toLowerCase();
        let degrees = value;
        if (unit === 'rad') {
            degrees = value * 180 / Math.PI;
        } else if (unit === 'turn') {
            degrees = value * 360;
        }

        return ((degrees % 360) + 360) % 360;
    }

    private hslToRgb(hue: number, saturation: number, lightness: number): IParsedColor {
        const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
        const huePrime = hue / 60;
        const x = chroma * (1 - Math.abs(huePrime % 2 - 1));
        const match = this.getHslMatch(huePrime, chroma, x);
        const m = lightness - chroma / 2;

        return {
            red: Math.round((match.red + m) * 255),
            green: Math.round((match.green + m) * 255),
            blue: Math.round((match.blue + m) * 255),
            alpha: 1,
        };
    }

    private getHslMatch(huePrime: number, chroma: number, x: number): IParsedColor {
        if (huePrime < 1) {
            return {red: chroma, green: x, blue: 0, alpha: 1};
        }

        if (huePrime < 2) {
            return {red: x, green: chroma, blue: 0, alpha: 1};
        }

        if (huePrime < 3) {
            return {red: 0, green: chroma, blue: x, alpha: 1};
        }

        if (huePrime < 4) {
            return {red: 0, green: x, blue: chroma, alpha: 1};
        }

        if (huePrime < 5) {
            return {red: x, green: 0, blue: chroma, alpha: 1};
        }

        return {red: chroma, green: 0, blue: x, alpha: 1};
    }

    private createColor(red: number, green: number, blue: number, alpha: number): IParsedColor | undefined {
        if (![red, green, blue, alpha].every((item) => Number.isFinite(item))) {
            return undefined;
        }

        return {
            red: Math.round(red),
            green: Math.round(green),
            blue: Math.round(blue),
            alpha: this.roundAlpha(alpha),
        };
    }

    private getReadableTextColor(color: IParsedColor): string {
        const red = this.toLinearColorValue(color.red);
        const green = this.toLinearColorValue(color.green);
        const blue = this.toLinearColorValue(color.blue);
        const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;

        return luminance > 0.5 ? '#000000' : '#FFFFFF';
    }

    private toLinearColorValue(value: number): number {
        const channel = value / 255;
        if (channel <= 0.03928) {
            return channel / 12.92;
        }

        return ((channel + 0.055) / 1.055) ** 2.4;
    }

    private getColorKey(color: IParsedColor): string {
        return `${color.red},${color.green},${color.blue},${this.getAlphaString(color.alpha)}`;
    }

    private toCssColor(color: IParsedColor): string {
        return `rgba(${color.red}, ${color.green}, ${color.blue}, ${this.getAlphaString(color.alpha)})`;
    }

    private toOpaqueCssColor(color: IParsedColor): string {
        return `rgb(${color.red}, ${color.green}, ${color.blue})`;
    }

    private roundAlpha(alpha: number): number {
        return Math.round(alpha * 1000) / 1000;
    }

    private getAlphaString(alpha: number): string {
        return `${this.roundAlpha(alpha)}`;
    }
}
