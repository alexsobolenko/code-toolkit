import {Range, Selection, TextEditorEdit} from 'vscode';
import {StringProcessor} from '../../types';
import {ISelectedText} from '../../interfaces';

export default class ReplacementAction {
    public constructor(
        public readonly text: string,
        public readonly range: Range,
        public readonly replacement: string,
        public readonly offset: number,
        public readonly newRange: Range,
    ) {}

    public hasChanges(): boolean {
        return this.replacement !== this.text;
    }

    public apply(editBuilder: TextEditorEdit): void {
        editBuilder.replace(this.range, this.replacement);
    }

    public static create(
        selectedText: ISelectedText,
        selection: Selection,
        transform: StringProcessor,
    ): ReplacementAction | undefined {
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

        return new ReplacementAction(selectedText.text, selectedText.range, replacement, offset, newRange);
    }

    private static getLastLineLength(text: string): number {
        const lines = text.split(/\r\n|\n/);

        return lines[lines.length - 1].length;
    }
}
