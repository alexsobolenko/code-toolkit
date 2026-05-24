import {Range, Selection} from 'vscode';
import type BracketPair from './features/toggle-multiline-expression/bracket-pair';
import type {ExpressionKind, SkippedRangeType} from './types';

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

/* toggle multiline expression */
export interface IBracketStackItem {
    bracket: string;
    offset: number;
}

export interface IExpressionMatch {
    bracketPair: BracketPair;
    kind: ExpressionKind;
}

export interface IHeredocStart {
    label: string;
    bodyStartOffset: number;
}

export interface IPreviousToken {
    value: string;
    startOffset: number;
}

export interface ITextScannerOptions {
    languageId?: string;
    onLineComment?: (startOffset: number, endOffset: number) => boolean | void;
    onSkippedRange?: (startOffset: number, endOffset: number, type: SkippedRangeType) => boolean | void;
}

/* comment highlights */
export interface CommentTag {
    tag: string;
    escapedTag: string;
    decoration: any;
    ranges: Array<any>;
}

export interface CommentConfig {
    lineComment?: string;
    blockComment?: [string, string];
}

