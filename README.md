# Movie Together
Web application built on Svelte.js and Firebase for whatching movies together on different devices.

<h3 align="center">
    <a href="https://ed-asriyan.github.io/movie-together">👉 Live demo 👈</a>
</h3>

https://github.com/ed-asriyan/movie-together/assets/7848847/08522a1e-31d5-4138-9150-c4574321536a

# Setup
To setup/deploy new version of the app, you should:
1. Setup Firebase project
   1. Create Firebase Realtime database: https://console.firebase.google.com
   2. Copy Firebase project cofiguration to [firebase-config.json](./src/firebase-config.json)
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
2. Setup Google Analytics (should be created with Firebase)
   1. Copy Google Analytics cofiguration to [google-analytics.js](./src/google-analytics.js)
3. Install node.js v18 or newer
4. Install npm dependencies:
   ```console
   npm ci
   ```

Now you can run the server locally:
```console
npm run dev
```

Or build static files to serve:
```console
npm rub build
```
