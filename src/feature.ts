import {workspace} from 'vscode';
import {EXT_ID} from './constants';

export default abstract class Feature {
    protected getConfig<T>(key: string, defaultValue: T): T {
        return workspace.getConfiguration(EXT_ID).get<T>(key, defaultValue);
    }

    protected isDigit(character: string | undefined): boolean {
        return character !== undefined && /^\d$/.test(character);
    }
}
