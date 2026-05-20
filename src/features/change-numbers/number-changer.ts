import {Range} from 'vscode';
import App from '../../app';
import NumberChangeAction from './number-change-action';

export default class NumberChanger {
    public proceed(isIncDirection: boolean): void {
        const {document, selections} = App.instance.editor;
        const actions: NumberChangeAction[] = [];
        const handledRanges = new Set<string>();

        for (const selection of selections) {
            const position = selection.active;
            const lineText = document.lineAt(position.line).text;
            const prevCharIndex = position.character - 1;
            const curCharIndex = position.character;
            if (!App.instance.isDigit(lineText[prevCharIndex]) && !App.instance.isDigit(lineText[curCharIndex])
            ) {
                continue;
            }

            let startCharIndex = App.instance.isDigit(lineText[curCharIndex]) ? curCharIndex : prevCharIndex;
            let endCharIndex = startCharIndex + 1;
            while (startCharIndex > 0 && App.instance.isDigit(lineText[startCharIndex - 1])) {
                startCharIndex--;
            }
            while (endCharIndex < lineText.length && App.instance.isDigit(lineText[endCharIndex])) {
                endCharIndex++;
            }

            const range = new Range(position.line, startCharIndex, position.line, endCharIndex);
            const numberText = document.getText(range);
            const action = NumberChangeAction.create(range, numberText, isIncDirection);
            if (handledRanges.has(action.key())) {
                continue;
            }
            handledRanges.add(action.key());
            actions.push(action);
        }

        if (actions.length === 0) {
            return;
        }

        App.instance.editor.edit((editBuilder) => {
            for (const action of actions) {
                action.apply(editBuilder);
            }
        });
    }
}
