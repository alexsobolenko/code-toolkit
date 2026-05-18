import {
    TextEditor,
    WorkspaceConfiguration,
    window,
    workspace,
} from 'vscode';
import {M_ERROR, M_INFO, M_WARNING} from './constants';
import QuotesToggler from './features/toggle-quotes/quotes-toggler';

export default class App {
    private static _instance: App;
    private _config: WorkspaceConfiguration;
    private _quotesToggler: QuotesToggler;

    private constructor() {
        this._config = workspace.getConfiguration('advanced-code-toolkit');
        this._quotesToggler = new QuotesToggler();
    }

    public static get instance(): App {
        if (!this._instance) {
            this._instance = new this();
        }

        return this._instance;
    }

    public toggleQuotes(): void {
        this._quotesToggler.proceed();
    }

    public get editor(): TextEditor {
        if (!window.activeTextEditor) {
            throw new Error('There are no active editors');
        }

        return window.activeTextEditor;
    }

    public config(key: string, defaultValue: any = null): any {
        return this._config.get(key, defaultValue);
    }

    public showMessage(buffer: string, type: string = 'info') {
        const message = buffer.replace(/\$\(.+?\)\s\s/, '');
        const data = [M_ERROR, M_INFO, M_WARNING];
        const fcn = data.includes(type) ? type : M_INFO;
        if (fcn === M_ERROR) {
            window.showErrorMessage(message);
        } else if (fcn === M_WARNING) {
            window.showWarningMessage(message);
        } else {
            window.showInformationMessage(message);
        }
    }
}
