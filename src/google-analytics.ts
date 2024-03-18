const track = function (...args: any[]) {
    // @ts-ignore
    gtag(...args);
} 

export const trackClick = function (category: string) {
    track("event", "click", {
        "target": category,
    });
};

export const trackWatchedMinute = function (roomId: string) {
    track("event", "watch_minute", {
        "room_id": roomId
    });
};
