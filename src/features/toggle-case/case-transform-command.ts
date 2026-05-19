import {StringProcessor} from '../../types';

export default class CaseTransformCommand {
    public constructor(
        public readonly label: string,
        public readonly description: string,
        public readonly transform: StringProcessor,
    ) {}

    public preview(text: string): string {
        return this.transform(text);
    }
}
