import { SourceType, type Source } from '../normalize-source';
import { urlExamples } from '../settings';

export const getExampleVideo = function (): string {
    return urlExamples && urlExamples[Math.floor(Math.random() * urlExamples.length)];
};

export const isExample = function (source: Source): boolean {
    let pattern: string;
    switch (source.type) {
        case SourceType.YouTube:
            pattern = source.src.split('/')[1];
            break;
        default:
            pattern = source.src;
    }
    return !!urlExamples?.find(example => example.includes(pattern));
};

export const haveExamples = Boolean(urlExamples?.length);
