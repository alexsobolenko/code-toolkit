import {window, workspace} from 'vscode';
import {EXT_ID, MESSAGE} from './constants';

export default abstract class Feature {
    protected getConfig<T>(key: string, defaultValue: T): T {
        return workspace.getConfiguration(EXT_ID).get<T>(key, defaultValue);
    }

    protected isDigit(character: string | undefined): boolean {
        return character !== undefined && /^\d$/.test(character);
    }

    protected showMessage(buffer: string, type: string = 'info') {
        const message = buffer.replace(/\$\(.+?\)\s\s/, '');
        const data = Object.keys(MESSAGE);
        const fcn = data.includes(type) ? type : MESSAGE.INFO;
        if (fcn === MESSAGE.ERROR) {
            window.showErrorMessage(message);
        } else if (fcn === MESSAGE.WARNING) {
            window.showWarningMessage(message);
        } else {
            window.showInformationMessage(message);
        }
    }
}
