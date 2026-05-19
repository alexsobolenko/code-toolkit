import {Range} from 'vscode';
import App from '../../app';

export default class BracketPair {
    public constructor(
        public readonly open: string,
        public readonly close: string,
        public readonly startOffset: number,
        public readonly endOffset: number,
    ) {}

    public contains(offset: number): boolean {
        return this.startOffset <= offset && offset <= this.endOffset;
    }

    public isSingleLine(): boolean {
        const {document} = App.instance.editor;

        return document.positionAt(this.startOffset).line === document.positionAt(this.endOffset).line;
    }

    public range(): Range {
        const {document} = App.instance.editor;

        return new Range(
            document.positionAt(this.startOffset),
            document.positionAt(this.endOffset + 1),
        );
    }

    public innerText(text: string): string {
        return text.substring(this.startOffset + 1, this.endOffset).trim();
    }
}
