import {
    DecorationRangeBehavior,
    DecorationRenderOptions,
    Range,
    TextEditor,
    window,
} from 'vscode';
import {CONFIG} from '../constants';
import {IColorDecoration, IParsedColor} from '../interfaces';
import type {ColorHighlightMode} from '../types';
import Feature from '../feature';
import ColorScanner from '../service/color-scanner';

export default class ColorHighlighter extends Feature {
    private readonly decorations = new Map<string, IColorDecoration>();
    private readonly scanner = new ColorScanner();

    update(editor: TextEditor): void {
        if (!this.isEnabled()) {
            return;
        }

        const {document} = editor;
        const text = document.getText();
        const matches = this.scanner.scan(text, {
            hex: this.getConfig(CONFIG.COLOR_HIGHLIGHT.HEX, true),
            rgb: this.getConfig(CONFIG.COLOR_HIGHLIGHT.RGB, true),
            hsl: this.getConfig(CONFIG.COLOR_HIGHLIGHT.HSL, true),
            cssNames: this.getConfig(CONFIG.COLOR_HIGHLIGHT.CSS_NAMES, true),
        });

        for (const match of matches) {
            const startPos = document.positionAt(match.startOffset);
            const endPos = document.positionAt(match.endOffset);
            const item = this.getOrCreateDecoration(match.color);
            item.ranges.push({range: new Range(startPos, endPos)});
        }

        for (const item of this.decorations.values()) {
            editor.setDecorations(item.decoration, item.ranges);
            item.ranges.length = 0;
        }
    }

    resetDecorations(): void {
        for (const item of this.decorations.values()) {
            item.decoration.dispose();
        }
        this.decorations.clear();
    }

    dispose(): void {
        this.resetDecorations();
    }

    private isEnabled(): boolean {
        return this.getConfig(CONFIG.COLOR_HIGHLIGHT.ENABLED, true);
    }

    private getMode(): ColorHighlightMode {
        const mode = this.getConfig<string>(CONFIG.COLOR_HIGHLIGHT.MODE, 'background');
        if (mode === 'background' || mode === 'border' || mode === 'dot') {
            return mode;
        }
        return 'background';
    }

    private getOrCreateDecoration(color: IParsedColor): IColorDecoration {
        const key = `${color.red},${color.green},${color.blue},${this.alphaStr(color.alpha)}`;
        const existing = this.decorations.get(key);
        if (existing) {
            return existing;
        }

        const item: IColorDecoration = {
            decoration: window.createTextEditorDecorationType(this.buildDecorationOptions(color)),
            ranges: [],
        };
        this.decorations.set(key, item);
        return item;
    }

    private buildDecorationOptions(color: IParsedColor): DecorationRenderOptions {
        const options: DecorationRenderOptions = {
            rangeBehavior: DecorationRangeBehavior.ClosedClosed,
        };
        const cssColor = `rgba(${color.red}, ${color.green}, ${color.blue}, ${this.alphaStr(color.alpha)})`;

        switch (this.getMode()) {
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
                    options.border = `1px solid rgb(${color.red}, ${color.green}, ${color.blue})`;
                }
                break;
        }

        return options;
    }

    private getReadableTextColor(color: IParsedColor): string {
        const toLinear = (v: number) => {
            const c = v / 255;
            return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        };
        const luminance = 0.2126 * toLinear(color.red) + 0.7152 * toLinear(color.green) + 0.0722 * toLinear(color.blue);
        return luminance > 0.5 ? '#000000' : '#FFFFFF';
    }

    private alphaStr(alpha: number): string {
        return `${Math.round(alpha * 1000) / 1000}`;
    }
}
