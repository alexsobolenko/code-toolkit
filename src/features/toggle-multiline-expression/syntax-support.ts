import type {ExpressionKind} from '../../types';

export default class SyntaxSupport {
    public isJavaScriptLike(languageId: string): boolean {
        return [
            'javascript',
            'javascriptreact',
            'typescript',
            'typescriptreact',
        ].includes(languageId);
    }

    public isPhp(languageId: string): boolean {
        return languageId === 'php';
    }

    public isTrailingCommaSupported(languageId: string, kind: ExpressionKind): boolean {
        if (this.isJavaScriptLike(languageId)) {
            return true;
        }

        if (this.isPhp(languageId)) {
            return kind === 'array' || kind === 'function';
        }

        return false;
    }

    public isControlKeyword(token: string): boolean {
        return [
            'catch',
            'for',
            'foreach',
            'if',
            'match',
            'switch',
            'while',
            'with',
        ].includes(token);
    }

    public isExpressionPrefixKeyword(token: string): boolean {
        return [
            'case',
            'return',
            'throw',
            'yield',
        ].includes(token);
    }

    public isOpenBracket(character: string): boolean {
        return ['(', '[', '{'].includes(character);
    }

    public isCloseBracket(character: string): boolean {
        return [')', ']', '}'].includes(character);
    }

    public getCloseBracket(openBracket: string): string {
        const brackets: Record<string, string> = {
            '(': ')',
            '[': ']',
            '{': '}',
        };

        return brackets[openBracket];
    }
}
