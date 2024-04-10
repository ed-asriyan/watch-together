import 'https://cdn.jsdelivr.net/npm/webtorrent@latest/webtorrent.min.js';
import { iceServers, webTorrentTrackers } from '../settings';
import { readable, writable } from 'svelte/store';

// @ts-ignore
window.WEBTORRENT_ANNOUNCE = null;

let __client: any;
let __torrent: any;
export const initWebtorrent = async function () {
    if (!navigator.serviceWorker) {
        return;
    }

    const reg = await navigator.serviceWorker.register('/sw.min.js');
    const worker = reg.active || reg.waiting || reg.installing as ServiceWorker;

    await new Promise<void>(resolve => {
        function checkState (worker: any): boolean {
            return worker.state === 'activated';
        }
        if (!checkState(worker)) {
            worker.addEventListener('statechange', ({ target }) => {
                if (checkState(target)) {
                    resolve();
                }
            });
        } else {
            resolve();
        }
    });
};

const promise = async function (obj: any, f: any, ...arg: any) {
    return new Promise((resolve, reject) => {
        f.apply(obj, [...arg, (first: any, second: any) => {
            if (second === undefined) {
                resolve(first);
            } else if (first) {
                reject(first);
            } else {
                resolve(second);
            }
        }])
    });
};

export const createWebTorrentClient = async function () {
    if (__client) {
        return __client;
    }
    // @ts-ignore
    const client = new WebTorrent({
        tracker: {
            rtcConfig: {
                iceServers,
            },
            sdpSemantics: 'unified-plan',
            bundlePolicy: 'max-bundle',
            iceCandidatePoolsize: 1
        }
    });
    await promise(client, client.loadWorker, navigator.serviceWorker.controller);
    __client = client;
};

export const sendFile = async function (file: File): Promise<string> {
    isSeeding.set(true);
    await createWebTorrentClient();
    __torrent && await promise(__client, __client.remove, __torrent);
    return new Promise(resolve => {
        const opts: any = {};
        if (webTorrentTrackers) {
            opts.announceList = webTorrentTrackers.map((tracker: string) => [tracker]);
        }
        __client.seed([file], opts, (torrent: any) => {
            __torrent = torrent;
            resolve(torrent.magnetURI);
        });
    });
};

export const getStreamUrl = async function (url: string) {
    await createWebTorrentClient();
    if (__torrent?.magnetURI !== url) {
        isSeeding.set(false);
        if (__torrent) {
            await promise(__client, __client.remove, __torrent);
        }
        __torrent = await promise(__client, __client.add, url);
    }

    while (!__torrent.files.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return promise(__torrent.files[0], __torrent.files[0].getStreamURL);
};


export const progress = readable<number>(0, set => {
    const id = setInterval(() => set(__torrent?.progress), 1000);
    return () => clearInterval(id);
});
export const peers = readable<number>(0, set => {
    const id = setInterval(() => set(__torrent?.numPeers), 1000);
    return () => clearInterval(id);
});
export const downloadSpeed = readable<number>(0, set => {
    const id = setInterval(() => set(__client?.downloadSpeed), 1000);
    return () => clearInterval(id);
});
export const uploadSpeed = readable<number>(0, set => {
    const id = setInterval(() => set(__client?.uploadSpeed), 1000);
    return () => clearInterval(id);
});
export const timeRemaining = readable<number>(0, set => {
    const id = setInterval(() => set(__torrent?.timeRemaining), 1000);
    return () => clearInterval(id);
});
export const isSeeding = writable<boolean>(false);