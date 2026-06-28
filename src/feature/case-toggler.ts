import {Position, QuickPickItem, QuickPickOptions, Range, Selection, TextDocument, window} from 'vscode';
import * as changeCase from 'change-case';
import {ICaseTransformCommand, IReplacementAction, ISelectedText} from '../interfaces';
import Feature from '../feature';
import {CASE, CASE_WORD_CHARACTER_REGEX} from '../constants';
import type {StringProcessor} from '../types';

export default class CaseToggler extends Feature {
    private readonly transformCommands: ICaseTransformCommand[] = [
        {
            label: CASE.CAMEL,
            description: 'Convert to a string with the separators denoted by having the next letter capitalised',
            transform: this.toCamel,
        },
        {
            label: CASE.CONSTANT,
            description: 'Convert to an upper case, underscore separated string',
            transform: this.toConstant,
        },
        {
            label: CASE.DOT,
            description: 'Convert to a lower case, period separated string',
            transform: this.toDot,
        },
        {
            label: CASE.KEBAB,
            description: 'Convert to a lower case, dash separated string',
            transform: this.toKebab,
        },
        {
            label: CASE.LOWER,
            description: 'Convert to a string in lower case',
            transform: this.toLower,
        },
        {
            label: CASE.LOWER_FIRST,
            description: 'Convert to a string with the first character lower cased',
            transform: this.toLowerFirst,
        },
        {
            label: CASE.PASCAL,
            description: 'Convert to a string denoted in the same fashion as camelCase, but with the first letter capitalised',
            transform: this.toPascal,
        },
        {
            label: CASE.PATH,
            description: 'Convert to a lower case, slash separated string',
            transform: this.toPath,
        },
        {
            label: CASE.SENTENCE,
            description: 'Convert to a lower case, space separated string',
            transform: this.toSentence,
        },
        {
            label: CASE.SNAKE,
            description: 'Convert to a lower case, underscore separated string',
            transform: this.toSnake,
        },
        {
            label: CASE.SWAP,
            description: 'Convert to a string with every character case reversed',
            transform: this.toSwap,
        },
        {
            label: CASE.TITLE,
            description: 'Convert to a space separated string with the first character of every word upper cased',
            transform: this.toTitle,
        },
        {
            label: CASE.UPPER,
            description: 'Convert to a string in upper case',
            transform: this.toUpper,
        },
        {
            label: CASE.UPPER_FIRST,
            description: 'Convert to a string with the first character upper cased',
            transform: this.toUpperFirst,
        },
    ];

    private createReplacementAction(
        selectedText: ISelectedText,
        selection: Selection,
        transform: StringProcessor,
    ): IReplacementAction | undefined {
        if (!selectedText.text || !selectedText.range) {
            return undefined;
        }

        let replacement: string;
        let offset: number;

        if (selection.isSingleLine) {
            replacement = transform(selectedText.text);
            offset = replacement.length - selectedText.text.length;
        } else {
            replacement = selectedText.text
                .split(/(\r\n|\n)/)
                .map((linePart) => linePart.match(/\r\n|\n/) ? linePart : transform(linePart))
                .join('');
            offset = this.getLastLineLength(replacement) - this.getLastLineLength(selectedText.text);
        }

        const newRange: Range = selectedText.range.start.isEqual(selection.end)
            ? selectedText.range
            : new Range(
                selectedText.range.start.line,
                selectedText.range.start.character,
                selectedText.range.end.line,
                selectedText.range.end.character + offset,
            );

        return {
            text: selectedText.text,
            range: selectedText.range,
            replacement,
            offset,
            newRange,
        };
    }

    public proceed(caseType: string | null = null): void {
        if (!window.activeTextEditor) {
            return;
        }

        if (caseType === null) {
            const firstSelectedText = this.getSelectedTextIfOnlyOneSelection();
            const quickPickOptions: QuickPickOptions = {
                matchOnDescription: true,
                placeHolder: 'What do you want to do to the current word / selection(s)?',
            };

            const items: QuickPickItem[] = this.transformCommands.map((command) => {
                const description: string = firstSelectedText
                    ? `Convert to ${command.transform(firstSelectedText)}`
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

        const {document, selections} = window.activeTextEditor;
        const replacementActions: IReplacementAction[] = [];
        window.activeTextEditor.edit((editBuilder) => {
            for (const selection of selections) {
                const selectedText = this.getSelectedText(selection, document);
                const replacementAction = this.createReplacementAction(
                    selectedText,
                    selection,
                    caseCommand.transform,
                );

                if (replacementAction) {
                    replacementActions.push(replacementAction);
                }
            }

            replacementActions
                .filter((replacementAction) => replacementAction.replacement !== replacementAction.text)
                .forEach((replacementAction) => {
                    editBuilder.replace(replacementAction.range, replacementAction.replacement);
                });
        }).then(() => {
            const sortedActions = replacementActions.sort((firstAction, secondAction) => {
                return this.compareByEndPosition(firstAction.newRange, secondAction.newRange);
            });

            const editedLineNumbers = this.uniq(
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

            if (window.activeTextEditor) {
                window.activeTextEditor.selections = adjustedSelectionCoordinateList.map((range) => {
                    return new Selection(range.start, range.end);
                });
            }
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
        if (!window.activeTextEditor) {
            return undefined;
        }

        const {document, selection, selections} = window.activeTextEditor;
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
            if (character.search(CASE_WORD_CHARACTER_REGEX) === -1) {
                break;
            }
            startCharacterIndex--;
        }

        const lineMaxColumn = document.lineAt(range.end.line).range.end.character;
        let endCharacterIndex = range.end.character;
        while (endCharacterIndex < lineMaxColumn) {
            const charRange = new Range(range.end.line, endCharacterIndex, range.end.line, endCharacterIndex + 1);
            const character = document.getText(charRange);
            if (character.search(CASE_WORD_CHARACTER_REGEX) === -1) {
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
            if (character.search(CASE_WORD_CHARACTER_REGEX) !== -1) {
                break;
            }
            rangeStartCharacter++;
        }

        while (rangeEndCharacter > rangeStartCharacter) {
            const charRange = new Range(range.end.line, rangeEndCharacter - 1, range.end.line, rangeEndCharacter);
            const character = document.getText(charRange);
            if (character.search(CASE_WORD_CHARACTER_REGEX) !== -1) {
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
