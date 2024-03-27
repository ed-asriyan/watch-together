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
      1. Copy firebase config to [firebase-config.json](./src/firebase/firebase-config.json)
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
2. Setup [Google Analytics](https://analytics.google.com) (should be created with Firebase)
   1. Copy Google Analytics cofiguration to [google-analytics.js](./src/analytics.js)
3. Setup [Sentry](https://sentry.io) account and create Svelte project
   1. Paste Sentry configuration to [main.ts](./src/main.ts)

## Local development
1. Install docker
2. Install dependencies:
   ```console
   make install
   ```

Now you can run the server locally:
```console
make start
```

## GitHub Actions
* Each push to `master` triggers deployment to production
* Every 1 day of a month, teams last updated more than 31 days ago are deleted
