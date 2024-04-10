import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        svelte(),
        // https://adueck.github.io/blog/caching-everything-for-totally-offline-pwa-vite-react
        VitePWA({
            workbox: {
                globPatterns: ["**/*"],
            },
            includeAssets: [
                "**/*",
            ],
            manifest: {
                "name": "Watch Together",
                "short_name": "WatchTogether",
                "icons": [
                    {
                        "src": "/android-chrome-192x192.png",
                        "sizes": "192x192",
                        "type": "image/png"
                    },
                    {
                        "src": "/android-chrome-512x512.png",
                        "sizes": "512x512",
                        "type": "image/png"
                    }
                ],
                "theme_color": "#000000",
                "background_color": "#000000",
                "display": "standalone",
                "start_url":"/",
                "screenshots": [
                    {
                        "src": "screenshots/1.jpeg",
                        "sizes": "1170x2391",
                        "type": "image/jpeg",
                        "form_factor": "narrow"
                    },
                    {
                        "src": "screenshots/2.jpeg",
                        "sizes": "1170x2391",
                        "type": "image/jpeg",
                        "form_factor": "narrow"
                    },
                    {
                        "src": "screenshots/3.jpeg",
                        "sizes": "2480x1740",
                        "type": "image/jpeg",
                        "form_factor": "wide"
                    },
                    {
                        "src": "screenshots/4.jpeg",
                        "sizes": "2480x1740",
                        "type": "image/jpeg",
                        "form_factor": "wide"
                    }
                ],
                "handle_links": "preferred",
                "categories": [
                    "entertainment",
                    "utilities"
                ]
            }
        })
    ],
    publicDir: './static',
})
