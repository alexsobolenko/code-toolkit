import {
    DecorationRangeBehavior,
    DecorationRenderOptions,
    Disposable,
    Range,
    TextEditor,
    window,
} from 'vscode';
import {CONFIG} from '../constants';
import {IColorDecoration, IColorScanOptions, IParsedColor} from '../interfaces';
import type {ColorHighlightMode} from '../types';
import Feature from '../feature';
import ColorScanner from '../service/color-scanner';

export default class ColorHighlighter extends Feature implements Disposable {
    private readonly decorations = new Map<string, IColorDecoration>();
    private readonly scanner = new ColorScanner();
    private enabled = true;
    private mode: ColorHighlightMode = 'background';
    private scanOptions: IColorScanOptions = {hex: true, rgb: true, hsl: true, cssNames: true};
    private allowedLanguages: string[] = [];

    constructor() {
        super();
        this.refreshConfig();
    }

    update(editor: TextEditor): void {
        if (!this.enabled || !this.isLanguageAllowed(editor.document.languageId)) {
            return;
        }

        const {document} = editor;
        const scanRange = this.getVisibleScanRange(document, editor.visibleRanges);
        if (!scanRange) {
            return;
        }

        const baseOffset = document.offsetAt(scanRange.start);
        const text = document.getText(scanRange);
        const matches = this.scanner.scan(text, this.scanOptions);
        const usedKeys = new Set<string>();

        for (const match of matches) {
            const startPos = document.positionAt(baseOffset + match.startOffset);
            const endPos = document.positionAt(baseOffset + match.endOffset);
            const item = this.getOrCreateDecoration(match.color);
            usedKeys.add(this.getColorKey(match.color));
            item.ranges.push({range: new Range(startPos, endPos)});
        }

        for (const [key, item] of this.decorations) {
            if (!usedKeys.has(key)) {
                item.decoration.dispose();
                this.decorations.delete(key);
                continue;
            }

            editor.setDecorations(item.decoration, item.ranges);
            item.ranges.length = 0;
        }
    }

    resetDecorations(): void {
        for (const item of this.decorations.values()) {
            item.decoration.dispose();
        }
        this.decorations.clear();
        this.refreshConfig();
    }

    dispose(): void {
        this.resetDecorations();
    }

    private refreshConfig(): void {
        this.enabled = this.getConfig(CONFIG.COLOR_HIGHLIGHT.ENABLED, true);
        this.scanOptions = {
            hex: this.getConfig(CONFIG.COLOR_HIGHLIGHT.HEX, true),
            rgb: this.getConfig(CONFIG.COLOR_HIGHLIGHT.RGB, true),
            hsl: this.getConfig(CONFIG.COLOR_HIGHLIGHT.HSL, true),
            cssNames: this.getConfig(CONFIG.COLOR_HIGHLIGHT.CSS_NAMES, true),
        };

        const mode = this.getConfig<string>(CONFIG.COLOR_HIGHLIGHT.MODE, 'background');
        this.mode = (mode === 'background' || mode === 'border' || mode === 'dot') ? mode : 'background';

        this.allowedLanguages = this.getConfig<string[]>(CONFIG.COLOR_HIGHLIGHT.LANGUAGES, [
            'css', 'scss', 'less', 'sass', 'stylus',
            'html', 'vue', 'svelte',
            'javascript', 'javascriptreact', 'typescript', 'typescriptreact',
            'json', 'jsonc',
            'markdown', 'xml', 'php',
        ]);
    }

    private isLanguageAllowed(languageId: string): boolean {
        return this.allowedLanguages.includes('*') || this.allowedLanguages.includes(languageId);
    }

    private getOrCreateDecoration(color: IParsedColor): IColorDecoration {
        const key = this.getColorKey(color);
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

    private getColorKey(color: IParsedColor): string {
        return `${color.red},${color.green},${color.blue},${this.alphaStr(color.alpha)}`;
    }

    private buildDecorationOptions(color: IParsedColor): DecorationRenderOptions {
        const options: DecorationRenderOptions = {
            rangeBehavior: DecorationRangeBehavior.ClosedClosed,
        };
        const cssColor = `rgba(${color.red}, ${color.green}, ${color.blue}, ${this.alphaStr(color.alpha)})`;

        switch (this.mode) {
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
