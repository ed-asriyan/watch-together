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

## Local development
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
