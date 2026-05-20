import {Range, TextEditorEdit} from 'vscode';

export default class NumberChangeAction {
    public constructor(
        public readonly range: Range,
        public readonly replacement: string,
    ) {}

    public key(): string {
        return [
            this.range.start.line,
            this.range.start.character,
            this.range.end.line,
            this.range.end.character,
        ].join(':');
    }

    public apply(editBuilder: TextEditorEdit): void {
        editBuilder.replace(this.range, this.replacement);
    }

    public static create(
        range: Range,
        numberText: string,
        isIncDirection: boolean,
    ): NumberChangeAction {
        const curVal = BigInt(numberText);
        const nextValue = isIncDirection ? curVal + 1n : curVal > 0n ? curVal - 1n : 0n;
        const replacement = nextValue.toString().padStart(numberText.length, '0');

        return new NumberChangeAction(range, replacement);
    }
}
