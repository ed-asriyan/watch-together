export const init = function () {
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
  
    gtag('config', 'G-39LEN0SXX6');
};

export const trackClick = function (label: string) {
    gtag("event", "click", {
        "event_label": label
    });
}
