import {extensions, Uri, workspace} from 'vscode';
import path from 'path';
import * as json5 from 'json5';
import {CommentConfig} from '../../interfaces';
import App from '../../app';

export default class Configuration {
    private readonly commentConfig = new Map<string, CommentConfig | undefined>();
    private readonly languageConfigFiles = new Map<string, string>();

    public constructor() {
        this.updateLanguagesDefinitions();
    }

    public updateLanguagesDefinitions(): void {
        this.commentConfig.clear();
        for (const extension of extensions.all) {
            const {packageJSON} = extension;
            if (packageJSON.contributes && packageJSON.contributes.languages) {
                for (const language of packageJSON.contributes.languages) {
                    if (language.configuration) {
                        this.languageConfigFiles.set(
                            language.id,
                            path.join(extension.extensionPath, language.configuration),
                        );
                    }
                }
            }
        }
    }

    public get highlightPlainText(): boolean {
        return !!App.instance.config('comment-highlight-plain-text', false);
    }

    public get commentTags(): any[] {
        return App.instance.config('comment-tags', []);
    }

    public get highlightMultilineComments(): boolean {
        return !!App.instance.config('comment-highlight-multiline', false);
    }

    public async getCommentConfiguration(languageId: string): Promise<CommentConfig | undefined> {
        if (this.commentConfig.has(languageId)) {
            return this.commentConfig.get(languageId);
        }

        if (!this.languageConfigFiles.has(languageId)) {
            return undefined;
        }

        let result: any | undefined;
        try {
            const filePath = this.languageConfigFiles.get(languageId) as string;
            const rawContent = await workspace.fs.readFile(Uri.file(filePath));
            const content = new TextDecoder().decode(rawContent);
            const config = json5.parse(content);
            this.commentConfig.set(languageId, config.comments);
            result = config.comments;
        } catch (error) {
            this.commentConfig.set(languageId, undefined);
        }

        return result;
    }
}
