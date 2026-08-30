# API Documentation

This is a client SPA with **no first-party HTTP server**. The "API surface" is
(a) external service contracts the client consumes and (b) the internal store
contract that bridges UI ↔ Firebase. Versions of the underlying SDKs are in
[technology-stack.md](technology-stack.md).

## External Service Surfaces

### Firebase Realtime Database (system of record)

- **Where**: `src/stores/room/*`, config in `src/settings.ts`
  (`firebaseConfig`), initialized in `stores/room/index.ts`.
- **SDK calls**: `firebase/database` — `ref`, `child`, `getDatabase`, `onValue`,
  `get`, `set` (subscribe/read/write; no transactions).
- **Access control**: README rules grant `.read` / `.write: true` on
  `room/$room_id` — **public, unauthenticated** (tracked as security debt in
  [code-quality-assessment.md](code-quality-assessment.md)).

**Data model** (rooted at `room/{roomId}`):

| Path | Shape | Written by | Notes |
|---|---|---|---|
| `room/{roomId}/url` | `{ value: string, updatedAt: number }` | Controls / Source select | current source (URL or magnet) |
| `room/{roomId}/currentTime` | `{ value: number, updatedAt: number }` | Video player / sync | playback position; drift-corrected |
| `room/{roomId}/paused` | `{ value: boolean, updatedAt: number }` | Video player | play/pause; tolerance `0.5` |
| `room/{roomId}/createdAt` | `number` | Room bootstrap | epoch (from `clock.now()`) |
| `room/{roomId}/users/{userId}` | `{ name: string, lastSeen: number }` | Presence | online set |
| `room/{roomId}/messages/{msgId}` | `{ userId, text, timestamp, type }` | Chat/reactions | ephemeral (10s TTL, client-pruned); `msgId = randomStr(6)` |
| `room/{roomId}/minutesWatched/{userId}` | `number` | Sync core | per-user watch-time |

`type` on messages is the `MessageType` enum (`regular`, `seek`, `pause`,
`play`, `selectedLocalFile`, `reaction`) from `bound-messages.ts`.

### Firebase Admin (Node ops)

- **Where**: `clean-db.js`, `stats.js` (`firebase-admin`).
- **Auth**: service account (`service-account-key.json`, uncommitted) against
  `VITE_FIREBASE_DATABASE_URL`.
- **Operations**: `clean-db.js` deletes stale rooms; `stats.js` exports room
  stats as TSV. Invoked via `make dev_clean_db` / npm `clean-db`, `stats`, and
  the `clean-db.yml` scheduled workflow.

### WebTorrent (P2P delivery)

- **Where**: `src/stores/web-torrent.ts`.
- **Loading**: dynamic ESM `import('https://esm.sh/webtorrent@2.2.1')` at runtime
  (not in `package.json`; supply-chain debt).
- **Transport**: WebRTC; `iceServers` and optional `webTorrentTrackers` (announce
  list) from `settings.ts`; media served locally through a Service Worker
  (`/sw.min.js`) via `client.createServer({ controller })`.
- **Exposed functions**: `createWebTorrentClient()`, `sendFile(file): Promise<magnetURI>`,
  `getStreamUrl(magnet): Promise<streamURL>`.
- **Readable stat stores**: `progress`, `peers`, `downloadSpeed`, `uploadSpeed`,
  `timeRemaining`, `isSeeding` (1s-poll `readable` stores).

### worldtimeapi.org (clock offset)

- **Where**: `src/stores/clock.ts`.
- **Call**: `GET https://worldtimeapi.org/api/timezone/UTC` at boot; the returned
  server time computes a local offset so `now()` is device-clock-independent.
  This underpins every timestamp used by the sync core. No timeout/fallback
  (reliability debt).

### Video proxy / extractor APIs (optional)

- **Where**: `src/components/video-player/explore-url.ts`, `src/settings.ts`.
- **Endpoints** (env-configured, all optional): `hlsProxyUrl` (HLS `.m3u8`),
  `httpProxyUrl` (HTTP proxy, base64-encoded target URL), `videoExtractorUrl`
  (link resolution). `verifyUrl` performs a CORS `HEAD` to sniff `content-type`.

### vidstack player (web component)

- **Where**: `src/components/video-player/video-player-vidstack.svelte`.
- **Integration**: `<media-player>` custom element via `vidstack/bundle` +
  `defineCustomElement`; two-way bound `currentTime`, `paused`, `muted`.

### Analytics & monitoring sinks

- **Analytics** (`src/analytics.svelte`): Google Analytics (`window.dataLayer`)
  and Amplitude (`@amplitude/analytics-browser`) — emits the typed event
  hierarchy (`ClickEvent`, `SeekedEvent`, `PausedEvent`, `PlayedEvent`,
  `UrlPasteEvent`, `MessageSentEvent`, `WatchedMinuteEvent`, `LocaleChangedEvent`).
- **Sentry** (`src/main.ts`): browser tracing + session replay when
  `VITE_SENTRY_DSN` is set.

## Internal Store Contract (the internal "API")

The `Writable<T>` family in `stores/room/` is the contract every UI component
binds to. It is the boundary between presentation and the RTDB backend.

```ts
interface Writable<T> {          // Svelte contract, implemented by all bound stores
  subscribe(run: (value: T) => void): Unsubscriber;
  set(value: T): void;
  update(fn: (value: T) => T): void;
}
```

| Type | Extra surface | Contract |
|---|---|---|
| `BoundStore<T>` | `init()` | `set` writes local + `set(ref, value)`; `onValue` pushes non-null remote → local |
| `BoundTimedStore<T>` | `updatedAt: Readable<number>`, `init()`, `tolerance` | accepts remote only if `value` changed AND `updatedAt > local.updatedAt + tolerance` |
| `BoundCurrentTime` | `updatedAt: Writable<number>`, `init()` | accepts remote when `shouldUpdateCurrentTime` (\|playbackΔ − timeΔ\| > `maximumDelta` 0.5s); throttles remote writes to `syncInterval` 10s |
| `UsersBoundStore` | presence helpers | maps `users/{userId}` subtree to online set |
| `MessagesBoundStore` | `sendMessage(text, type)` | writes `messages/{randomStr(6)}`; `subscribe` returns messages ≤ `messageTimeout` 10s old, sorted by timestamp; 3s prune job |
| `BoundMinutesWatched` | — | accrues per-user watch-time keyed to `currentTime` |

`Room` (`stores/room/index.ts`) is the aggregate root that constructs and
`init()`s these over `room/{roomId}` subrefs. Component-level responsibilities
and dependencies are catalogued in [component-inventory.md](component-inventory.md);
the message/reaction/join/sync flows are diagrammed in
[architecture.md](architecture.md).
