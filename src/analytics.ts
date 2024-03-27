import type { SourceType } from './normalize-link';

const trackRaw = function (...args: any[]) {
    if (import.meta.env.PROD) {
        // @ts-ignore
        gtag(...args);

    } else {
        console.log('Google Analytics:', ...args);
    }
};

export const init = function () {
    trackRaw('js', new Date());
    trackRaw('config', 'G-39LEN0SXX6');
};

export interface TrackUrlPaste {
    roomId: string;
    url: string;
    isExample: boolean;
}

abstract class Event<T> {
    abstract readonly name: string;
    readonly params: T;

    constructor(params: T) {
        this.params = params;
    }
};

export class ClickEvent extends Event<{
    target: string;
}> {
    readonly name: string = 'click';
}

export class WatchedMinuteEvent extends Event<{
    roomId: string;
    sourceType: SourceType;
    url: string;
    isExample: boolean;
}> {
    readonly name: string = 'watch_minute';
}

export class UrlPasteEvent extends Event<{
    roomId: string;
    url: string;
    isExample: boolean;
}> {
    readonly name: string = 'url_paste';
}

export const track = function<T> (event: Event<T>) {
    trackRaw('event', event.name, event.params);
};
