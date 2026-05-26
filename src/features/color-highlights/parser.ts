import {
    DecorationRangeBehavior,
    DecorationRenderOptions,
    Range,
    window,
} from 'vscode';
import App from '../../app';
import {IColorHighlightDecoration, IParsedColor} from '../../interfaces';
import Configuration from './configuration';
import ColorScanner from './color-scanner';

export default class Parser {
    public config: Configuration;
    private decorations = new Map<string, IColorHighlightDecoration>();
    private colorScanner = new ColorScanner();

    public constructor(config: Configuration) {
        this.config = config;
    }

    public findColors(): void {
        if (!this.config.enabled) {
            return;
        }

        const {document} = App.instance.editor;
        const text = document.getText();
        const matches = this.colorScanner.scan(text, {
            highlightHex: this.config.highlightHex,
            highlightRgb: this.config.highlightRgb,
            highlightHsl: this.config.highlightHsl,
            highlightCssNames: this.config.highlightCssNames,
        });
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
