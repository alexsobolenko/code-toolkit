import {IColorMatch, IColorScanOptions, IParsedColor} from '../interfaces';
import {
    COLOR_FUNCTION_END_REGEX,
    COLOR_FUNCTION_START_REGEX,
    COLOR_HEX_REGEX,
    COLOR_HSL_REGEX,
    COLOR_HUE_REGEX,
    COLOR_RGB_REGEX,
    COLOR_SPACE_SEPARATOR_REGEX,
    CSS_COLOR_NAME_REGEX,
    CSS_COLOR_NAMES,
} from '../constants';

export default class ColorScanner {
    scan(text: string, options: IColorScanOptions): IColorMatch[] {
        const matches: IColorMatch[] = [];

        if (options.hex) {
            this.findHexColors(text, matches);
        }
        if (options.rgb) {
            this.findRgbColors(text, matches);
        }
        if (options.hsl) {
            this.findHslColors(text, matches);
        }
        if (options.cssNames) {
            this.findCssColorNames(text, matches);
        }

        return this.filterOverlapping(matches);
    }

    private findHexColors(text: string, matches: IColorMatch[]): void {
        COLOR_HEX_REGEX.lastIndex = 0;
        let match: RegExpExecArray | null;
        while (match = COLOR_HEX_REGEX.exec(text)) {
            const [, prefix, literal] = match;
            const color = this.parseHex(literal);
            if (!color) {
                continue;
            }

            const startOffset = match.index + prefix.length;
            matches.push({startOffset, endOffset: startOffset + literal.length, color});
        }
    }

    private findRgbColors(text: string, matches: IColorMatch[]): void {
        COLOR_RGB_REGEX.lastIndex = 0;
        let match: RegExpExecArray | null;
        while (match = COLOR_RGB_REGEX.exec(text)) {
            const color = this.parseRgb(match[0]);
            if (!color) {
                continue;
            }

            matches.push({startOffset: match.index, endOffset: match.index + match[0].length, color});
        }
    }

    private findHslColors(text: string, matches: IColorMatch[]): void {
        COLOR_HSL_REGEX.lastIndex = 0;
        let match: RegExpExecArray | null;
        while (match = COLOR_HSL_REGEX.exec(text)) {
            const color = this.parseHsl(match[0]);
            if (!color) {
                continue;
            }

            matches.push({startOffset: match.index, endOffset: match.index + match[0].length, color});
        }
    }

    private findCssColorNames(text: string, matches: IColorMatch[]): void {
        CSS_COLOR_NAME_REGEX.lastIndex = 0;
        let match: RegExpExecArray | null;
        while (match = CSS_COLOR_NAME_REGEX.exec(text)) {
            const [, prefix, literal] = match;
            const color = this.parseHex(CSS_COLOR_NAMES[literal.toLowerCase()]);
            if (!color) {
                continue;
            }

            const startOffset = match.index + prefix.length;
            matches.push({startOffset, endOffset: startOffset + literal.length, color});
        }
    }

    private filterOverlapping(matches: IColorMatch[]): IColorMatch[] {
        const sorted = [...matches].sort((a, b) => {
            if (a.startOffset !== b.startOffset) {
                return a.startOffset - b.startOffset;
            }
            
            return b.endOffset - a.endOffset;
        });

        const result: IColorMatch[] = [];
        let prevEnd = -1;
        for (const m of sorted) {
            if (m.startOffset < prevEnd) {
                continue;
            }
            result.push(m);
            prevEnd = m.endOffset;
        }

        return result;
    }

    private parseHex(input: string | undefined): IParsedColor | undefined {
        if (!input) {
            return undefined;
        }

        const value = input.replace('#', '');
        if (value.length === 3) {
            return this.createColor(
                parseInt(value[0] + value[0], 16),
                parseInt(value[1] + value[1], 16),
                parseInt(value[2] + value[2], 16),
                1,
            );
        }

        if (value.length === 6 || value.length === 8) {
            const alpha = value.length === 8 ? parseInt(value.slice(6, 8), 16) / 255 : 1;
            
            return this.createColor(
                parseInt(value.slice(0, 2), 16),
                parseInt(value.slice(2, 4), 16),
                parseInt(value.slice(4, 6), 16),
                alpha,
            );
        }

        return undefined;
    }

    private parseRgb(input: string): IParsedColor | undefined {
        const parts = this.getFunctionParts(input);
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

    private parseHsl(input: string): IParsedColor | undefined {
        const parts = this.getFunctionParts(input);
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

        const rgb = this.hslToRgb(hue, saturation / 100, lightness / 100);
        
        return this.createColor(rgb.red, rgb.green, rgb.blue, alpha);
    }

    private getFunctionParts(input: string): {channels: string[]; alpha?: string} | undefined {
        const body = input.replace(COLOR_FUNCTION_START_REGEX, '').replace(COLOR_FUNCTION_END_REGEX, '').trim();
        if (!body) {
            return undefined;
        }

        if (body.includes(',')) {
            const parts = body.split(',').map((s) => s.trim());
            if ((parts.length !== 3 && parts.length !== 4) || parts.some((s) => s === '')) {
                return undefined;
            }
            
            return {channels: parts.slice(0, 3), alpha: parts[3]};
        }

        const slashParts = body.split('/').map((s) => s.trim());
        if (slashParts.length > 2 || slashParts.some((s) => s === '')) {
            return undefined;
        }

        const channels = slashParts[0].split(COLOR_SPACE_SEPARATOR_REGEX).filter((s) => s !== '');
        if (channels.length !== 3) {
            return undefined;
        }

        return {channels, alpha: slashParts[1]};
    }

    private parseRgbChannel(input: string): number | undefined {
        if (input.endsWith('%')) {
            const percent = this.parsePercent(input);
            
            return percent === undefined ? undefined : Math.round(255 * percent / 100);
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
            
            return percent === undefined ? undefined : percent / 100;
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
        const match = input.match(COLOR_HUE_REGEX);
        if (!match) {
            return undefined;
        }

        const value = Number(match[1]);
        if (!Number.isFinite(value)) {
            return undefined;
        }

        const unit = match[2]?.toLowerCase();
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
        const m = lightness - chroma / 2;

        let r: number; let g: number; let b: number;
        if (huePrime < 1) {
            [r, g, b] = [chroma, x, 0];
        } else if (huePrime < 2) {
            [r, g, b] = [x, chroma, 0];
        } else if (huePrime < 3) {
            [r, g, b] = [0, chroma, x];
        } else if (huePrime < 4) {
            [r, g, b] = [0, x, chroma];
        } else if (huePrime < 5) {
            [r, g, b] = [x, 0, chroma];
        } else {
            [r, g, b] = [chroma, 0, x];
        }

        return {
            red: Math.round((r + m) * 255),
            green: Math.round((g + m) * 255),
            blue: Math.round((b + m) * 255),
            alpha: 1,
        };
    }

    private createColor(red: number, green: number, blue: number, alpha: number): IParsedColor | undefined {
        if (![red, green, blue, alpha].every((v) => Number.isFinite(v))) {
            return undefined;
        }

        return {
            red: Math.round(red),
            green: Math.round(green),
            blue: Math.round(blue),
            alpha: Math.round(alpha * 1000) / 1000,
        };
    }
}
