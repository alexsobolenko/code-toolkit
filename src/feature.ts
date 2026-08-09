import {Position, Range, TextDocument, window, workspace} from 'vscode';
import {CONFIG, EXT_ID, MESSAGE} from './constants';

export default abstract class Feature {
    protected getConfig<T>(key: string, defaultValue: T): T {
        return workspace.getConfiguration(EXT_ID).get<T>(key, defaultValue);
    }

    protected getVisibleScanRange(document: TextDocument, visibleRanges: readonly Range[]): Range | undefined {
        if (visibleRanges.length === 0) {
            return undefined;
        }

        const paddingLines = this.getConfig(CONFIG.HIGHLIGHT.VISIBLE_RANGE_PADDING_LINES, 500);
        const firstLine = visibleRanges[0].start.line;
        const lastLine = visibleRanges[visibleRanges.length - 1].end.line;
        const startLine = Math.max(0, firstLine - paddingLines);
        const endLine = Math.min(document.lineCount - 1, lastLine + paddingLines);

        return new Range(new Position(startLine, 0), document.lineAt(endLine).range.end);
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

    protected getLastLineLength(text: string): number {
        const lines = text.split(/\r\n|\n/);

        return lines[lines.length - 1].length;
    }

    protected uniq<T>(items: T[]): T[] {
        return [...new Set(items)];
    }
}
