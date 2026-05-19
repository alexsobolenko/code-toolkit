import {Position, QuickPickItem, QuickPickOptions, Range, Selection, TextDocument, window} from 'vscode';
import * as changeCase from 'change-case';
import App from '../../app';
import {
    C_LABEL_CAMEL,
    C_LABEL_CONSTANT,
    C_LABEL_DOT,
    C_LABEL_KEBAB,
    C_LABEL_LOWER,
    C_LABEL_LOWER_FIRST,
    C_LABEL_PASCAL,
    C_LABEL_PATH,
    C_LABEL_SENTENCE,
    C_LABEL_SNAKE,
    C_LABEL_SWAP,
    C_LABEL_TITLE,
    C_LABEL_UPPER,
    C_LABEL_UPPER_FIRST,
    C_WORD_CHARACTER_REGEX,
} from '../../constants';
import {ISelectedText} from '../../interfaces';
import CaseTransformCommand from './case-transform-command';
import ReplacementAction from './replacement-action';

export default class CaseToggler {
    private readonly transformCommands: CaseTransformCommand[] = [
        new CaseTransformCommand(
            C_LABEL_CAMEL,
            'Convert to a string with the separators denoted by having the next letter capitalised',
            this.toCamel,
        ),
        new CaseTransformCommand(
            C_LABEL_CONSTANT,
            'Convert to an upper case, underscore separated string',
            this.toConstant,
        ),
        new CaseTransformCommand(
            C_LABEL_DOT,
            'Convert to a lower case, period separated string',
            this.toDot,
        ),
        new CaseTransformCommand(
            C_LABEL_KEBAB,
            'Convert to a lower case, dash separated string',
            this.toKebab,
        ),
        new CaseTransformCommand(
            C_LABEL_LOWER,
            'Convert to a string in lower case',
            this.toLower,
        ),
        new CaseTransformCommand(
            C_LABEL_LOWER_FIRST,
            'Convert to a string with the first character lower cased',
            this.toLowerFirst,
        ),
        new CaseTransformCommand(
            C_LABEL_PASCAL,
            'Convert to a string denoted in the same fashion as camelCase, but with the first letter capitalised',
            this.toPascal,
        ),
        new CaseTransformCommand(
            C_LABEL_PATH,
            'Convert to a lower case, slash separated string',
            this.toPath,
        ),
        new CaseTransformCommand(
            C_LABEL_SENTENCE,
            'Convert to a lower case, space separated string',
            this.toSentence,
        ),
        new CaseTransformCommand(
            C_LABEL_SNAKE,
            'Convert to a lower case, underscore separated string',
            this.toSnake,
        ),
        new CaseTransformCommand(
            C_LABEL_SWAP,
            'Convert to a string with every character case reversed',
            this.toSwap,
        ),
        new CaseTransformCommand(
            C_LABEL_TITLE,
            'Convert to a space separated string with the first character of every word upper cased',
            this.toTitle,
        ),
        new CaseTransformCommand(
            C_LABEL_UPPER,
            'Convert to a string in upper case',
            this.toUpper,
        ),
        new CaseTransformCommand(
            C_LABEL_UPPER_FIRST,
            'Convert to a string with the first character upper cased',
            this.toUpperFirst,
        ),
    ];

    public proceed(caseType: string | null = null): void {
        if (caseType === null) {
            const firstSelectedText = this.getSelectedTextIfOnlyOneSelection();
            const quickPickOptions: QuickPickOptions = {
                matchOnDescription: true,
                placeHolder: 'What do you want to do to the current word / selection(s)?',
            };

            const items: QuickPickItem[] = this.transformCommands.map((command) => {
                const description: string = firstSelectedText
                    ? `Convert to ${command.preview(firstSelectedText)}`
                    : command.description;

                return {label: command.label, description};
            });

            window.showQuickPick(items, quickPickOptions).then((selectedCommand) => {
                if (selectedCommand) {
                    this.proceed(selectedCommand.label);
                }
            });

            return;
        }

        const caseCommand = this.transformCommands.find((command) => command.label === caseType);
        if (!caseCommand) {
            return;
        }

        const {document, selections} = App.instance.editor;
        const replacementActions: ReplacementAction[] = [];
        App.instance.editor.edit((editBuilder) => {
            for (const selection of selections) {
                const selectedText = this.getSelectedText(selection, document);
                const replacementAction = ReplacementAction.create(
                    selectedText,
                    selection,
                    caseCommand.transform,
                );

                if (replacementAction) {
                    replacementActions.push(replacementAction);
                }
            }

            replacementActions
                .filter((replacementAction) => replacementAction.hasChanges())
                .forEach((replacementAction) => {
                    replacementAction.apply(editBuilder);
                });
        }).then(() => {
            const sortedActions = replacementActions.sort((firstAction, secondAction) => {
                return this.compareByEndPosition(firstAction.newRange, secondAction.newRange);
            });

            const editedLineNumbers = App.instance.uniq(
                sortedActions.map((replacementAction) => replacementAction.range.end.line),
            );
            const lineRunningOffsets = editedLineNumbers.map((lineNumber) => ({lineNumber, runningOffset: 0}));

            const adjustedSelectionCoordinateList = sortedActions.map((replacementAction) => {
                const [lineRunningOffset] = lineRunningOffsets.filter((offset) => {
                    return offset.lineNumber === replacementAction.range.end.line;
                });
                const range = new Range(
                    replacementAction.newRange.start.line,
                    replacementAction.newRange.start.character + lineRunningOffset.runningOffset,
                    replacementAction.newRange.end.line,
                    replacementAction.newRange.end.character + lineRunningOffset.runningOffset,
                );
                lineRunningOffset.runningOffset += replacementAction.offset;

                return range;
            });

            App.instance.editor.selections = adjustedSelectionCoordinateList.map((range) => {
                return App.instance.toSelection(range);
            });
        });
    }

    private toCamel(value: string): string {
        return changeCase.camelCase(value);
    }

    private toConstant(value: string): string {
        return changeCase.constantCase(value);
    }

    private toDot(value: string): string {
        return changeCase.dotCase(value);
    }

    private toKebab(value: string): string {
        return changeCase.paramCase(value);
    }

    private toLower(value: string): string {
        return value.toLowerCase();
    }

    private toLowerFirst(value: string): string {
        return value ? value[0].toLowerCase() + value.slice(1) : value;
    }

    private toPascal(value: string): string {
        return changeCase.pascalCase(value);
    }

    private toPath(value: string): string {
        return changeCase.pathCase(value);
    }

    private toSentence(value: string): string {
        return changeCase.sentenceCase(value);
    }

    private toSnake(value: string): string {
        return changeCase.snakeCase(value);
    }

    private toSwap(value: string): string {
        return value.replace(/[a-zA-Z]/g, (character) => {
            const lowerCharacter = character.toLowerCase();

            return character === lowerCharacter ? character.toUpperCase() : lowerCharacter;
        });
    }

    private toTitle(value: string): string {
        return changeCase.capitalCase(value);
    }

    private toUpper(value: string): string {
        return value.toUpperCase();
    }

    private toUpperFirst(value: string): string {
        return value ? value[0].toUpperCase() + value.slice(1) : value;
    }

    private getSelectedTextIfOnlyOneSelection(): string | undefined {
        const {document, selection, selections} = App.instance.editor;
        if (selections.length > 1 || selection.start.line !== selection.end.line) {
            return undefined;
        }

        return this.getSelectedText(selections[0], document).text;
    }

    private getSelectedText(selection: Selection, document: TextDocument): ISelectedText {
        const range: Range | undefined = this.isRangeSimplyCursorPosition(selection)
            ? this.getToggleCaseWordRangeAtPosition(document, selection.end)
            : new Range(selection.start, selection.end);
        const text: string | undefined = range ? document.getText(range) : undefined;

        return {text, range};
    }

    private isRangeSimplyCursorPosition(range: Range): boolean {
        return range.start.line === range.end.line
            && range.start.character === range.end.character;
    }

    private getToggleCaseWordRangeAtPosition(document: TextDocument, position: Position): Range | undefined {
        const range = document.getWordRangeAtPosition(position);
        if (!range) {
            return undefined;
        }

        let startCharacterIndex = range.start.character - 1;
        while (startCharacterIndex >= 0) {
            const charRange = new Range(
                range.start.line,
                startCharacterIndex,
                range.start.line,
                startCharacterIndex + 1,
            );
            const character = document.getText(charRange);
            if (character.search(C_WORD_CHARACTER_REGEX) === -1) {
                break;
            }
            startCharacterIndex--;
        }

        const lineMaxColumn = document.lineAt(range.end.line).range.end.character;
        let endCharacterIndex = range.end.character;
        while (endCharacterIndex < lineMaxColumn) {
            const charRange = new Range(range.end.line, endCharacterIndex, range.end.line, endCharacterIndex + 1);
            const character = document.getText(charRange);
            if (character.search(C_WORD_CHARACTER_REGEX) === -1) {
                break;
            }
            endCharacterIndex++;
        }

        let rangeStartCharacter = startCharacterIndex + 1;
        let rangeEndCharacter = endCharacterIndex;

        while (rangeStartCharacter < rangeEndCharacter) {
            const charRange = new Range(
                range.start.line,
                rangeStartCharacter,
                range.start.line,
                rangeStartCharacter + 1,
            );
            const character = document.getText(charRange);
            if (character.search(C_WORD_CHARACTER_REGEX) !== -1) {
                break;
            }
            rangeStartCharacter++;
        }

        while (rangeEndCharacter > rangeStartCharacter) {
            const charRange = new Range(range.end.line, rangeEndCharacter - 1, range.end.line, rangeEndCharacter);
            const character = document.getText(charRange);
            if (character.search(C_WORD_CHARACTER_REGEX) !== -1) {
                break;
            }
            rangeEndCharacter--;
        }

        return new Range(range.start.line, rangeStartCharacter, range.end.line, rangeEndCharacter);
    }

    private compareByEndPosition(a: Range | Selection, b: Range | Selection): number {
        if (a.end.line < b.end.line) {
            return -1;
        }

        if (a.end.line > b.end.line) {
            return 1;
        }

        if (a.end.character < b.end.character) {
            return -1;
        }

        if (a.end.character > b.end.character) {
            return 1;
        }

        return 0;
    }
}
