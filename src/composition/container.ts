/**
 * The composition root: the only file allowed to name concrete classes.
 *
 * Everything above it sees ports. Swapping Firebase for something else, or the
 * real gateway for the in-memory one, is an edit here and nowhere else — which
 * is the claim the whole refactor was for.
 */
import { initializeApp } from 'firebase/app';
import * as Sentry from '@sentry/svelte';
import * as amplitude from '@amplitude/analytics-browser';

import { createWatchSession } from '../domains/watch-session/ports';
import { createRoomReplica } from '../domains/watch-session/model/room-replica';
import { DEFAULT_SYNC_POLICY } from '../domains/watch-session/model/sync-policy';

import { FirebaseRoomGateway } from '../adapters/driven/firebase/room-gateway';
import { FirebaseServerOffsetClock } from '../adapters/driven/firebase/clock';
import { SystemClock } from '../adapters/driven/browser/clock';
import { BroadcastChannelRoomGateway } from '../adapters/driven/memory/broadcast-room-gateway';
import { VidstackMediaPlayer } from '../adapters/driven/vidstack/media-player';
import { CompositeMediaResolver } from '../adapters/driven/media/resolver';
import { WebTorrentDelivery } from '../adapters/driven/media/webtorrent';
import { classify } from '../adapters/driven/media/classify';
import { BrowserScheduler } from '../adapters/driven/browser/scheduler';
import { LocalStorageProfileStore } from '../adapters/driven/browser/profile-store';
import { CryptoIdGenerator } from '../adapters/driven/browser/id-generator';
import { HashLocation } from '../adapters/driven/browser/location';
import { AmplitudeGaTelemetry } from '../adapters/driven/telemetry/telemetry';
import { SentryErrorReporter } from '../adapters/driven/sentry/error-reporter';
import type { Session } from '../adapters/driving/svelte/session-context';

import { environment, firebaseConfig, isProduction, nicknames, proxies, sentry, telemetry, torrents } from './config';

export const buildSession = (): Session => {
    const hasFirebase = Boolean(firebaseConfig.databaseURL);
    const app = hasFirebase ? initializeApp(firebaseConfig) : null;

    if (sentry.dsn) {
        // Same integrations and sample rates as before the refactor: dropping
        // tracing and session replay would be a silent loss of the only
        // production observability this app has.
        Sentry.init({
            dsn: sentry.dsn,
            environment,
            integrations: [
                Sentry.browserTracingIntegration(),
                Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
            ],
            tracesSampleRate: 1.0,
            tracePropagationTargets: ['localhost', location.host],
            replaysSessionSampleRate: 0.1,
            replaysOnErrorSampleRate: 1.0,
        });
    }
    if (isProduction && telemetry.amplitudeApiKey) {
        amplitude.init(telemetry.amplitudeApiKey, { autocapture: true });
    }

    const errors = new SentryErrorReporter(Boolean(sentry.dsn));
    const clock = app ? new FirebaseServerOffsetClock(app) : new SystemClock();

    const player = new VidstackMediaPlayer();
    const resolver = new CompositeMediaResolver(proxies, new WebTorrentDelivery(torrents));

    const ids = new CryptoIdGenerator();

    const session = createWatchSession({
        // Without a configured database the app still runs, against a room
        // shared between tabs of this browser. `npm run dev` therefore works
        // with no credentials at all, two tabs included — and it is the same
        // port contract the Firebase gateway is held to.
        gateway: app ? new FirebaseRoomGateway(app, classify) : new BroadcastChannelRoomGateway(),
        player,
        resolver,
        clock,
        scheduler: new BrowserScheduler(clock),
        profiles: new LocalStorageProfileStore(ids, nicknames),
        ids,
        telemetry: new AmplitudeGaTelemetry(isProduction, telemetry.measurementId),
        errors,
        location: new HashLocation(),
        replicas: { create: createRoomReplica },
        // Without a shared clock there is nothing to be synchronized against
        // and no other device to disagree with, so the guard that would make
        // the session read-only is switched off rather than silently blocking
        // every write.
        policy: app ? DEFAULT_SYNC_POLICY : { ...DEFAULT_SYNC_POLICY, requireClockSync: false },
    });

    return { commands: session, view: session.view, player };
};
