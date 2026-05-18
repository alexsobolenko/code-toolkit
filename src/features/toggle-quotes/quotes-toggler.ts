import {Selection} from 'vscode';
import App from '../../app';
import {M_ERROR, Q_QUOTES_ORDER} from '../../constants';
import {IQuotes, IQuotesChange} from '../../interfaces';
import QuotesSelection from './quotes-selection';

export default class QuotesToggler {
    public proceed(): void {
        let quotesOrder: IQuotes[];

        try {
            quotesOrder = this.getQuotesOrder();
        } catch (e) {
            App.instance.showMessage(e instanceof Error ? e.message : 'An unknown error occurred.', M_ERROR);

            return;
        }

        const changes: IQuotesChange[] = [];
        const handledPairs = new Set<string>();

        for (const selection of App.instance.editor.selections) {
            const line = App.instance.editor.document.lineAt(selection.start.line);
            const quotesSelection = this.getSelectionQuotes(quotesOrder, line.text, selection)
                ?? this.findSurroundingQuotes(quotesOrder, line.text, selection);

            if (quotesSelection) {
                const currentQuotesIndex = quotesOrder.indexOf(quotesSelection.quotes);
                const nextQuotes = quotesOrder[(currentQuotesIndex + 1) % quotesOrder.length];

                if (handledPairs.has(quotesSelection.key())) {
                    continue;
                }

                handledPairs.add(quotesSelection.key());

                const nextInnerText = this.prepareInnerText(
                    quotesSelection.innerText(),
                    quotesSelection.quotes,
                    nextQuotes,
                );

                changes.push(quotesSelection.createChange(nextQuotes, nextInnerText));
            } else if (!selection.isEmpty) {
                const [firstQuotes] = quotesOrder;
                const selectedText = App.instance.editor.document.getText(selection);
                const nextInnerText = this.prepareInnerText(selectedText, firstQuotes, firstQuotes);

                changes.push({
                    text: `${firstQuotes.begin}${nextInnerText}${firstQuotes.end}`,
                    selection,
                });
            }
        }

        App.instance.editor.edit((edit) => {
            for (const change of changes) {
                edit.replace(change.selection, change.text);
            }
        });
    }

    private getQuotesOrder(): IQuotes[] {
        const configuredQuotes = App.instance.config(Q_QUOTES_ORDER, ['\'', '"', '`']);
        const quotesOrder: IQuotes[] = [];
        for (const configuredQuote of configuredQuotes) {
            if (typeof configuredQuote !== 'string') {
                throw Error('Wrong chars array quotes pair format.');
            }

            if (configuredQuote.length === 1) {
                quotesOrder.push({begin: configuredQuote, end: configuredQuote});
            } else {
                const match = configuredQuote.match(/^(.),(.)$/);
                if (!match) {
                    throw Error('Wrong chars array quotes pair format.');
                }

                quotesOrder.push({begin: match[1], end: match[2]});
            }
        }

        if (quotesOrder.length < 2) {
            throw Error('Wrong chars array quotes pair format.');
        }

        return quotesOrder;
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
    ): QuotesSelection | undefined {
        if (selection.isEmpty || selection.start.line !== selection.end.line) {
            return undefined;
        }

        const start = selection.start.character;
        const end = selection.end.character - 1;
        const foundQuotes = quotesOrder.find((quotes) => {
            return quotes.begin === lineText[start] && quotes.end === lineText[end];
        });

        return foundQuotes ? new QuotesSelection(selection.start.line, lineText, start, end, foundQuotes) : undefined;
    }

    private findSurroundingQuotes(
        quotesOrder: IQuotes[],
        lineText: string,
        selection: Selection,
    ): QuotesSelection | undefined {
        let closestSelection: QuotesSelection | undefined;

        for (const quotes of quotesOrder) {
            const start = this.findOpeningQuote(lineText, selection.start.character, quotes);
            const end = this.findClosingQuote(lineText, selection.end.character, quotes);

            if (start === -1 || end === -1) {
                continue;
            }

            const quotesSelection = new QuotesSelection(selection.start.line, lineText, start, end, quotes);

            if (!closestSelection || quotesSelection.length() < closestSelection.length()) {
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
