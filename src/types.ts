export type ColorHighlightMode = 'background' | 'border' | 'dot';

export type StringProcessor = (input: string) => string;

export type ExpressionKind = 'function' | 'array' | 'object';

export type SkippedRangeType = 'string' | 'line-comment' | 'block-comment' | 'regex' | 'heredoc';

export type TextScanCallback = (character: string, offset: number) => boolean | void;
