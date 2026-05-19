import {Range, Selection} from 'vscode';

/* toggle quotes */
export interface IQuotes {
    begin: string;
    end: string;
}

export interface IQuotesChange {
    text: string;
    selection: Selection;
}

/* toggle case */
export interface ISelectedText {
    text: string | undefined;
    range: Range | undefined;
}
