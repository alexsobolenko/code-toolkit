import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {installVscodeMock, setAppInstance} from '../helpers/vscode';

const restoreVscodeMock = installVscodeMock();
const vscode = require('vscode');
const {default: Provider} = require('../../features/decorator/provider');

function waitForProvider(): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, 130);
    });
}

describe('Provider', () => {
    it('updates comment and color highlight decorations for the active editor', async () => {
        const calls: string[] = [];
        setAppInstance({
            colorHighlightsParser: {
                applyDecorations: () => calls.push('color.applyDecorations'),
                findColors: () => calls.push('color.findColors'),
            },
            commentHighlightsParser: {
                applyDecorations: () => calls.push('comment.applyDecorations'),
                findBlockComments: () => calls.push('comment.findBlockComments'),
                findJSDocComments: () => calls.push('comment.findJSDocComments'),
                findSingleLineComments: () => calls.push('comment.findSingleLineComments'),
                supportedLanguage: true,
            },
        });
        vscode.window.activeTextEditor = {};

        new Provider().triggerUpdateDecorations();
        await waitForProvider();

        assert.deepEqual(calls, [
            'comment.findSingleLineComments',
            'comment.findBlockComments',
            'comment.findJSDocComments',
            'comment.applyDecorations',
            'color.findColors',
            'color.applyDecorations',
        ]);
    });

    it('does not update decorations when there is no active editor', async () => {
        const calls: string[] = [];
        setAppInstance({
            colorHighlightsParser: {
                applyDecorations: () => calls.push('color.applyDecorations'),
                findColors: () => calls.push('color.findColors'),
            },
            commentHighlightsParser: {
                applyDecorations: () => calls.push('comment.applyDecorations'),
                findBlockComments: () => calls.push('comment.findBlockComments'),
                findJSDocComments: () => calls.push('comment.findJSDocComments'),
                findSingleLineComments: () => calls.push('comment.findSingleLineComments'),
                supportedLanguage: true,
            },
        });
        vscode.window.activeTextEditor = undefined;

        new Provider().triggerUpdateDecorations();
        await waitForProvider();

        assert.deepEqual(calls, []);
    });

    it('skips comment scanning for unsupported languages but still applies existing decoration state', async () => {
        const calls: string[] = [];
        setAppInstance({
            colorHighlightsParser: {
                applyDecorations: () => calls.push('color.applyDecorations'),
                findColors: () => calls.push('color.findColors'),
            },
            commentHighlightsParser: {
                applyDecorations: () => calls.push('comment.applyDecorations'),
                findBlockComments: () => calls.push('comment.findBlockComments'),
                findJSDocComments: () => calls.push('comment.findJSDocComments'),
                findSingleLineComments: () => calls.push('comment.findSingleLineComments'),
                supportedLanguage: false,
            },
        });
        vscode.window.activeTextEditor = {};

        new Provider().triggerUpdateDecorations();
        await waitForProvider();

        assert.deepEqual(calls, [
            'comment.applyDecorations',
            'color.findColors',
            'color.applyDecorations',
        ]);
    });
});

restoreVscodeMock();
