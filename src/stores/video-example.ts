import { urlExamples } from '../settings';

export const getExampleVideo = function (): string {
    return urlExamples && urlExamples[Math.floor(Math.random() * urlExamples.length)];
};

export const isExample = function (url: string): boolean {
    return !!urlExamples?.find(example => example.includes(url));
};

export const haveExamples = Boolean(urlExamples?.length);
