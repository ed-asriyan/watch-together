let referencePointOffset: number = 0;

const fetchTime = async function () {
    const response = await fetch('https://worldtimeapi.org/api/timezone/UTC');
    const data = await response.json();
    return data.unixtime;
};

const localNow = function (): number {
    return new Date().getTime() / 1000;
};

export const syncTime = async function () {
    referencePointOffset = localNow() - await fetchTime();
};

export const now = function () {
    return localNow() - referencePointOffset;
};
