import { readable, writable } from 'svelte/store';
import { iceServers, webTorrentTrackers } from '../settings';
import { sleep } from '../utils';

// @ts-ignore
window.WEBTORRENT_ANNOUNCE = null;

let __client: any;
let __torrent: any;
let serviceWorkerRegistration: ServiceWorkerRegistration;;

const isServiceWorkerActivated = async function ()  {
    return (await navigator.serviceWorker.ready)?.active?.state === 'activated';
}

const initWebtorrent = async function () {
    if (!navigator.serviceWorker || serviceWorkerRegistration) {
        return;
    }

    const registration = await navigator.serviceWorker.register('/sw.min.js');

    while (true) {
        if (await isServiceWorkerActivated()) {
            serviceWorkerRegistration = registration;
            return;
        } else {
            await sleep(1000);
        }
    }
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
    const [{ default: WebTorrent }] = await Promise.all([
        // doc: https://github.com/webtorrent/webtorrent/blob/v2.2.1/docs/api.md
        import('https://esm.sh/webtorrent@2.2.1'),
        initWebtorrent(),
    ]);
    // @ts-ignore
    const client = new WebTorrent({
        tracker: {
            rtcConfig: {
                iceServers,
            },
            sdpSemantics: 'unified-plan',
            bundlePolicy: 'max-bundle',
            iceCandidatePoolsize: 1
        },
        torrentPort: 12318, // WTF?? https://github.com/webtorrent/webtorrent/issues/1071#issuecomment-374161952
    });
    client.createServer({ controller: serviceWorkerRegistration });
    __client = client;
};

export const sendFile = async function (file: File): Promise<string> {
    isSeeding.set(true);
    await createWebTorrentClient();
    __torrent && await promise(__client, __client.remove, __torrent.magnetURI);
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
    await initWebtorrent();
    await createWebTorrentClient();
    if (__torrent?.magnetURI !== url) {
        isSeeding.set(false);
        if (__torrent) {
            await promise(__client, __client.remove, __torrent.magnetURI);
        }
        __torrent = await promise(__client, __client.add, url);
    }

    while (!__torrent.files.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return __torrent.files[0].streamURL;
};


export const progress = readable<number>(0, set => {
    const id = setInterval(() => set(__torrent?.progress), 1000);
    return () => clearInterval(id);
});
export const peers = readable<number>(0, set => {
    const id = setInterval(() => set(__torrent?.numPeers || 0), 1000);
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
