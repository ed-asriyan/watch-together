import { urlExamples } from '../settings';

export const getExampleVideo = function () {
    return urlExamples && urlExamples[Math.floor(Math.random() * urlExamples.length)];
};


export const isExample = function (url) {
    return urlExamples?.includes(url);
};

export const haveExamples = Boolean(urlExamples?.length);
