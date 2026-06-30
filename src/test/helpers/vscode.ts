import Module = require('node:module');

type ModuleWithLoad = typeof Module & {
    _load(request: string, parent: NodeJS.Module | null, isMain: boolean): unknown;
};

interface IVscodeMockOptions {
    commands?: Record<string, unknown>;
    extensions?: Record<string, unknown>;
    window?: Record<string, unknown>;
    workspace?: Record<string, unknown>;
}

export class Position {
    public constructor(
        public readonly line: number,
        public readonly character: number,
    ) {}

    public isEqual(other: Position): boolean {
        return this.line === other.line && this.character === other.character;
    }
}

export class Range {
    public readonly start: Position;
    public readonly end: Position;

    public constructor(start: Position, end: Position);
    public constructor(startLine: number, startCharacter: number, endLine: number, endCharacter: number);
    public constructor(
        startOrLine: Position | number,
        startCharacterOrEnd: Position | number,
        endLine?: number,
        endCharacter?: number,
    ) {
        if (startOrLine instanceof Position && startCharacterOrEnd instanceof Position) {
            this.start = startOrLine;
            this.end = startCharacterOrEnd;

            return;
        }

        this.start = new Position(startOrLine as number, startCharacterOrEnd as number);
        this.end = new Position(endLine as number, endCharacter as number);
    }

    public get isSingleLine(): boolean {
        return this.start.line === this.end.line;
    }
}

export class Selection extends Range {
    public readonly anchor: Position;
    public readonly active: Position;

    public constructor(anchor: Position, active: Position);
    public constructor(anchorLine: number, anchorCharacter: number, activeLine: number, activeCharacter: number);
    public constructor(
        anchorOrLine: Position | number,
        anchorCharacterOrActive: Position | number,
        activeLine?: number,
        activeCharacter?: number,
    ) {
        if (anchorOrLine instanceof Position && anchorCharacterOrActive instanceof Position) {
            super(anchorOrLine, anchorCharacterOrActive);
            this.anchor = anchorOrLine;
            this.active = anchorCharacterOrActive;

            return;
        }

        const anchor = new Position(anchorOrLine as number, anchorCharacterOrActive as number);
        const active = new Position(activeLine as number, activeCharacter as number);
        super(anchor, active);
        this.anchor = anchor;
        this.active = active;
    }

    public get isEmpty(): boolean {
        return this.start.isEqual(this.end);
    }
}

export class FakeDocument {
    private readonly lineStarts: number[] = [0];
    public readonly eol = 1;

    public constructor(
        private readonly text: string,
        public readonly languageId: string = 'plaintext',
    ) {
        for (let offset = 0; offset < text.length; offset++) {
            if (text[offset] === '\n') {
                this.lineStarts.push(offset + 1);
            }
        }
    }

    public getText(range?: Range): string {
        if (!range) {
            return this.text;
        }

        return this.text.substring(this.offsetAt(range.start), this.offsetAt(range.end));
    }

    public positionAt(offset: number): Position {
        let line = 0;
        for (let index = 0; index < this.lineStarts.length; index++) {
            if (this.lineStarts[index] > offset) {
                break;
            }
            line = index;
        }

        return new Position(line, offset - this.lineStarts[line]);
    }

    public offsetAt(position: Position): number {
        return this.lineStarts[position.line] + position.character;
    }

    public lineAt(line: number): {text: string, range: Range} {
        const start = this.lineStarts[line];
        const nextStart = this.lineStarts[line + 1] ?? this.text.length + 1;
        const end = Math.min(nextStart - 1, this.text.length);
        const text = this.text.substring(start, end);

        return {
            text,
            range: new Range(line, 0, line, text.length),
        };
    }

    public getWordRangeAtPosition(position: Position): Range | undefined {
        const lineText = this.lineAt(position.line).text;
        let start = position.character;
        let end = position.character;

        while (start > 0 && /\w/.test(lineText[start - 1])) {
            start--;
        }

        while (end < lineText.length && /\w/.test(lineText[end])) {
            end++;
        }

        return start === end ? undefined : new Range(position.line, start, position.line, end);
    }
}

export interface IRecordedEdit {
    range: Range;
    text: string;
}

export class EditRecorder {
    public readonly replacements: IRecordedEdit[] = [];

    public replace(range: Range, text: string): void {
        this.replacements.push({range, text});
    }
}

export function installVscodeMock(options: IVscodeMockOptions = {}): () => void {
    const moduleWithLoad = Module as ModuleWithLoad;
    const originalLoad = moduleWithLoad._load;
    const vscodeMock = {
        commands: {
            registerCommand: () => ({dispose: () => undefined}),
            ...options.commands,
        },
        DecorationRangeBehavior: {
            ClosedClosed: 0,
        },
        extensions: {
            all: [],
            onDidChange: () => ({dispose: () => undefined}),
            ...options.extensions,
        },
        Position,
        Range,
        Selection,
        Uri: {
            file: (path: string) => ({fsPath: path}),
        },
        window: Object.defineProperties({
            activeTextEditor: {},
            createTextEditorDecorationType: (style: unknown) => ({
                style,
                disposed: false,
                dispose() {
                    this.disposed = true;
                },
            }),
            showErrorMessage: () => undefined,
            showInformationMessage: () => undefined,
            showWarningMessage: () => undefined,
            onDidChangeActiveTextEditor: () => ({dispose: () => undefined}),
            showQuickPick: () => Promise.resolve(undefined),
        }, Object.getOwnPropertyDescriptors(options.window ?? {})),
        workspace: {
            fs: {
                readFile: async () => new Uint8Array(),
            },
            getConfiguration: () => ({
                get: (_key: string, defaultValue: unknown) => defaultValue,
            }),
            onDidChangeConfiguration: () => ({dispose: () => undefined}),
            onDidChangeTextDocument: () => ({dispose: () => undefined}),
            ...options.workspace,
        },
    };

    moduleWithLoad._load = function load(request: string, parent: NodeJS.Module | null, isMain: boolean): unknown {
        if (request === 'vscode') {
            return vscodeMock;
        }

        return originalLoad.call(this, request, parent, isMain);
    };

    return () => {
        moduleWithLoad._load = originalLoad;
    };
}
