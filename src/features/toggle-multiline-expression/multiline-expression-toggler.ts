import {Position, Range, TextDocument, TextEditorEdit} from 'vscode';
import App from '../../app';
import type {IBracketStackItem, IExpressionMatch, IPreviousToken} from '../../interfaces';
import BracketPair from './bracket-pair';
import SyntaxSupport from './syntax-support';
import TextScanner from './text-scanner';
import {
    C_NEXT_LINE_OPENING_BRACE_REGEX,
    C_SIGNATURE_OPENING_BRACE_REGEX,
    M_ARRAY_TRAILING_COMMA,
    M_FUNCTION_TRAILING_COMMA,
    M_OBJECT_TRAILING_COMMA,
    M_WARNING,
} from '../../constants';

export default class MultilineExpressionToggler {
    private _syntaxSupport: SyntaxSupport;
    private _textScanner: TextScanner;

    public constructor() {
        this._syntaxSupport = new SyntaxSupport();
        this._textScanner = new TextScanner(this._syntaxSupport);
    }

    public proceed(): void {
        const expressionMatch = this.findNearestExpressionMatch();
        if (!expressionMatch) {
            this.showCannotToggleMessage();

            return;
        }

        const {bracketPair} = expressionMatch;
        const replacement = bracketPair.isSingleLine()
            ? this.expand(expressionMatch)
            : this.collapse(expressionMatch);
        if (replacement === undefined) {
            return;
        }

        const openingBraceOffset = expressionMatch.kind === 'function'
            ? this.getNextLineOpeningBraceOffset(bracketPair)
            : null;
        App.instance.editor.edit((editBuilder: TextEditorEdit) => {
            editBuilder.replace(
                this.getReplacementRange(bracketPair, openingBraceOffset),
                this.getReplacementText(replacement, bracketPair, openingBraceOffset),
            );
        });
    }

    private findNearestExpressionMatch(): IExpressionMatch | undefined {
        const bracketPair = this.findNearestBracketPair();

        return bracketPair ? this.classifyBracketPair(bracketPair) : undefined;
    }

    private findNearestBracketPair(): BracketPair | undefined {
        const {document, selection} = App.instance.editor;
        const cursorOffset = document.offsetAt(selection.active);
        const text = document.getText();
        if (this._textScanner.isOffsetInSkippedRange(text, cursorOffset, document.languageId)) {
            return undefined;
        }

        const stack: IBracketStackItem[] = [];
        let targetStackItem: IBracketStackItem | undefined;
        let isTargetCaptured = false;
        let nearestBracketPair: BracketPair | undefined;
        this._textScanner.scan(text, (character, offset) => {
            if (this._syntaxSupport.isOpenBracket(character)) {
                stack.push({bracket: character, offset});
                if (offset >= cursorOffset && !isTargetCaptured) {
                    targetStackItem = stack[stack.length - 1];
                    isTargetCaptured = true;
                }

                return;
            }

            if (offset >= cursorOffset && !isTargetCaptured) {
                targetStackItem = stack[stack.length - 1];
                isTargetCaptured = true;
                if (!targetStackItem) {
                    return false;
                }
            }

            if (!this._syntaxSupport.isCloseBracket(character)) {
                return;
            }

            const stackItem = stack.pop();
            if (!stackItem || this._syntaxSupport.getCloseBracket(stackItem.bracket) !== character) {
                return;
            }

            if (targetStackItem && stackItem.offset === targetStackItem.offset) {
                nearestBracketPair = new BracketPair(stackItem.bracket, character, stackItem.offset, offset);

                return false;
            }

            return undefined;
        }, {languageId: document.languageId});
я 
        return nearestBracketPair;
    }

    private classifyBracketPair(bracketPair: BracketPair): IExpressionMatch | undefined {
        const {document} = App.instance.editor;
        const text = document.getText();
        if (bracketPair.open === '(') {
            return this.classifyParentheses(bracketPair, text, document.languageId);
        }

        if (bracketPair.open === '[') {
            return this.classifySquareBrackets(bracketPair, text);
        }

        if (bracketPair.open === '{') {
            return this.classifyBraces(bracketPair, text, document.languageId);
        }

        return undefined;
    }

    private classifyParentheses(
        bracketPair: BracketPair,
        text: string,
        languageId: string,
    ): IExpressionMatch | undefined {
        const previousToken = this.getPreviousToken(text, bracketPair.startOffset);
        const normalizedToken = this.normalizeToken(previousToken?.value ?? '');
        if (this._syntaxSupport.isPhp(languageId) && normalizedToken === 'array') {
            return {bracketPair, kind: 'array'};
        }

        if (previousToken
            && !previousToken.value.startsWith('$')
            && this._syntaxSupport.isControlKeyword(normalizedToken)
            && !this.isPropertyAccessToken(text, previousToken)
        ) {
            return undefined;
        }

        if (this.isArrowFunctionParameters(bracketPair, text)
            || this.isCallableOrDeclarationParentheses(text, bracketPair.startOffset)
        ) {
            return {bracketPair, kind: 'function'};
        }

        return undefined;
    }

    private classifySquareBrackets(bracketPair: BracketPair, text: string): IExpressionMatch | undefined {
        if (this.isIndexAccessBracket(text, bracketPair.startOffset)) {
            return undefined;
        }

        return {bracketPair, kind: 'array'};
    }

    private classifyBraces(
        bracketPair: BracketPair,
        text: string,
        languageId: string,
    ): IExpressionMatch | undefined {
        if (!this._syntaxSupport.isJavaScriptLike(languageId)
            || this.isTypeBraceContext(text, bracketPair.startOffset)
            || !this.isObjectLiteralBrace(text, bracketPair.startOffset)
        ) {
            return undefined;
        }

        return {bracketPair, kind: 'object'};
    }

    private expand(expressionMatch: IExpressionMatch): string {
        const {document} = App.instance.editor;
        const {bracketPair} = expressionMatch;
        const text = document.getText();
        const innerText = bracketPair.innerText(text);
        const items = this.splitTopLevelItems(innerText, document.languageId);
        const baseIndent = this.getLineIndent(document, document.positionAt(bracketPair.startOffset));
        const itemIndent = baseIndent + this.getIndentUnit();
        const trailingComma = this.shouldAddTrailingComma(document, expressionMatch, items);
        if (items.length === 0) {
            return `${bracketPair.open}\n${baseIndent}${bracketPair.close}`;
        }

        const itemLines = items.map((item, index) => {
            const shouldAddComma = index < items.length - 1 || trailingComma;
            const comma = shouldAddComma && !item.endsWith(',') ? ',' : '';

            return `${itemIndent}${item.replace(/,$/, '')}${comma}`;
        });

        return [
            bracketPair.open,
            ...itemLines,
            `${baseIndent}${bracketPair.close}`,
        ].join(document.eol === 1 ? '\n' : '\r\n');
    }

    private collapse(expressionMatch: IExpressionMatch): string | undefined {
        const {document} = App.instance.editor;
        const {bracketPair} = expressionMatch;
        const text = document.getText();
        const innerText = bracketPair.innerText(text);
        if (this._textScanner.containsLineComment(innerText, document.languageId)) {
            App.instance.showMessage('Cannot collapse expression with line comments.', M_WARNING);

            return undefined;
        }

        const items = this.splitTopLevelItems(innerText, document.languageId);
        if (items.some((item) => /\r|\n/.test(item))) {
            App.instance.showMessage('Cannot collapse expression with multiline nested items.', M_WARNING);

            return undefined;
        }

        const collapsedItems = items.map((item) => item.replace(/,$/, '').trim());

        return `${bracketPair.open}${collapsedItems.join(', ')}${bracketPair.close}`;
    }

    private getNextLineOpeningBraceOffset(bracketPair: BracketPair): number | null {
        if (bracketPair.open !== '(') {
            return null;
        }

        const {document} = App.instance.editor;
        const textAfterBracketPair = document.getText().substring(bracketPair.endOffset + 1);
        const match = textAfterBracketPair.match(C_SIGNATURE_OPENING_BRACE_REGEX);
        if (!match) {
            return null;
        }

        return bracketPair.endOffset + match[0].length;
    }

    private getReplacementRange(bracketPair: BracketPair, openingBraceOffset: number | null): Range {
        if (openingBraceOffset === null) {
            return bracketPair.range();
        }

        const {document} = App.instance.editor;

        return new Range(
            document.positionAt(bracketPair.startOffset),
            document.positionAt(openingBraceOffset + 1),
        );
    }

    private getReplacementText(
        replacement: string,
        bracketPair: BracketPair,
        openingBraceOffset: number | null,
    ): string {
        if (openingBraceOffset === null) {
            return replacement;
        }

        const {document} = App.instance.editor;
        const textAfterBracketPair = document.getText().substring(bracketPair.endOffset + 1, openingBraceOffset);
        const signatureSuffix = textAfterBracketPair.replace(C_NEXT_LINE_OPENING_BRACE_REGEX, '').trimEnd();

        return `${replacement}${signatureSuffix} {`;
    }

    private splitTopLevelItems(text: string, languageId: string): string[] {
        const items: string[] = [];
        let itemStartOffset = 0;
        let bracketDepth = 0;
        this._textScanner.scan(text, (character, offset) => {
            if (this._syntaxSupport.isOpenBracket(character)) {
                bracketDepth++;

                return;
            }

            if (this._syntaxSupport.isCloseBracket(character)) {
                bracketDepth--;

                return;
            }

            if (character === ',' && bracketDepth === 0) {
                const item = text.substring(itemStartOffset, offset).trim();
                if (item) {
                    items.push(item);
                }
                itemStartOffset = offset + 1;
            }
        }, {languageId});

        const lastItem = text.substring(itemStartOffset).trim();
        if (lastItem) {
            items.push(lastItem);
        }

        return items;
    }

    private shouldAddTrailingComma(
        document: TextDocument,
        expressionMatch: IExpressionMatch,
        items: string[],
    ): boolean {
        if (items.length === 0
            || !this._syntaxSupport.isTrailingCommaSupported(document.languageId, expressionMatch.kind)
        ) {
            return false;
        }

        if (expressionMatch.kind === 'function' && this.isRestLikeItem(items[items.length - 1])) {
            return false;
        }

        if (expressionMatch.kind === 'function') {
            return App.instance.config(M_FUNCTION_TRAILING_COMMA, false);
        }

        if (expressionMatch.kind === 'array') {
            return App.instance.config(M_ARRAY_TRAILING_COMMA, true);
        }

        return App.instance.config(M_OBJECT_TRAILING_COMMA, true);
    }

    private isRestLikeItem(item: string): boolean {
        return item.trim().startsWith('...');
    }

    private getLineIndent(document: TextDocument, position: Position): string {
        const lineText = document.lineAt(position.line).text;
        const indent = lineText.match(/^\s*/);

        return indent ? indent[0] : '';
    }

    private getIndentUnit(): string {
        const {options} = App.instance.editor;
        const tabSize = typeof options.tabSize === 'number' ? options.tabSize : 4;

        return options.insertSpaces ? ' '.repeat(tabSize) : '\t';
    }

    private isArrowFunctionParameters(bracketPair: BracketPair, text: string): boolean {
        return /^\s*(?::[^{=\r\n]+)?=>/.test(text.substring(bracketPair.endOffset + 1));
    }

    private isCallableOrDeclarationParentheses(text: string, startOffset: number): boolean {
        const previousCharacter = this.getPreviousNonWhitespaceCharacter(text, startOffset);

        return previousCharacter !== undefined && /[A-Za-z0-9_$\]\)}]/.test(previousCharacter);
    }

    private isIndexAccessBracket(text: string, startOffset: number): boolean {
        const previousToken = this.getPreviousToken(text, startOffset);
        if (previousToken && this._syntaxSupport.isExpressionPrefixKeyword(this.normalizeToken(previousToken.value))) {
            return false;
        }

        const before = text.substring(0, startOffset).trimEnd();
        if (before.endsWith('=>')) {
            return false;
        }

        const previousCharacter = this.getPreviousNonWhitespaceCharacter(text, startOffset);

        return previousCharacter !== undefined && /[\w$'"\]\)}`>]/.test(previousCharacter);
    }

    private isObjectLiteralBrace(text: string, startOffset: number): boolean {
        const previousToken = this.getPreviousToken(text, startOffset);
        if (previousToken && this._syntaxSupport.isExpressionPrefixKeyword(this.normalizeToken(previousToken.value))) {
            return true;
        }

        const before = text.substring(0, startOffset).trimEnd();
        if (!before || before.endsWith('=>')) {
            return false;
        }

        const previousCharacter = before[before.length - 1];

        return ['=', '(', '[', '{', ',', ':', '?'].includes(previousCharacter);
    }

    private isTypeBraceContext(text: string, startOffset: number): boolean {
        const linePrefix = this.getCurrentLinePrefix(text, startOffset);

        return /\btype\s+[A-Za-z_$][\w$]*(?:<[^>]*>)?\s*=\s*$/.test(linePrefix)
            || /\)\s*:\s*$/.test(linePrefix)
            || /\b(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*:\s*$/.test(linePrefix);
    }

    private getCurrentLinePrefix(text: string, offset: number): string {
        const previousLineBreakOffset = Math.max(
            text.lastIndexOf('\n', offset - 1),
            text.lastIndexOf('\r', offset - 1),
        );

        return text.substring(previousLineBreakOffset + 1, offset);
    }

    private getPreviousToken(text: string, offset: number): IPreviousToken | undefined {
        const before = text.substring(0, offset).trimEnd();
        const match = before.match(/[A-Za-z_$][\w$]*$/);
        if (!match) {
            return undefined;
        }

        return {
            value: match[0],
            startOffset: before.length - match[0].length,
        };
    }

    private isPropertyAccessToken(text: string, token: IPreviousToken): boolean {
        const beforeToken = text.substring(0, token.startOffset).trimEnd();

        return beforeToken.endsWith('.') || beforeToken.endsWith('->') || beforeToken.endsWith('::');
    }

    private getPreviousNonWhitespaceCharacter(text: string, offset: number): string | undefined {
        const before = text.substring(0, offset).trimEnd();

        return before ? before[before.length - 1] : undefined;
    }

    private normalizeToken(token: string): string {
        return token.replace(/^\$/, '').toLowerCase();
    }

    private showCannotToggleMessage(): void {
        App.instance.showMessage('Cannot toggle multiline expression at cursor.', M_WARNING);
    }
}
