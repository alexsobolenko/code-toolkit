import {Disposable, TextEditor, workspace} from 'vscode';
import {EXT_ID} from './constants';

export default abstract class Feature implements Disposable {
    abstract update(editor: TextEditor): void;

    abstract dispose(): void;

    protected getConfig<T>(key: string, defaultValue: T): T {
        return workspace.getConfiguration(EXT_ID).get<T>(key, defaultValue);
    }
}
