import {
    IColorFunctionParts,
    IColorHighlightMatch,
    IColorScannerOptions,
    IParsedColor,
} from '../../interfaces';
import {
    C_COLOR_FUNCTION_END_REGEX,
    C_COLOR_FUNCTION_SPACE_SEPARATOR_REGEX,
    C_COLOR_FUNCTION_START_REGEX,
    C_COLOR_HEX_REGEX,
    C_COLOR_HSL_REGEX,
    C_COLOR_HUE_REGEX,
    C_COLOR_RGB_REGEX,
    C_CSS_COLOR_NAMES,
    C_CSS_COLOR_NAME_REGEX,
} from '../../constants';

export default class ColorScanner {
    public scan(text: string, options: IColorScannerOptions): IColorHighlightMatch[] {
        const matches: IColorHighlightMatch[] = [];
        if (options.highlightHex) {
            this.findHexColors(text, matches);
        }

        if (options.highlightRgb) {
            this.findRgbColors(text, matches);
        }

        if (options.highlightHsl) {
            this.findHslColors(text, matches);
        }

        if (options.highlightCssNames) {
            this.findCssColorNames(text, matches);
        }

        return this.filterOverlappingMatches(matches);
    }

    private findHexColors(text: string, matches: IColorHighlightMatch[]): void {
        const regEx = C_COLOR_HEX_REGEX;
        regEx.lastIndex = 0;
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
        const regEx = C_COLOR_RGB_REGEX;
        regEx.lastIndex = 0;
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
        const regEx = C_COLOR_HSL_REGEX;
        regEx.lastIndex = 0;
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
        const regEx = C_CSS_COLOR_NAME_REGEX;
        regEx.lastIndex = 0;
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
        const body = input.replace(C_COLOR_FUNCTION_START_REGEX, '').replace(C_COLOR_FUNCTION_END_REGEX, '').trim();
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

        const channels = slashParts[0].split(C_COLOR_FUNCTION_SPACE_SEPARATOR_REGEX).filter((item) => item !== '');
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
        const match = input.match(C_COLOR_HUE_REGEX);
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
            alpha: Math.round(alpha * 1000) / 1000,
        };
    }
}
