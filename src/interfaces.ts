import {Selection} from 'vscode';

/* toggle quotes */
export interface IQuotes {
    begin: string;
    end: string;
}

export interface IQuotesChange {
    text: string;
    selection: Selection;
}
