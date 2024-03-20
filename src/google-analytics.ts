import type { SourceType } from './normalize-link';

const track = function (...args: any[]) {
    if (import.meta.env.PROD) {
        // @ts-ignore
        gtag(...args);
    } else {
        console.log('Google Analytics:', ...args);
    }
} 

export const trackClick = function (category: string) {
    track('event', 'click', {
        'target': category,
    });
};

export interface TrackWatchedMinuteParameters {
    roomId: string;
    sourceType: SourceType;
    isExample: boolean;
}
export const trackWatchedMinute = function (params: TrackWatchedMinuteParameters) {
    track('event', 'watch_minute', {
        'room_id': params.roomId,
        'source_type': params.sourceType,
        'is_example': params.isExample
    });
};
