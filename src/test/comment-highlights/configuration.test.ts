import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {installVscodeMock, setAppInstance} from '../helpers/vscode';

let readFileCount = 0;
const encodedConfiguration = new TextEncoder().encode(
    '{comments:{lineComment:"//",blockComment:["/*","*/"]}}',
);
const restoreVscodeMock = installVscodeMock({
    extensions: {
        all: [{
            extensionPath: '/extension',
            packageJSON: {
                contributes: {
                    languages: [{
                        configuration: 'language-configuration.json',
                        id: 'javascript',
                    }],
                },
            },
        }],
    },
    workspace: {
        fs: {
            readFile: async () => {
                readFileCount++;

                return encodedConfiguration;
            },
        },
    },
});
const {default: Configuration} = require('../../features/comment-highlights/configuration');

describe('Comment highlights Configuration', () => {
    it('reads settings from app configuration', () => {
        const values: Record<string, unknown> = {
            'comment-highlight-multiline': true,
            'comment-highlight-plain-text': false,
            'comment-tags': [{tag: 'TODO'}],
        };
        setAppInstance({
            config: (key: string, defaultValue: unknown) => values[key] ?? defaultValue,
        });
        const config = new Configuration();

        assert.equal(config.highlightMultilineComments, true);
        assert.equal(config.highlightPlainText, false);
        assert.deepEqual(config.commentTags, [{tag: 'TODO'}]);
    });

    it('loads language comment configuration once and then uses cache', async () => {
        readFileCount = 0;
        setAppInstance({
            config: (_key: string, defaultValue: unknown) => defaultValue,
        });
        const config = new Configuration();

        assert.deepEqual(await config.getCommentConfiguration('javascript'), {
            blockComment: ['/*', '*/'],
            lineComment: '//',
        });
        assert.deepEqual(await config.getCommentConfiguration('javascript'), {
            blockComment: ['/*', '*/'],
            lineComment: '//',
        });
        assert.equal(readFileCount, 1);
    });

    it('returns undefined for languages without a known configuration file', async () => {
        const config = new Configuration();

        assert.equal(await config.getCommentConfiguration('unknown'), undefined);
    });
});

restoreVscodeMock();
