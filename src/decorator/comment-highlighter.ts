import {
    DecorationRenderOptions,
    Disposable,
    Range,
    TextEditor,
    Uri,
    extensions,
    window,
    workspace,
} from 'vscode';
import path from 'path';
import * as json5 from 'json5';
import {CONFIG} from '../constants';
import {ICommentConfig, ICommentTag, ILanguageState} from '../interfaces';
import Feature from '../feature';

export default class CommentHighlighter extends Feature implements Disposable {
    private tags: ICommentTag[] = [];
    private escapedTagsPattern = '';
    private highlightMultiline = true;
    private languageConfigFiles = new Map<string, string>();
    private commentConfigs = new Map<string, ICommentConfig | undefined>();
    private language: ILanguageState | null = null;

    constructor() {
        super();
        this.loadLanguageDefinitions();
        this.highlightMultiline = this.getConfig(CONFIG.COMMENT_HIGHLIGHT.MULTILINE, true);
    }

    async setLanguage(languageId: string): Promise<void> {
        if (this.tags.length === 0) {
            this.initTags();
        }

        this.language = await this.buildLanguageState(languageId);
    }

    update(editor: TextEditor): void {
        if (!this.language) {
            return;
        }

        if (this.language.supported && this.language.expression) {
            this.findSingleLineComments(editor);
            this.findBlockComments(editor);
            this.findJSDocComments(editor);
        }

        for (const tag of this.tags) {
            editor.setDecorations(tag.decoration, tag.ranges);
            tag.ranges.length = 0;
        }
    }

    refreshTags(): void {
        this.disposeTags();
        this.initTags();
        this.highlightMultiline = this.getConfig(CONFIG.COMMENT_HIGHLIGHT.MULTILINE, true);
    }

    reloadLanguageDefinitions(): void {
        this.commentConfigs.clear();
        this.loadLanguageDefinitions();
    }

    dispose(): void {
        this.disposeTags();
    }

    private findSingleLineComments(editor: TextEditor): void {
        const lang = this.language!;
        if (!lang.highlightSingleLine || !lang.expression) {
            return;
        }

        const {document} = editor;
        const text = document.getText();
        const flags = lang.isPlainText ? 'igm' : 'ig';
        const regEx = new RegExp(lang.expression, flags);
        let match: RegExpExecArray | null;

        while (match = regEx.exec(text)) {
            const startPos = document.positionAt(match.index);
            const endPos = document.positionAt(match.index + match[0].length);

            if (lang.ignoreFirstLine && startPos.line === 0 && startPos.character === 0) {
                continue;
            }

            const matchTag = this.tags.find((t) => t.tag.toLowerCase() === match![3].toLowerCase());
            if (matchTag) {
                matchTag.ranges.push({range: new Range(startPos, endPos)});
            }
        }
    }

    private findBlockComments(editor: TextEditor): void {
        const lang = this.language!;
        if (!this.highlightMultiline || !lang.blockCommentStart) {
            return;
        }

        const {document} = editor;
        const text = document.getText();
        const commentMatchStr = `(^)+([ \\t]*[ \\t]*)(${this.escapedTagsPattern})([ ]*|[:])+([^*/][^\\r\\n]*)`;
        const blockStr = `(^|[ \\t])(${lang.blockCommentStart}[\\s])+([\\s\\S]*?)(${lang.blockCommentEnd})`;
        const blockRegEx = new RegExp(blockStr, 'gm');
        const lineRegEx = new RegExp(commentMatchStr, 'igm');

        let blockMatch: RegExpExecArray | null;
        while (blockMatch = blockRegEx.exec(text)) {
            const [commentBlock] = blockMatch;
            let lineMatch: RegExpExecArray | null;
            while (lineMatch = lineRegEx.exec(commentBlock)) {
                const startPos = document.positionAt(blockMatch.index + lineMatch.index + lineMatch[2].length);
                const endPos = document.positionAt(blockMatch.index + lineMatch.index + lineMatch[0].length);
                const matchTag = this.tags.find((t) => t.tag.toLowerCase() === (lineMatch![3] as string).toLowerCase());
                if (matchTag) {
                    matchTag.ranges.push({range: new Range(startPos, endPos)});
                }
            }
        }
    }

    private findJSDocComments(editor: TextEditor): void {
        const lang = this.language!;
        if (!this.highlightMultiline && !lang.highlightJSDoc) {
            return;
        }

        const {document} = editor;
        const text = document.getText();
        const jsDocRegEx = /(^|[ \t])(\/\*\*)+([\s\S]*?)(\*\/)/gm;
        const commentMatchStr = `(^)+([ \\t]*\\*[ \\t]*)(${this.escapedTagsPattern})([ ]*|[:])+([^*/][^\\r\\n]*)`;
        const lineRegEx = new RegExp(commentMatchStr, 'igm');

        let blockMatch: RegExpExecArray | null;
        while (blockMatch = jsDocRegEx.exec(text)) {
            const [commentBlock] = blockMatch;
            let lineMatch: RegExpExecArray | null;
            while (lineMatch = lineRegEx.exec(commentBlock)) {
                const startPos = document.positionAt(blockMatch.index + lineMatch.index + lineMatch[2].length);
                const endPos = document.positionAt(blockMatch.index + lineMatch.index + lineMatch[0].length);
                const matchTag = this.tags.find((t) => t.tag.toLowerCase() === (lineMatch![3] as string).toLowerCase());
                if (matchTag) {
                    matchTag.ranges.push({range: new Range(startPos, endPos)});
                }
            }
        }
    }

    private async buildLanguageState(languageId: string): Promise<ILanguageState> {
        const state: ILanguageState = {
            supported: false,
            isPlainText: false,
            ignoreFirstLine: false,
            highlightSingleLine: true,
            highlightJSDoc: false,
            delimiter: '',
            blockCommentStart: '',
            blockCommentEnd: '',
            expression: '',
        };

        const config = await this.getCommentConfig(languageId);
        if (config) {
            const blockStart = config.blockComment ? config.blockComment[0] : null;
            const blockEnd = config.blockComment ? config.blockComment[1] : null;
            this.applyCommentFormat(state, config.lineComment || blockStart, blockStart, blockEnd);
            state.supported = true;
        }

        switch (languageId) {
            case 'apex':
            case 'javascript':
            case 'javascriptreact':
            case 'typescript':
            case 'typescriptreact':
                state.highlightJSDoc = true;
                break;
            case 'elixir':
            case 'python':
            case 'tcl':
                state.ignoreFirstLine = true;
                break;
            case 'plaintext':
                state.isPlainText = true;
                state.supported = this.getConfig(CONFIG.COMMENT_HIGHLIGHT.PLAIN_TEXT, true);
                break;
        }

        if (state.supported && this.tags.length > 0) {
            state.expression = (state.isPlainText && this.getConfig(CONFIG.COMMENT_HIGHLIGHT.PLAIN_TEXT, true))
                ? `(^)+([ \\t]*[ \\t]*)(${this.escapedTagsPattern})+(.*)`
                : `(${state.delimiter})+( |\t)*(${this.escapedTagsPattern})+(.*)`;
        }

        return state;
    }

    private applyCommentFormat(
        state: ILanguageState,
        singleLine: string | string[] | null,
        blockStart: string | null,
        blockEnd: string | null,
    ): void {
        if (singleLine) {
            if (typeof singleLine === 'string') {
                state.delimiter = this.escapeRegExp(singleLine).replace(/\//ig, '\\/');
            } else if (singleLine.length > 0) {
                state.delimiter = singleLine.map((s) => this.escapeRegExp(s)).join('|');
            }
        } else {
            state.highlightSingleLine = false;
        }

        if (blockStart && blockEnd) {
            state.blockCommentStart = this.escapeRegExp(blockStart);
            state.blockCommentEnd = this.escapeRegExp(blockEnd);
        }
    }

    private async getCommentConfig(languageId: string): Promise<ICommentConfig | undefined> {
        if (this.commentConfigs.has(languageId)) {
            return this.commentConfigs.get(languageId);
        }

        if (!this.languageConfigFiles.has(languageId)) {
            return undefined;
        }

        try {
            const filePath = this.languageConfigFiles.get(languageId)!;
            const rawContent = await workspace.fs.readFile(Uri.file(filePath));
            const content = new TextDecoder().decode(rawContent);
            const config = json5.parse(content);
            this.commentConfigs.set(languageId, config.comments);
            return config.comments;
        } catch {
            this.commentConfigs.set(languageId, undefined);
            return undefined;
        }
    }

    private loadLanguageDefinitions(): void {
        this.languageConfigFiles.clear();
        for (const ext of extensions.all) {
            const {packageJSON} = ext;
            if (packageJSON.contributes?.languages) {
                for (const lang of packageJSON.contributes.languages) {
                    if (lang.configuration) {
                        this.languageConfigFiles.set(
                            lang.id,
                            path.join(ext.extensionPath, lang.configuration),
                        );
                    }
                }
            }
        }
    }

    private initTags(): void {
        const tagConfigs: any[] = this.getConfig(CONFIG.COMMENT_HIGHLIGHT.TAGS, []);
        for (const item of tagConfigs) {
            if (!item.tag) {
                continue;
            }

            const options: DecorationRenderOptions = {
                color: item.color,
                backgroundColor: item.backgroundColor,
                textDecoration: '',
            };

            if (item.strikethrough) {
                options.textDecoration += ' line-through';
            }
            if (item.underline) {
                options.textDecoration += ' underline';
            }
            if (item.bold) {
                options.fontWeight = 'bold';
            }
            if (item.italic) {
                options.fontStyle = 'italic';
            }

            const escaped = item.tag.replace(/([()[{*+.$^\\|?])/g, '\\$1');
            this.tags.push({
                tag: item.tag,
                escapedTag: escaped.replace(/\//gi, '\\/'),
                ranges: [],
                decoration: window.createTextEditorDecorationType(options),
            });
        }

        this.escapedTagsPattern = this.tags.map((t) => t.escapedTag).join('|');
    }

    private disposeTags(): void {
        for (const tag of this.tags) {
            tag.decoration.dispose();
        }
        this.tags = [];
        this.escapedTagsPattern = '';
    }

    private escapeRegExp(input: string): string {
        return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

}
