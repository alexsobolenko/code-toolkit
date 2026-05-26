import App from '../../app';
import type {ColorHighlightMode} from '../../types';

export default class Configuration {
    public get enabled(): boolean {
        return !!App.instance.config('color-highlight.enabled', true);
    }

    public get mode(): ColorHighlightMode {
        const mode = App.instance.config('color-highlight.mode', 'background');
        if (mode === 'background' || mode === 'border' || mode === 'dot') {
            return mode;
        }

        return 'background';
    }

    public get highlightHex(): boolean {
        return !!App.instance.config('color-highlight.hex', true);
    }

    public get highlightRgb(): boolean {
        return !!App.instance.config('color-highlight.rgb', true);
    }

    public get highlightHsl(): boolean {
        return !!App.instance.config('color-highlight.hsl', true);
    }

    public get highlightCssNames(): boolean {
        return !!App.instance.config('color-highlight.css-names', true);
    }
}
