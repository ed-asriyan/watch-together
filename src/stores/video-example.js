import videos from './video-examples.json' assert { type: "json" };;

export const getExampleVideo = function () {
    return videos[Math.floor(Math.random() * videos.length)];
};


export const isExample = function (url) {
    return videos.includes(url);
};
