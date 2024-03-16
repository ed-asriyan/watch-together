export const init = function () {
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
  
    gtag('config', 'G-39LEN0SXX6');
};

export const trackClick = function (category: string) {
    gtag("event", "click", {
        "target": category,
    });
};

export const trackWatchedMinute = function (roomId: string) {
    gtag("event", "watch_minute", {
        "room_id": roomId
    });
};
