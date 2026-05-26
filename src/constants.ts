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

/* toggle multiline expression */
export const C_SIGNATURE_OPENING_BRACE_REGEX = /^[ \t]*(:[^\r\n{]+)?\r?\n[ \t]*\{/;
export const C_NEXT_LINE_OPENING_BRACE_REGEX = /\r?\n[ \t]*\{$/;

/* color highlights */
export const C_CSS_COLOR_NAMES: Record<string, string> = {
    aliceblue: '#f0f8ff',
    antiquewhite: '#faebd7',
    aqua: '#00ffff',
    aquamarine: '#7fffd4',
    azure: '#f0ffff',
    beige: '#f5f5dc',
    bisque: '#ffe4c4',
    black: '#000000',
    blanchedalmond: '#ffebcd',
    blue: '#0000ff',
    blueviolet: '#8a2be2',
    brown: '#a52a2a',
    burlywood: '#deb887',
    cadetblue: '#5f9ea0',
    chartreuse: '#7fff00',
    chocolate: '#d2691e',
    coral: '#ff7f50',
    cornflowerblue: '#6495ed',
    cornsilk: '#fff8dc',
    crimson: '#dc143c',
    cyan: '#00ffff',
    darkblue: '#00008b',
    darkcyan: '#008b8b',
    darkgoldenrod: '#b8860b',
    darkgray: '#a9a9a9',
    darkgreen: '#006400',
    darkgrey: '#a9a9a9',
    darkkhaki: '#bdb76b',
    darkmagenta: '#8b008b',
    darkolivegreen: '#556b2f',
    darkorange: '#ff8c00',
    darkorchid: '#9932cc',
    darkred: '#8b0000',
    darksalmon: '#e9967a',
    darkseagreen: '#8fbc8f',
    darkslateblue: '#483d8b',
    darkslategray: '#2f4f4f',
    darkslategrey: '#2f4f4f',
    darkturquoise: '#00ced1',
    darkviolet: '#9400d3',
    deeppink: '#ff1493',
    deepskyblue: '#00bfff',
    dimgray: '#696969',
    dimgrey: '#696969',
    dodgerblue: '#1e90ff',
    firebrick: '#b22222',
    floralwhite: '#fffaf0',
    forestgreen: '#228b22',
    fuchsia: '#ff00ff',
    gainsboro: '#dcdcdc',
    ghostwhite: '#f8f8ff',
    gold: '#ffd700',
    goldenrod: '#daa520',
    gray: '#808080',
    green: '#008000',
    greenyellow: '#adff2f',
    grey: '#808080',
    honeydew: '#f0fff0',
    hotpink: '#ff69b4',
    indianred: '#cd5c5c',
    indigo: '#4b0082',
    ivory: '#fffff0',
    khaki: '#f0e68c',
    lavender: '#e6e6fa',
    lavenderblush: '#fff0f5',
    lawngreen: '#7cfc00',
    lemonchiffon: '#fffacd',
    lightblue: '#add8e6',
    lightcoral: '#f08080',
    lightcyan: '#e0ffff',
    lightgoldenrodyellow: '#fafad2',
    lightgray: '#d3d3d3',
    lightgreen: '#90ee90',
    lightgrey: '#d3d3d3',
    lightpink: '#ffb6c1',
    lightsalmon: '#ffa07a',
    lightseagreen: '#20b2aa',
    lightskyblue: '#87cefa',
    lightslategray: '#778899',
    lightslategrey: '#778899',
    lightsteelblue: '#b0c4de',
    lightyellow: '#ffffe0',
    lime: '#00ff00',
    limegreen: '#32cd32',
    linen: '#faf0e6',
    magenta: '#ff00ff',
    maroon: '#800000',
    mediumaquamarine: '#66cdaa',
    mediumblue: '#0000cd',
    mediumorchid: '#ba55d3',
    mediumpurple: '#9370db',
    mediumseagreen: '#3cb371',
    mediumslateblue: '#7b68ee',
    mediumspringgreen: '#00fa9a',
    mediumturquoise: '#48d1cc',
    mediumvioletred: '#c71585',
    midnightblue: '#191970',
    mintcream: '#f5fffa',
    mistyrose: '#ffe4e1',
    moccasin: '#ffe4b5',
    navajowhite: '#ffdead',
    navy: '#000080',
    oldlace: '#fdf5e6',
    olive: '#808000',
    olivedrab: '#6b8e23',
    orange: '#ffa500',
    orangered: '#ff4500',
    orchid: '#da70d6',
    palegoldenrod: '#eee8aa',
    palegreen: '#98fb98',
    paleturquoise: '#afeeee',
    palevioletred: '#db7093',
    papayawhip: '#ffefd5',
    peachpuff: '#ffdab9',
    peru: '#cd853f',
    pink: '#ffc0cb',
    plum: '#dda0dd',
    powderblue: '#b0e0e6',
    purple: '#800080',
    rebeccapurple: '#663399',
    red: '#ff0000',
    rosybrown: '#bc8f8f',
    royalblue: '#4169e1',
    saddlebrown: '#8b4513',
    salmon: '#fa8072',
    sandybrown: '#f4a460',
    seagreen: '#2e8b57',
    seashell: '#fff5ee',
    sienna: '#a0522d',
    silver: '#c0c0c0',
    skyblue: '#87ceeb',
    slateblue: '#6a5acd',
    slategray: '#708090',
    slategrey: '#708090',
    snow: '#fffafa',
    springgreen: '#00ff7f',
    steelblue: '#4682b4',
    tan: '#d2b48c',
    teal: '#008080',
    thistle: '#d8bfd8',
    tomato: '#ff6347',
    turquoise: '#40e0d0',
    violet: '#ee82ee',
    wheat: '#f5deb3',
    white: '#ffffff',
    whitesmoke: '#f5f5f5',
    yellow: '#ffff00',
    yellowgreen: '#9acd32',
};
