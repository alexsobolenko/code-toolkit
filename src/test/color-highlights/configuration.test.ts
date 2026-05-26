import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {installVscodeMock, setAppInstance} from '../helpers/vscode';

const restoreVscodeMock = installVscodeMock();
const {default: Configuration} = require('../../features/color-highlights/configuration');

describe('Color highlights Configuration', () => {
    it('reads color highlight settings from app configuration', () => {
        const values: Record<string, unknown> = {
            'color-highlight.css-names': false,
            'color-highlight.enabled': false,
            'color-highlight.hex': false,
            'color-highlight.hsl': false,
            'color-highlight.mode': 'dot',
            'color-highlight.rgb': true,
        };
        setAppInstance({
            config: (key: string, defaultValue: unknown) => values[key] ?? defaultValue,
        });
        const config = new Configuration();

        assert.equal(config.enabled, false);
        assert.equal(config.mode, 'dot');
        assert.equal(config.highlightHex, false);
        assert.equal(config.highlightRgb, true);
        assert.equal(config.highlightHsl, false);
        assert.equal(config.highlightCssNames, false);
    });

    it('falls back to background mode for an invalid configured mode', () => {
        setAppInstance({
            config: (key: string, defaultValue: unknown) => (
                key === 'color-highlight.mode' ? 'invalid' : defaultValue
            ),
        });

        assert.equal(new Configuration().mode, 'background');
    });
});

restoreVscodeMock();
