import {ExtensionContext, commands, extensions, window, workspace} from 'vscode';
import {EXT_ID, COMMAND, CASE} from './constants';
import CommentHighlighter from './decorator/comment-highlighter';
import ColorHighlighter from './decorator/color-highlighter';
import NumberChanger from './feature/number-changer';
import QuotesToggler from './feature/quotes-toggler';
import CaseToggler from './feature/case-toggler';

export async function activate(context: ExtensionContext) {
    const commentHighlight = new CommentHighlighter();
    const colorHighlight = new ColorHighlighter();
    context.subscriptions.push(commentHighlight, colorHighlight);

    /* debounced decoration update */
    let updateTimeout: NodeJS.Timeout | undefined;
    const scheduleUpdate = () => {
        if (updateTimeout) {
            clearTimeout(updateTimeout);
        }
        updateTimeout = setTimeout(() => {
            const editor = window.activeTextEditor;
            if (!editor) {
                return;
            }
            commentHighlight.update(editor);
            colorHighlight.update(editor);
        }, 100);
    };

    /* toggle case commands */
    const caseToggler = new CaseToggler();
    context.subscriptions.push(commands.registerCommand(COMMAND.TOGGLE_CASE, () => {
        caseToggler.proceed();
    }));
    context.subscriptions.push(commands.registerCommand(COMMAND.TOGGLE_CASE_CAMEL, () => {
        caseToggler.proceed(CASE.CAMEL);
    }));
    context.subscriptions.push(commands.registerCommand(COMMAND.TOGGLE_CASE_CONSTANT, () => {
        caseToggler.proceed(CASE.CONSTANT);
    }));
    context.subscriptions.push(commands.registerCommand(COMMAND.TOGGLE_CASE_DOT, () => {
        caseToggler.proceed(CASE.DOT);
    }));
    context.subscriptions.push(commands.registerCommand(COMMAND.TOGGLE_CASE_KEBAB, () => {
        caseToggler.proceed(CASE.KEBAB);
    }));
    context.subscriptions.push(commands.registerCommand(COMMAND.TOGGLE_CASE_LOWER, () => {
        caseToggler.proceed(CASE.LOWER);
    }));
    context.subscriptions.push(commands.registerCommand(COMMAND.TOGGLE_CASE_LOWER_FIRST, () => {
        caseToggler.proceed(CASE.LOWER_FIRST);
    }));
    context.subscriptions.push(commands.registerCommand(COMMAND.TOGGLE_CASE_PASCAL, () => {
        caseToggler.proceed(CASE.PASCAL);
    }));
    context.subscriptions.push(commands.registerCommand(COMMAND.TOGGLE_CASE_PATH, () => {
        caseToggler.proceed(CASE.PATH);
    }));
    context.subscriptions.push(commands.registerCommand(COMMAND.TOGGLE_CASE_SENTENCE, () => {
        caseToggler.proceed(CASE.SENTENCE);
    }));
    context.subscriptions.push(commands.registerCommand(COMMAND.TOGGLE_CASE_SNAKE, () => {
        caseToggler.proceed(CASE.SNAKE);
    }));
    context.subscriptions.push(commands.registerCommand(COMMAND.TOGGLE_CASE_SWAP, () => {
        caseToggler.proceed(CASE.SWAP);
    }));
    context.subscriptions.push(commands.registerCommand(COMMAND.TOGGLE_CASE_TITLE, () => {
        caseToggler.proceed(CASE.TITLE);
    }));
    context.subscriptions.push(commands.registerCommand(COMMAND.TOGGLE_CASE_UPPER, () => {
        caseToggler.proceed(CASE.UPPER);
    }));
    context.subscriptions.push(commands.registerCommand(COMMAND.TOGGLE_CASE_UPPER_FIRST, () => {
        caseToggler.proceed(CASE.UPPER_FIRST);
    }));

    /* toggle quotes command */
    const quotesToggler = new QuotesToggler();
    context.subscriptions.push(commands.registerCommand(COMMAND.TOGGLE_QUOTES, () => {
        quotesToggler.proceed();
    }));

    /* increment and decrement number commands */
    const numberChanger = new NumberChanger();
    context.subscriptions.push(commands.registerCommand(COMMAND.INCREMENT_NUMBER, () => {
        numberChanger.proceed(true);
    }));
    context.subscriptions.push(commands.registerCommand(COMMAND.DECREMENT_NUMBER, () => {
        numberChanger.proceed(false);
    }));

    /* initial decoration */
    const editor = window.activeTextEditor;
    if (editor) {
        await commentHighlight.setLanguage(editor.document.languageId);
        scheduleUpdate();
    }

    /* reload language configs when extensions change */
    extensions.onDidChange(() => {
        commentHighlight.reloadLanguageDefinitions();
    }, null, context.subscriptions);

    /* re-detect language and update decorations on editor switch */
    window.onDidChangeActiveTextEditor(async (editor) => {
        if (editor) {
            await commentHighlight.setLanguage(editor.document.languageId);
            scheduleUpdate();
        }
    }, null, context.subscriptions);

    /* update decorations on text change */
    workspace.onDidChangeTextDocument((event) => {
        const editor = window.activeTextEditor;
        if (editor && event.document === editor.document) {
            scheduleUpdate();
        }
    }, null, context.subscriptions);

    /* reset decorations on configuration change */
    workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration(`${EXT_ID}.comment-highlight`)) {
            commentHighlight.refreshTags();
        }
        if (event.affectsConfiguration(`${EXT_ID}.color-highlight`)) {
            colorHighlight.resetDecorations();
        }
        scheduleUpdate();
    }, null, context.subscriptions);
}

export function deactivate() {}
