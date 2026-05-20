/* commands */
export const CMD_TOGGLE_QUOTES = 'advanced-code-toolkit.toggle-quotes';

export const CMD_TOGGLE_CASE = 'advanced-code-toolkit.toggle-case';
export const CMD_TOGGLE_CASE_CAMEL = 'advanced-code-toolkit.toggle-case-camel';
export const CMD_TOGGLE_CASE_CONSTANT = 'advanced-code-toolkit.toggle-case-constant';
export const CMD_TOGGLE_CASE_DOT = 'advanced-code-toolkit.toggle-case-dot';
export const CMD_TOGGLE_CASE_KEBAB = 'advanced-code-toolkit.toggle-case-kebab';
export const CMD_TOGGLE_CASE_LOWER = 'advanced-code-toolkit.toggle-case-lower';
export const CMD_TOGGLE_CASE_LOWER_FIRST = 'advanced-code-toolkit.toggle-case-lower-first';
export const CMD_TOGGLE_CASE_PASCAL = 'advanced-code-toolkit.toggle-case-pascal';
export const CMD_TOGGLE_CASE_PATH = 'advanced-code-toolkit.toggle-case-path';
export const CMD_TOGGLE_CASE_SENTENCE = 'advanced-code-toolkit.toggle-case-sentence';
export const CMD_TOGGLE_CASE_SNAKE = 'advanced-code-toolkit.toggle-case-snake';
export const CMD_TOGGLE_CASE_SWAP = 'advanced-code-toolkit.toggle-case-swap';
export const CMD_TOGGLE_CASE_TITLE = 'advanced-code-toolkit.toggle-case-title';
export const CMD_TOGGLE_CASE_UPPER = 'advanced-code-toolkit.toggle-case-upper';
export const CMD_TOGGLE_CASE_UPPER_FIRST = 'advanced-code-toolkit.toggle-case-upper-first';

export const CMD_TOGGLE_MULTILINE_EXPRESSION = 'advanced-code-toolkit.toggle-multiline-expression';

export const CMD_INCREMENT_NUMBER = 'advanced-code-toolkit.increment-number';
export const CMD_DECREMENT_NUMBER = 'advanced-code-toolkit.decrement-number';

/* parameters */
export const Q_QUOTES_ORDER = 'toggle-quotes.quotes-order';
export const M_FUNCTION_TRAILING_COMMA = 'toggle-multiline-expression.function-trailing-comma';
export const M_ARRAY_TRAILING_COMMA = 'toggle-multiline-expression.array-trailing-comma';
export const M_OBJECT_TRAILING_COMMA = 'toggle-multiline-expression.object-trailing-comma';

/* messages */
export const M_ERROR = 'error';
export const M_WARNING = 'warning';
export const M_INFO = 'info';

/* toggle case */
export const C_WORD_CHARACTER_REGEX = /([\w_\-\/]+)/;

/* toggle multiline expression */
export const C_SIGNATURE_OPENING_BRACE_REGEX = /^[ \t]*(:[^\r\n{]+)?\r?\n[ \t]*\{/;
export const C_NEXT_LINE_OPENING_BRACE_REGEX = /\r?\n[ \t]*\{$/;

export const C_LABEL_CAMEL = 'camel';
export const C_LABEL_CONSTANT = 'constant';
export const C_LABEL_DOT = 'dot';
export const C_LABEL_KEBAB = 'kebab';
export const C_LABEL_LOWER = 'lower';
export const C_LABEL_LOWER_FIRST = 'lowerFirst';
export const C_LABEL_PASCAL = 'pascal';
export const C_LABEL_PATH = 'path';
export const C_LABEL_SENTENCE = 'sentence';
export const C_LABEL_SNAKE = 'snake';
export const C_LABEL_SWAP = 'swap';
export const C_LABEL_TITLE = 'title';
export const C_LABEL_UPPER = 'upper';
export const C_LABEL_UPPER_FIRST = 'upperFirst';
