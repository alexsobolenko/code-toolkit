import {Position, Range, TextDocument, TextEditor, TextEditorEdit, window} from 'vscode';
import {IBracketPair, IBracketStackItem, IExpressionMatch, IPreviousToken} from '../interfaces';
import {
    CONFIG,
    MESSAGE,
    MULTILINE_NEXT_LINE_OPENING_BRACE_REGEX,
    MULTILINE_SAME_LINE_OPENING_BRACE_REGEX,
    MULTILINE_SIGNATURE_OPENING_BRACE_REGEX,
} from '../constants';
import Feature from '../feature';
import SyntaxAnalyzer from '../service/syntax-analyzer';

export default class MultilineExpressionToggler extends Feature {
    private readonly syntaxAnalyzer = new SyntaxAnalyzer();

    proceed(): void {
        if (!window.activeTextEditor) {
            return;
        }

        const editor = window.activeTextEditor;
        const expressionMatch = this.findNearestExpressionMatch(editor);
        if (!expressionMatch) {
            this.showMessage('Cannot toggle multiline expression at cursor.', MESSAGE.WARNING);

            return;
        }

        const {bracketPair} = expressionMatch;
        const isSingleLine = this.isBracketPairSingleLine(editor.document, bracketPair);
        const replacement = isSingleLine
            ? this.expand(editor, expressionMatch)
            : this.collapse(editor, expressionMatch);
        if (replacement === undefined) {
            return;
        }

        const isFunctionSignature = expressionMatch.kind === 'function' && bracketPair.open === '(';
        const braceOffset = isFunctionSignature
            ? (isSingleLine
                ? this.getNextLineOpeningBraceOffset(editor.document, bracketPair)
                : this.getSameLineOpeningBraceOffset(editor.document, bracketPair))
            : null;

        editor.edit((editBuilder: TextEditorEdit) => {
            editBuilder.replace(
                this.getReplacementRange(editor.document, bracketPair, braceOffset),
                isSingleLine
                    ? this.getMergedBraceReplacementText(editor.document, replacement, bracketPair, braceOffset)
                    : this.getSplitBraceReplacementText(editor.document, replacement, bracketPair, braceOffset),
            );
        });
    }

    private findNearestExpressionMatch(editor: TextEditor): IExpressionMatch | undefined {
        const bracketPair = this.findNearestBracketPair(editor);

        return bracketPair ? this.classifyBracketPair(editor.document, bracketPair) : undefined;
    }

    private findNearestBracketPair(editor: TextEditor): IBracketPair | undefined {
        const {document, selection} = editor;
        const cursorOffset = document.offsetAt(selection.active);
        const text = document.getText();
        if (this.syntaxAnalyzer.isOffsetInComment(text, cursorOffset, document.languageId)) {
            return undefined;
        }

        const stack: IBracketStackItem[] = [];
        let targetStackItem: IBracketStackItem | undefined;
        let isTargetCaptured = false;
        let nearestBracketPair: IBracketPair | undefined;
        this.syntaxAnalyzer.scan(text, (character, offset) => {
            if (this.syntaxAnalyzer.isOpenBracket(character)) {
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

            if (!this.syntaxAnalyzer.isCloseBracket(character)) {
                return;
            }

            const stackItem = stack.pop();
            if (!stackItem || this.syntaxAnalyzer.getCloseBracket(stackItem.bracket) !== character) {
                return;
            }

            if (targetStackItem && stackItem.offset === targetStackItem.offset) {
                nearestBracketPair = {
                    open: stackItem.bracket,
                    close: character,
                    startOffset: stackItem.offset,
                    endOffset: offset,
                };

                return false;
            }

            return undefined;
        }, {languageId: document.languageId});

        return nearestBracketPair;
    }

    private classifyBracketPair(document: TextDocument, bracketPair: IBracketPair): IExpressionMatch | undefined {
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
        bracketPair: IBracketPair,
        text: string,
        languageId: string,
    ): IExpressionMatch | undefined {
        const previousToken = this.getPreviousToken(text, bracketPair.startOffset);
        const normalizedToken = this.normalizeToken(previousToken?.value ?? '');
        if (this.syntaxAnalyzer.isPhp(languageId) && normalizedToken === 'array') {
            return {bracketPair, kind: 'array'};
        }

        if (previousToken
            && !previousToken.value.startsWith('$')
            && this.syntaxAnalyzer.isControlKeyword(normalizedToken)
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

    private classifySquareBrackets(bracketPair: IBracketPair, text: string): IExpressionMatch | undefined {
        if (this.isIndexAccessBracket(text, bracketPair.startOffset)) {
            return undefined;
        }

        return {bracketPair, kind: 'array'};
    }

    private classifyBraces(
        bracketPair: IBracketPair,
        text: string,
        languageId: string,
    ): IExpressionMatch | undefined {
        if (!this.syntaxAnalyzer.isJavaScriptLike(languageId)
            || this.isTypeBraceContext(text, bracketPair.startOffset)
            || !this.isObjectLiteralBrace(text, bracketPair.startOffset)
        ) {
            return undefined;
        }

        return {bracketPair, kind: 'object'};
    }

    private expand(editor: TextEditor, expressionMatch: IExpressionMatch): string {
        const {document} = editor;
        const {bracketPair} = expressionMatch;
        const text = document.getText();
        const innerText = this.getBracketPairInnerText(text, bracketPair);
        const items = this.splitTopLevelItems(innerText, document.languageId);
        const baseIndent = this.getLineIndent(document, document.positionAt(bracketPair.startOffset));
        const itemIndent = baseIndent + this.getIndentUnit(editor);
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

    private collapse(editor: TextEditor, expressionMatch: IExpressionMatch): string | undefined {
        const {document} = editor;
        const {bracketPair} = expressionMatch;
        const text = document.getText();
        const innerText = this.getBracketPairInnerText(text, bracketPair);
        if (this.syntaxAnalyzer.containsLineComment(innerText, document.languageId)) {
            this.showMessage('Cannot collapse expression with line comments.', MESSAGE.WARNING);

            return undefined;
        }

        const items = this.splitTopLevelItems(innerText, document.languageId);
        if (items.some((item) => /\r|\n/.test(item))) {
            this.showMessage('Cannot collapse expression with multiline nested items.', MESSAGE.WARNING);

            return undefined;
        }

        const collapsedItems = items.map((item) => item.replace(/,$/, '').trim());

        return `${bracketPair.open}${collapsedItems.join(', ')}${bracketPair.close}`;
    }

    private getNextLineOpeningBraceOffset(document: TextDocument, bracketPair: IBracketPair): number | null {
        const textAfterBracketPair = document.getText().substring(bracketPair.endOffset + 1);
        const match = textAfterBracketPair.match(MULTILINE_SIGNATURE_OPENING_BRACE_REGEX);
        if (!match) {
            return null;
        }

        return bracketPair.endOffset + match[0].length;
    }

    private getSameLineOpeningBraceOffset(document: TextDocument, bracketPair: IBracketPair): number | null {
        const textAfterBracketPair = document.getText().substring(bracketPair.endOffset + 1);
        const match = textAfterBracketPair.match(MULTILINE_SAME_LINE_OPENING_BRACE_REGEX);
        if (!match) {
            return null;
        }

        return bracketPair.endOffset + match[0].length;
    }

    private getReplacementRange(
        document: TextDocument,
        bracketPair: IBracketPair,
        openingBraceOffset: number | null,
    ): Range {
        if (openingBraceOffset === null) {
            return this.getBracketPairRange(document, bracketPair);
        }

        return new Range(
            document.positionAt(bracketPair.startOffset),
            document.positionAt(openingBraceOffset + 1),
        );
    }

    private getMergedBraceReplacementText(
        document: TextDocument,
        replacement: string,
        bracketPair: IBracketPair,
        openingBraceOffset: number | null,
    ): string {
        if (openingBraceOffset === null) {
            return replacement;
        }

        const textAfterBracketPair = document.getText().substring(bracketPair.endOffset + 1, openingBraceOffset);
        const signatureSuffix = textAfterBracketPair.replace(MULTILINE_NEXT_LINE_OPENING_BRACE_REGEX, '').trimEnd();

        return `${replacement}${signatureSuffix} {`;
    }

    private getSplitBraceReplacementText(
        document: TextDocument,
        replacement: string,
        bracketPair: IBracketPair,
        openingBraceOffset: number | null,
    ): string {
        if (openingBraceOffset === null) {
            return replacement;
        }

        const signatureSuffix = document.getText()
            .substring(bracketPair.endOffset + 1, openingBraceOffset)
            .trim();
        const baseIndent = this.getLineIndent(document, document.positionAt(bracketPair.startOffset));

        return `${replacement}${signatureSuffix}\n${baseIndent}{`;
    }

    private splitTopLevelItems(text: string, languageId: string): string[] {
        const items: string[] = [];
        let itemStartOffset = 0;
        let bracketDepth = 0;
        this.syntaxAnalyzer.scan(text, (character, offset) => {
            if (this.syntaxAnalyzer.isOpenBracket(character)) {
                bracketDepth++;

                return;
            }

            if (this.syntaxAnalyzer.isCloseBracket(character)) {
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
            || !this.syntaxAnalyzer.isTrailingCommaSupported(document.languageId, expressionMatch.kind)
        ) {
            return false;
        }

        if (expressionMatch.kind === 'function' && this.isRestLikeItem(items[items.length - 1])) {
            return false;
        }

        if (expressionMatch.kind === 'function') {
            return this.getConfig(CONFIG.TOGGLE_MULTILINE_EXPRESSION.FUNCTION_TRAILING_COMMA, false);
        }

        if (expressionMatch.kind === 'array') {
            return this.getConfig(CONFIG.TOGGLE_MULTILINE_EXPRESSION.ARRAY_TRAILING_COMMA, true);
        }

        return this.getConfig(CONFIG.TOGGLE_MULTILINE_EXPRESSION.OBJECT_TRAILING_COMMA, true);
    }

    private isRestLikeItem(item: string): boolean {
        return item.trim().startsWith('...');
    }

    private getLineIndent(document: TextDocument, position: Position): string {
        const lineText = document.lineAt(position.line).text;
        const indent = lineText.match(/^\s*/);

        return indent ? indent[0] : '';
    }

    private getIndentUnit(editor: TextEditor): string {
        const {options} = editor;
        const tabSize = typeof options.tabSize === 'number' ? options.tabSize : 4;

        return options.insertSpaces ? ' '.repeat(tabSize) : '\t';
    }

    private isArrowFunctionParameters(bracketPair: IBracketPair, text: string): boolean {
        return /^\s*(?::[^{=\r\n]+)?=>/.test(text.substring(bracketPair.endOffset + 1));
    }

    private isCallableOrDeclarationParentheses(text: string, startOffset: number): boolean {
        const before = text.substring(0, startOffset).trimEnd();
        if (!before) {
            return false;
        }

        const previousCharacter = before[before.length - 1];
        if (/[A-Za-z0-9_$\]\)}]/.test(previousCharacter)) {
            return true;
        }

        return previousCharacter === '>' && this.isGenericTypeArgumentsClose(text, before.length - 1);
    }

    private isGenericTypeArgumentsClose(text: string, closeAngleOffset: number): boolean {
        let depth = 1;
        for (let offset = closeAngleOffset - 1; offset >= 0; offset--) {
            const character = text[offset];
            if (character === ';' || character === '{' || character === '}') {
                return false;
            }

            if (character === '>') {
                depth++;
                continue;
            }

            if (character === '<') {
                depth--;
                if (depth === 0) {
                    const beforeOpenAngle = text[offset - 1];

                    return beforeOpenAngle !== undefined && /[\w$]/.test(beforeOpenAngle);
                }
            }
        }

        return false;
    }

    private isIndexAccessBracket(text: string, startOffset: number): boolean {
        const previousToken = this.getPreviousToken(text, startOffset);
        if (previousToken && this.syntaxAnalyzer.isExpressionPrefixKeyword(this.normalizeToken(previousToken.value))) {
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
        if (previousToken && this.syntaxAnalyzer.isExpressionPrefixKeyword(this.normalizeToken(previousToken.value))) {
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

    private isBracketPairSingleLine(document: TextDocument, bracketPair: IBracketPair): boolean {
        return document.positionAt(bracketPair.startOffset).line === document.positionAt(bracketPair.endOffset).line;
    }

    private getBracketPairRange(document: TextDocument, bracketPair: IBracketPair): Range {
        return new Range(
            document.positionAt(bracketPair.startOffset),
            document.positionAt(bracketPair.endOffset + 1),
        );
    }

    private getBracketPairInnerText(text: string, bracketPair: IBracketPair): string {
        return text.substring(bracketPair.startOffset + 1, bracketPair.endOffset).trim();
    }
}
