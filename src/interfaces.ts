import {DecorationOptions, Range, Selection, TextEditorDecorationType} from 'vscode';

export interface IParsedColor {
    red: number;
    green: number;
    blue: number;
    alpha: number;
}

export interface IColorMatch {
    startOffset: number;
    endOffset: number;
    color: IParsedColor;
}

export interface IColorScanOptions {
    hex: boolean;
    rgb: boolean;
    hsl: boolean;
    cssNames: boolean;
}

export interface IColorDecoration {
    decoration: TextEditorDecorationType;
    ranges: DecorationOptions[];
}

export interface ICommentConfig {
    lineComment?: string | string[];
    blockComment?: [string, string];
}

export interface ICommentTag {
    tag: string;
    escapedTag: string;
    decoration: TextEditorDecorationType;
    ranges: DecorationOptions[];
}

export interface ILanguageState {
    supported: boolean;
    isPlainText: boolean;
    ignoreFirstLine: boolean;
    highlightSingleLine: boolean;
    highlightJSDoc: boolean;
    delimiter: string;
    blockCommentStart: string;
    blockCommentEnd: string;
    expression: string;
}

export interface INumberChangeAction {
    range: Range;
    replacement: string;
}
export interface IQuotes {
    begin: string;
    end: string;
}

export interface IQuotesChange {
    text: string;
    selection: Selection;
}

export interface IQuotesSelection {
    line: number;
    lineText: string;
    start: number;
    end: number;
    quotes: IQuotes;
}
