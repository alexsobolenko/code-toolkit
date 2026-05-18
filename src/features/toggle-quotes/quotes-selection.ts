import {Position, Selection} from 'vscode';
import {IQuotes, IQuotesChange} from '../../interfaces';

export default class QuotesSelection {
    public constructor(
        private readonly line: number,
        private readonly lineText: string,
        public readonly start: number,
        public readonly end: number,
        public readonly quotes: IQuotes,
    ) {}

    public key(): string {
        return `${this.line}:${this.start}:${this.end}`;
    }

    public innerText(): string {
        return this.lineText.slice(this.start + 1, this.end);
    }

    public length(): number {
        return this.end - this.start;
    }

    public createChange(nextQuotes: IQuotes, nextInnerText: string): IQuotesChange {
        return {
            text: `${nextQuotes.begin}${nextInnerText}${nextQuotes.end}`,
            selection: this.selection(),
        };
    }

    private selection(): Selection {
        return new Selection(
            new Position(this.line, this.start),
            new Position(this.line, this.end + 1),
        );
    }
}
