export type StringProcessor = (input: string) => string;

/* color highlights */
export type ColorHighlightMode = 'background' | 'border' | 'dot';

/* toggle multiline expression */
export type ExpressionKind = 'function' | 'array' | 'object';
export type SkippedRangeType = 'string' | 'line-comment' | 'block-comment' | 'regex' | 'heredoc';
export type TextScannerCallback = (character: string, offset: number) => boolean | void;
