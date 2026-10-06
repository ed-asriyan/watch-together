# Movie Together [![CD](https://github.com/ed-asriyan/watch-together/actions/workflows/CD.yml/badge.svg)](https://github.com/ed-asriyan/watch-together/actions/workflows/CD.yml)
Web application built on Svelte.js and Firebase for watching movies together on different devices.

<h3 align="center">
    <a href="https://watchtogether.online" target="_blank">👉 watchtogether.online 👈</a>
</h3>

https://github.com/ed-asriyan/watch-together/assets/7848847/2d2799f1-cc79-4732-8657-74f78268b8c2

# Setup
## Init
1. Setup Firebase project
   1. Create Firebase Realtime database: https://console.firebase.google.com
   2. Copy Firebase project cofiguration
      1. Copy firebase config values to [.env](.env) file
      2. Copy service account key to `FIREBASE_SERVICE_ACCOUNT_KEY` repository secret
   3. Setup Firebase Realtime database rules:
      ```json
      {
        "rules": {
          "room": {
            "$room_id": {
              ".read": true,
              ".write": true
            }
          },
          "$other": {
            ".read": false,
            ".write": false
          }
        }
      }
      ```
   4. Add domain where you're going to host the website to "Authorized Domains" section of "Authentication"
2. *(optional)* Setup [Google Analytics](https://analytics.google.com) (should be created with Firebase)
   1. Copy Google Analytics meashurement ID to [.env](.env) file
3.  *(optional)* Setup [Sentry](https://sentry.io) account and create Svelte project
   1. Copy Sentry DSN value to [.env](./env) file
4. Create `ENV_FILE_CONTENT` repository variable and copy content of filled by you [.env](.env) file in it

## Local development without Firebase
The app can run against a local backend instead of Firebase: a small Node
process (`backend/local`) that holds rooms in memory and shares them over a
WebSocket. No Firebase project, no credentials.

```console
npm ci
npm run dev:local
```

This starts the backend on port `8787` and the Vite dev server, pointed at each
other. Open the printed URL in **two different browsers** (or a normal and an
incognito window, or a phone on the same network) to be two participants. Two
tabs of the same browser share `localStorage` and therefore one participant id.

To run the pieces separately: `npm run backend:local`, then
`VITE_LOCAL_BACKEND_URL=ws://localhost:8787 npm run dev`. When
`VITE_LOCAL_BACKEND_URL` is set the app uses the local backend even if Firebase
is configured. `GET http://localhost:8787/rooms/<room-id>` shows a room's state.

## Tests
```console
npm test           # domain, contract and scenario tests (vitest, no browser)
npm run test:e2e   # end-to-end: real Chromium, real player, local backend
```

The end-to-end suite starts its own local backend, a media server for
`e2e/fixtures` and the dev server. Each viewer is a separate browser context,
and every action goes through the player's own controls. Viewers can be given
network latency and a skewed clock (`e2e/support/viewer.ts`), because that is
where synchronization actually breaks — localhost has neither.

## Local development (Docker)
1. Install docker
2. Install dependencies:
   ```console
   make dev_install
   ```

Now you can run the dev server locally:
```console
make dev_serve
```

Or generate production bundle:
```console
make prod_build_bundle
```

## Deployment
### CD
Each push to `master` triggers [CD.yml](./.github/workflows/CD.yml) pipeline that builds production bundle and published it on
GitHub Pages. To make it work you must have

GitHub repository environment variables:
* `ENV_FILE_CONTENT` with content of filled [.env](./.env)

### Auto clean up
Every 1 day of a month, teams last updated more than 31 days ago are deleted by
[clean-db.yml](./.github/workflows//clean-db.yml) workflow. To make it work you must have:

GitHub repository environment variables:
* `ENV_FILE_CONTENT`

GitHub repository secrets:
* `FIREBASE_SERVICE_ACCOUNT_KEY`
