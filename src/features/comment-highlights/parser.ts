import {DecorationRenderOptions, Range, window} from 'vscode';
import {CommentTag} from '../../interfaces';
import App from '../../app';
import Configuration from './configuration';

export default class Parser {
    public supportedLanguage = true;
    public config: Configuration;
    private tags: CommentTag[] = [];
    private expression: string = '';
    private delimiter: string = '';
    private blockCommentStart: string = '';
    private blockCommentEnd: string = '';
    private highlightSingleLineComments = true;
    private highlightJSDoc = false;
    private isPlainText = false;
    private ignoreFirstLine = false;

    public constructor(config: Configuration) {
        this.config = config;
    }

    public async setRegex(languageId: string) {
        if (this.tags.length === 0) {
            this.setTags();
        }

        await this.setDelimiter(languageId);
        if (!this.supportedLanguage || this.tags.length === 0) {
            this.expression = '';
            this.supportedLanguage = false;

            return;
        }

        const characters: string[] = [];
        for (const commentTag of this.tags) {
            characters.push(commentTag.escapedTag);
        }

        this.expression = (this.isPlainText && this.config.highlightPlainText)
            ? `(^)+([ \\t]*[ \\t]*)(${characters.join('|')})+(.*)`
            : `(${this.delimiter})+( |\t)*(${characters.join('|')})+(.*)`;
    }

    public findSingleLineComments(): void {
        if (!this.highlightSingleLineComments || !this.expression) {
            return;
        }

        const {document} = App.instance.editor;
        const text = document.getText();
        const regEx = new RegExp(this.expression, this.isPlainText ? 'igm' : 'ig');
        let match: any;
        while (match = regEx.exec(text)) {
            const startPos = document.positionAt(match.index);
            const endPos = document.positionAt(match.index + match[0].length);
            const range = App.instance.toDecorationOptions(new Range(startPos, endPos));
            if (this.ignoreFirstLine && startPos.line === 0 && startPos.character === 0) {
                continue;
            }

            const matchTag = this.tags.find((item) => item.tag.toLowerCase() === match[3].toLowerCase());
            if (matchTag) {
                matchTag.ranges.push(range);
            }
        }
    }

    public findBlockComments(): void {
        if (!this.config.highlightMultilineComments) {
            return;
        }

        const {document} = App.instance.editor;
        const text = document.getText();
        const characters: string[] = [];
        for (const commentTag of this.tags) {
            characters.push(commentTag.escapedTag);
        }

        const commentMatchString = `(^)+([ \\t]*[ \\t]*)(${characters.join('|')})([ ]*|[:])+([^*/][^\\r\\n]*)`;
        const regexString = `(^|[ \\t])(${this.blockCommentStart}[\\s])+([\\s\\S]*?)(${this.blockCommentEnd})`;
        const regEx = new RegExp(regexString, 'gm');
        const commentRegEx = new RegExp(commentMatchString, 'igm');
        let match: any;
        while (match = regEx.exec(text)) {
            const [commentBlock] = match;
            let line: any;
            while (line = commentRegEx.exec(commentBlock)) {
                const startPos = document.positionAt(match.index + line.index + line[2].length);
                const endPos = document.positionAt(match.index + line.index + line[0].length);
                const range = App.instance.toDecorationOptions(new Range(startPos, endPos));
                const matchString = line[3] as string;
                const matchTag = this.tags.find((item) => item.tag.toLowerCase() === matchString.toLowerCase());
                if (matchTag) {
                    matchTag.ranges.push(range);
                }
            }
        }
    }

    public findJSDocComments(): void {
        if (!this.config.highlightMultilineComments && !this.highlightJSDoc) {
            return;
        }

        const {document} = App.instance.editor;
        const text = document.getText();
        const characters: string[] = [];
        for (const commentTag of this.tags) {
            characters.push(commentTag.escapedTag);
        }

        const regEx = /(^|[ \t])(\/\*\*)+([\s\S]*?)(\*\/)/gm;
        const commentMatchString = `(^)+([ \\t]*\\*[ \\t]*)(${characters.join('|')})([ ]*|[:])+([^*/][^\\r\\n]*)`;
        const commentRegEx = new RegExp(commentMatchString, 'igm');
        let match: any;
        while (match = regEx.exec(text)) {
            const [commentBlock] = match;
            let line: any;
            while (line = commentRegEx.exec(commentBlock)) {
                const startPos = document.positionAt(match.index + line.index + line[2].length);
                const endPos = document.positionAt(match.index + line.index + line[0].length);
                const range = App.instance.toDecorationOptions(new Range(startPos, endPos));
                const matchString = line[3] as string;
                const matchTag = this.tags.find((item) => item.tag.toLowerCase() === matchString.toLowerCase());
                if (matchTag) {
                    matchTag.ranges.push(range);
                }
            }
        }
    }

    public applyDecorations(): void {
        for (const tag of this.tags) {
            App.instance.editor.setDecorations(tag.decoration, tag.ranges);
            tag.ranges.length = 0;
        }
    }

    public refreshTags(): void {
        for (const tag of this.tags) {
            tag.decoration.dispose();
        }

        this.tags = [];
        this.setTags();
    }

    private async setDelimiter(languageId: string): Promise<void> {
        this.supportedLanguage = false;
        this.ignoreFirstLine = false;
        this.isPlainText = false;
        this.highlightSingleLineComments = true;
        this.highlightJSDoc = false;
        this.delimiter = '';
        this.blockCommentStart = '';
        this.blockCommentEnd = '';

        const config = await this.config.getCommentConfiguration(languageId);
        if (config) {
            const blockCommentStart = config.blockComment ? config.blockComment[0] : null;
            const blockCommentEnd = config.blockComment ? config.blockComment[1] : null;
            this.setCommentFormat(config.lineComment || blockCommentStart, blockCommentStart, blockCommentEnd);
            this.supportedLanguage = true;
        }

        switch (languageId) {
            case 'apex':
            case 'javascript':
            case 'javascriptreact':
            case 'typescript':
            case 'typescriptreact':
                this.highlightJSDoc = true;
                break;
            case 'elixir':
            case 'python':
            case 'tcl':
                this.ignoreFirstLine = true;
                break;
            case 'plaintext':
                this.isPlainText = true;
                this.supportedLanguage = this.config.highlightPlainText;
                break;
        }
    }

    private setTags(): void {
        for (const item of this.config.commentTags) {
            if (!item.tag) {
                continue;
            }

            const options: DecorationRenderOptions = {
                color: item.color,
                backgroundColor: item.backgroundColor,
            };

            // ? the textDecoration is initialised to empty so we can concat a preceeding space on it
            options.textDecoration = '';
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

            const escapedSequence = item.tag.replace(/([()[{*+.$^\\|?])/g, '\\$1');
            this.tags.push({
                tag: item.tag,
                escapedTag: escapedSequence.replace(/\//gi, '\\/'), // ! hardcoded to escape slashes
                ranges: [],
                decoration: window.createTextEditorDecorationType(options),
            });
        }
    }

    private escapeRegExp(input: string): string {
        return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    private setCommentFormat(
        singleLine: string | string[] | null,
        start: string | null = null,
        end: string | null = null,
    ): void {
        this.delimiter = '';
        this.blockCommentStart = '';
        this.blockCommentEnd = '';
        if (singleLine) {
            if (typeof singleLine === 'string') {
                this.delimiter = this.escapeRegExp(singleLine).replace(/\//ig, '\\/');
            } else if (singleLine.length > 0) {
                this.delimiter = singleLine.map((s) => this.escapeRegExp(s)).join('|');
            }
        } else {
            this.highlightSingleLineComments = false;
        }

        if (start && end) {
            this.blockCommentStart = this.escapeRegExp(start);
            this.blockCommentEnd = this.escapeRegExp(end);
        }
    }
}
