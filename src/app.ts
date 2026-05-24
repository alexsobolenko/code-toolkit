import {
    DecorationOptions,
    Range,
    Selection,
    TextEditor,
    WorkspaceConfiguration,
    window,
    workspace,
} from 'vscode';
import {M_ERROR, M_INFO, M_WARNING} from './constants';
import QuotesToggler from './features/toggle-quotes/quotes-toggler';
import CaseToggler from './features/toggle-case/case-toggler';
import MultilineExpressionToggler from './features/toggle-multiline-expression/multiline-expression-toggler';
import NumberChanger from './features/change-numbers/number-changer';
import {Configuration, Parser} from './features/comment-highlights';
import Provider from './features/decorator/provider';

export default class App {
    private static _instance: App;
    private _config: WorkspaceConfiguration;
    private _provider: Provider;
    private _quotesToggler: QuotesToggler;
    private _caseToggler: CaseToggler;
    private _multilineExpressionToggler: MultilineExpressionToggler;
    private _numberChanger: NumberChanger;
    private _commentHighlightsParser: Parser;

    private constructor() {
        this._config = workspace.getConfiguration('advanced-code-toolkit');
        this._provider = new Provider();
        this._quotesToggler = new QuotesToggler();
        this._caseToggler = new CaseToggler();
        this._multilineExpressionToggler = new MultilineExpressionToggler();
        this._numberChanger = new NumberChanger();
        this._commentHighlightsParser = new Parser(new Configuration());
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

    public toggleCase(caseType: string | null = null): void {
        this._caseToggler.proceed(caseType);
    }

    public toggleMultilineExpression(): void {
        this._multilineExpressionToggler.proceed();
    }

    public changeNumber(isIncDirection: boolean): void {
        this._numberChanger.proceed(isIncDirection);
    }

    public get editor(): TextEditor {
        if (!window.activeTextEditor) {
            throw new Error('There are no active editors');
        }

        return window.activeTextEditor;
    }

    public get commentHighlightsParser(): Parser {
        return this._commentHighlightsParser;
    }

    public get provider(): Provider {
        return this._provider;
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

    public uniq<T>(items: T[]): T[] {
        return [...new Set(items)];
    }

    public isDigit(character: string | undefined): boolean {
        return character !== undefined && /^\d$/.test(character);
    }

    public toSelection(range: Range): Selection {
        return new Selection(range.start, range.end);
    }

    public toDecorationOptions(range: Range): DecorationOptions {
        return {range};
    }
}
