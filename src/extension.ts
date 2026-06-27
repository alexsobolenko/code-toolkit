import {ExtensionContext, commands, extensions, window, workspace} from 'vscode';
import {EXT_ID, COMMAND} from './constants';
import CommentHighlighter from './decorator/comment-highlighter';
import ColorHighlighter from './decorator/color-highlighter';
import NumberChanger from './feature/number-changer';

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
