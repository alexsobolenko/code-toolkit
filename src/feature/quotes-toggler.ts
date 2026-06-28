import {Position, Selection, window} from 'vscode';
import Feature from '../feature';
import {IQuotes, IQuotesChange, IQuotesSelection} from '../interfaces';
import {CONFIG, MESSAGE} from '../constants';

export default class QuotesToggler extends Feature {
    public proceed(): void {
        if (!window.activeTextEditor) {
            return;
        }

        const configuredQuotes = this.getConfig(CONFIG.TOGGLE_QUOTES.QUOTES_ORDER, ['\'', '"', '`']);
        const quotesOrder: IQuotes[] = [];
        for (const configuredQuote of configuredQuotes) {
            if (typeof configuredQuote !== 'string') {
                this.showMessage('Wrong chars array quotes pair format', MESSAGE.ERROR);
                return;
            }

            if (configuredQuote.length === 1) {
                quotesOrder.push({begin: configuredQuote, end: configuredQuote});
            } else {
                const match = configuredQuote.match(/^(.),(.)$/);
                if (!match) {
                    this.showMessage('Wrong chars array quotes pair format', MESSAGE.ERROR);
                    return;
                }

                quotesOrder.push({begin: match[1], end: match[2]});
            }
        }

        if (quotesOrder.length < 2) {
            this.showMessage('Wrong chars array quotes pair format', MESSAGE.ERROR);
            return;
        }

        const {selections, document} = window.activeTextEditor;
        const changes: IQuotesChange[] = [];
        const handledPairs = new Set<string>();
        for (const selection of selections) {
            const line = document.lineAt(selection.start.line);
            const quotesSelection = this.getSelectionQuotes(quotesOrder, line.text, selection)
                ?? this.findSurroundingQuotes(quotesOrder, line.text, selection);

            if (quotesSelection) {
                const currentQuotesIndex = quotesOrder.indexOf(quotesSelection.quotes);
                const nextQuotes = quotesOrder[(currentQuotesIndex + 1) % quotesOrder.length];
                if (handledPairs.has(`${quotesSelection.line}:${quotesSelection.start}:${quotesSelection.end}`)) {
                    continue;
                }

                handledPairs.add(`${quotesSelection.line}:${quotesSelection.start}:${quotesSelection.end}`);
                const nextInnerText = this.prepareInnerText(
                    quotesSelection.lineText.slice(quotesSelection.start + 1, quotesSelection.end),
                    quotesSelection.quotes,
                    nextQuotes,
                );

                const selection = new Selection(
                    new Position(quotesSelection.line, quotesSelection.start),
                    new Position(quotesSelection.line, quotesSelection.end + 1),
                );
                changes.push({text: `${nextQuotes.begin}${nextInnerText}${nextQuotes.end}`, selection});
            } else if (!selection.isEmpty) {
                const [firstQuotes] = quotesOrder;
                const selectedText = document.getText(selection);
                const nextInnerText = this.prepareInnerText(selectedText, firstQuotes, firstQuotes);

                changes.push({
                    text: `${firstQuotes.begin}${nextInnerText}${firstQuotes.end}`,
                    selection,
                });
            }
        }

        window.activeTextEditor.edit((editBuilder) => {
            for (const change of changes) {
                editBuilder.replace(change.selection, change.text);
            }
        });
    }

    private prepareInnerText(text: string, currentQuotes: IQuotes, nextQuotes: IQuotes): string {
        let result = '';
        for (let i = 0; i < text.length; i++) {
            const character = text[i];
            const nextCharacter = text[i + 1];
            if (character === '\\' && nextCharacter && this.shouldUnescapeQuote(nextCharacter, currentQuotes)) {
                result += nextCharacter;
                i++;
            } else if (this.shouldEscapeQuote(character, nextQuotes)) {
                result += `\\${character}`;
            } else {
                result += character;
            }
        }

        return result;
    }

    private shouldUnescapeQuote(character: string, currentQuotes: IQuotes): boolean {
        return this.isEscapableQuote(character)
            && (character === currentQuotes.begin || character === currentQuotes.end);
    }

    private shouldEscapeQuote(character: string, nextQuotes: IQuotes): boolean {
        return this.isEscapableQuote(character)
            && (character === nextQuotes.begin || character === nextQuotes.end);
    }

    private isEscapableQuote(character: string): boolean {
        return character === '\'' || character === '"';
    }

    private getSelectionQuotes(
        quotesOrder: IQuotes[],
        lineText: string,
        selection: Selection,
    ): IQuotesSelection | undefined {
        if (selection.isEmpty || selection.start.line !== selection.end.line) {
            return undefined;
        }

        const start = selection.start.character;
        const end = selection.end.character - 1;
        const quotes = quotesOrder.find((quotes) => {
            return quotes.begin === lineText[start] && quotes.end === lineText[end];
        });

        return quotes ? {line: selection.start.line, lineText, start, end, quotes} : undefined;
    }

    private findSurroundingQuotes(
        quotesOrder: IQuotes[],
        lineText: string,
        selection: Selection,
    ): IQuotesSelection | undefined {
        let closestSelection: IQuotesSelection | undefined;
        for (const quotes of quotesOrder) {
            const start = this.findOpeningQuote(lineText, selection.start.character, quotes);
            const end = this.findClosingQuote(lineText, selection.end.character, quotes);
            if (start === -1 || end === -1) {
                continue;
            }

            const quotesSelection = {line: selection.start.line, lineText, start, end, quotes};
            const quotesSelectionLength = quotesSelection.end - quotesSelection.start;
            const closestSelectionLength = (closestSelection?.end || 0) - (closestSelection?.start || 0);
            if (!closestSelection || quotesSelectionLength < closestSelectionLength) {
                closestSelection = quotesSelection;
            }
        }

        return closestSelection;
    }

    private findOpeningQuote(lineText: string, offset: number, quotes: IQuotes): number {
        for (let i = offset - 1; i > -1; i--) {
            if (lineText[i] === quotes.begin && !this.isEscaped(lineText, i)) {
                return i;
            }
        }

        return -1;
    }

    private findClosingQuote(lineText: string, offset: number, quotes: IQuotes): number {
        for (let i = offset; i < lineText.length; i++) {
            if (lineText[i] === quotes.end && !this.isEscaped(lineText, i)) {
                return i;
            }
        }

        return -1;
    }

    private isEscaped(lineText: string, offset: number): boolean {
        const previousCharacter = offset > 0 ? lineText[offset - 1] : null;

        return previousCharacter === '\\';
    }
}
