import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import CaseTransformCommand from '../../features/toggle-case/case-transform-command';

describe('CaseTransformCommand', () => {
    it('returns transformed preview text', () => {
        const command = new CaseTransformCommand(
            'upper',
            'Convert to upper case',
            (value) => value.toUpperCase(),
        );

        assert.equal(command.preview('hello world'), 'HELLO WORLD');
    });

    it('keeps command metadata', () => {
        const transform = (value: string) => value.toLowerCase();
        const command = new CaseTransformCommand('lower', 'Convert to lower case', transform);

        assert.equal(command.label, 'lower');
        assert.equal(command.description, 'Convert to lower case');
        assert.equal(command.transform, transform);
    });
});
