import {window} from 'vscode';
import App from '../../app';

export default class Provider {
    private _timeout: NodeJS.Timeout | undefined;

    public triggerUpdateDecorations() {
        if (this._timeout) {
            clearTimeout(this._timeout);
        }
        this._timeout = setTimeout(() => this.updateDecorations(), 100);
    }

    private updateDecorations(): void {
        if (!window.activeTextEditor) {
            return;
        }

        /* comment highlights */
        if (App.instance.commentHighlightsParser.supportedLanguage) {
            App.instance.commentHighlightsParser.findSingleLineComments();
            App.instance.commentHighlightsParser.findBlockComments();
            App.instance.commentHighlightsParser.findJSDocComments();
        }

        App.instance.commentHighlightsParser.applyDecorations();

        /* color highlights */
        App.instance.colorHighlightsParser.findColors();
        App.instance.colorHighlightsParser.applyDecorations();
    }
}
