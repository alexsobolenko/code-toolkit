import {Range, window} from 'vscode';
import {INumberChangeAction} from '../interfaces';
import Feature from '../feature';

export default class NumberChanger extends Feature {
    public proceed(isIncDirection: boolean): void {
        if (!window.activeTextEditor) {
            return;
        }

        const {document, selections} = window.activeTextEditor;
        const actions: INumberChangeAction[] = [];
        const handledRanges = new Set<string>();

        for (const selection of selections) {
            const position = selection.active;
            const lineText = document.lineAt(position.line).text;
            const prevCharIndex = position.character - 1;
            const curCharIndex = position.character;
            if (!this.isDigit(lineText[prevCharIndex]) && !this.isDigit(lineText[curCharIndex])
            ) {
                continue;
            }

            let startCharIndex = this.isDigit(lineText[curCharIndex]) ? curCharIndex : prevCharIndex;
            let endCharIndex = startCharIndex + 1;
            while (startCharIndex > 0 && this.isDigit(lineText[startCharIndex - 1])) {
                startCharIndex--;
            }
            while (endCharIndex < lineText.length && this.isDigit(lineText[endCharIndex])) {
                endCharIndex++;
            }

            const range = new Range(position.line, startCharIndex, position.line, endCharIndex);
            const numberText = document.getText(range);

            const curVal = BigInt(numberText);
            const nextValue = isIncDirection ? curVal + 1n : curVal > 0n ? curVal - 1n : 0n;
            const replacement = nextValue.toString().padStart(numberText.length, '0');

            const action: INumberChangeAction = {range, replacement};
            const key = [range.start.line, range.start.character, range.end.line, range.end.character].join(':');
            if (!handledRanges.has(key)) {
                handledRanges.add(key);
                actions.push(action);
            }
        }

        if (actions.length === 0) {
            return;
        }

        window.activeTextEditor.edit((editBuilder) => {
            for (const action of actions) {
                editBuilder.replace(action.range, action.replacement);
            }
        });
    }
}
