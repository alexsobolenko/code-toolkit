import type {IHeredocStart, ITextScannerOptions} from '../../interfaces';
import type {SkippedRangeType, TextScannerCallback} from '../../types';
import SyntaxSupport from './syntax-support';

export default class TextScanner {
    private _syntaxSupport: SyntaxSupport;

    public constructor(syntaxSupport: SyntaxSupport) {
        this._syntaxSupport = syntaxSupport;
    }

    public scan(text: string, callback: TextScannerCallback, options: ITextScannerOptions = {}): void {
        const languageId = options.languageId ?? '';

        for (let offset = 0; offset < text.length; offset++) {
            const character = text[offset];
            const nextCharacter = text[offset + 1];

            if (this._syntaxSupport.isPhp(languageId) && text.startsWith('<<<', offset)) {
                const heredocStart = this.getHeredocStart(text, offset);
                if (heredocStart) {
                    const endOffset = this.findHeredocEndOffset(text, heredocStart);
                    if (!this.notifySkippedRange(options, offset, endOffset, 'heredoc')) {
                        return;
                    }
                    offset = endOffset - 1;
                    continue;
                }
            }

            if (character === '/' && nextCharacter === '/') {
                const endOffset = this.findLineEndOffset(text, offset);
                if (options.onLineComment?.(offset, endOffset) === false) {
                    return;
                }
                if (!this.notifySkippedRange(options, offset, endOffset, 'line-comment')) {
                    return;
                }
                offset = endOffset;
                continue;
            }

            if (this._syntaxSupport.isPhp(languageId) && character === '#') {
                const endOffset = this.findLineEndOffset(text, offset);
                if (options.onLineComment?.(offset, endOffset) === false) {
                    return;
                }
                if (!this.notifySkippedRange(options, offset, endOffset, 'line-comment')) {
                    return;
                }
                offset = endOffset;
                continue;
            }

            if (character === '/' && nextCharacter === '*') {
                const endOffset = this.findBlockCommentEndOffset(text, offset);
                if (!this.notifySkippedRange(options, offset, endOffset, 'block-comment')) {
                    return;
                }
                offset = endOffset - 1;
                continue;
            }

            if (character === '\'' || character === '"' || character === '`') {
                const endOffset = this.findStringEndOffset(text, offset, character);
                if (!this.notifySkippedRange(options, offset, endOffset, 'string')) {
                    return;
                }
                offset = endOffset - 1;
                continue;
            }

            if (character === '/' && this.isRegexStart(text, offset, languageId)) {
                const endOffset = this.findRegexEndOffset(text, offset);
                if (endOffset !== undefined) {
                    if (!this.notifySkippedRange(options, offset, endOffset, 'regex')) {
                        return;
                    }
                    offset = endOffset - 1;
                    continue;
                }
            }

            if (callback(character, offset) === false) {
                return;
            }
        }
    }

    public containsLineComment(text: string, languageId: string): boolean {
        let containsLineComment = false;
        this.scan(text, () => undefined, {
            languageId,
            onLineComment: () => {
                containsLineComment = true;

                return false;
            },
        });

        return containsLineComment;
    }

    public isOffsetInSkippedRange(text: string, targetOffset: number, languageId: string): boolean {
        let isOffsetInSkippedRange = false;
        this.scan(text, () => undefined, {
            languageId,
            onSkippedRange: (startOffset, endOffset) => {
                if (startOffset <= targetOffset && targetOffset < endOffset) {
                    isOffsetInSkippedRange = true;

                    return false;
                }

                return undefined;
            },
        });

        return isOffsetInSkippedRange;
    }

    private notifySkippedRange(
        options: ITextScannerOptions,
        startOffset: number,
        endOffset: number,
        type: SkippedRangeType,
    ): boolean {
        return options.onSkippedRange?.(startOffset, endOffset, type) !== false;
    }

    private getHeredocStart(text: string, offset: number): IHeredocStart | undefined {
        const match = text.substring(offset).match(
            /^<<<[ \t]*(?:'([A-Za-z_][A-Za-z0-9_]*)'|"([A-Za-z_][A-Za-z0-9_]*)"|([A-Za-z_][A-Za-z0-9_]*))/,
        );
        if (!match) {
            return undefined;
        }

        const lineEndOffset = this.findLineEndOffset(text, offset);
        const lineBreakEndOffset = this.findLineBreakEndOffset(text, lineEndOffset);

        return {
            label: match[1] ?? match[2] ?? match[3],
            bodyStartOffset: lineBreakEndOffset,
        };
    }

    private findHeredocEndOffset(text: string, heredocStart: IHeredocStart): number {
        let lineStartOffset = heredocStart.bodyStartOffset;
        while (lineStartOffset < text.length) {
            const lineEndOffset = this.findLineEndOffset(text, lineStartOffset);
            const lineText = text.substring(lineStartOffset, lineEndOffset).trim();
            if (lineText === heredocStart.label || lineText === `${heredocStart.label};`) {
                return this.findLineBreakEndOffset(text, lineEndOffset);
            }
            lineStartOffset = this.findLineBreakEndOffset(text, lineEndOffset);
        }

        return text.length;
    }

    private findStringEndOffset(text: string, startOffset: number, quote: string): number {
        for (let offset = startOffset + 1; offset < text.length; offset++) {
            const character = text[offset];
            if (character === '\\') {
                offset++;
                continue;
            }

            if (character === quote) {
                return offset + 1;
            }
        }

        return text.length;
    }

    private findRegexEndOffset(text: string, startOffset: number): number | undefined {
        let isCharacterClass = false;
        for (let offset = startOffset + 1; offset < text.length; offset++) {
            const character = text[offset];
            if (character === '\r' || character === '\n') {
                return undefined;
            }

            if (character === '\\') {
                offset++;
                continue;
            }

            if (character === '[') {
                isCharacterClass = true;
                continue;
            }

            if (character === ']') {
                isCharacterClass = false;
                continue;
            }

            if (character === '/' && !isCharacterClass) {
                let endOffset = offset + 1;
                while (/[a-z]/i.test(text[endOffset] ?? '')) {
                    endOffset++;
                }

                return endOffset;
            }
        }

        return undefined;
    }

    private findBlockCommentEndOffset(text: string, startOffset: number): number {
        const endOffset = text.indexOf('*/', startOffset + 2);

        return endOffset === -1 ? text.length : endOffset + 2;
    }

    private findLineEndOffset(text: string, startOffset: number): number {
        for (let offset = startOffset; offset < text.length; offset++) {
            if (text[offset] === '\r' || text[offset] === '\n') {
                return offset;
            }
        }

        return text.length;
    }

    private findLineBreakEndOffset(text: string, lineEndOffset: number): number {
        if (text[lineEndOffset] === '\r' && text[lineEndOffset + 1] === '\n') {
            return lineEndOffset + 2;
        }

        if (text[lineEndOffset] === '\r' || text[lineEndOffset] === '\n') {
            return lineEndOffset + 1;
        }

        return lineEndOffset;
    }

    private isRegexStart(text: string, offset: number, languageId: string): boolean {
        if (!this._syntaxSupport.isJavaScriptLike(languageId)) {
            return false;
        }

        const before = text.substring(0, offset).trimEnd();
        if (!before) {
            return true;
        }

        const previousCharacter = before[before.length - 1];
        if ('([{=,:;!&|?+-*%^~<>'.includes(previousCharacter)) {
            return true;
        }

        const previousToken = before.match(/[A-Za-z_$][\w$]*$/)?.[0];

        return previousToken ? [
            'await',
            'case',
            'delete',
            'in',
            'instanceof',
            'new',
            'of',
            'return',
            'throw',
            'typeof',
            'void',
            'yield',
        ].includes(previousToken) : false;
    }
}
