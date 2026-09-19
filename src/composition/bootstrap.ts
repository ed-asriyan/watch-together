/**
 * Composition root.
 *
 * The only module allowed to know about concrete implementations. Today it
 * wires the Svelte driving adapter to a stub, because no driven adapter exists
 * yet; when they do, this is where `FirebaseRoomGateway`, `VidstackMediaPlayer`,
 * `CompositeMediaResolver` and the rest get constructed and handed to
 * `createWatchSession`.
 */
import 'uikit/dist/js/uikit';
import { mount } from 'svelte';
import { initI18n } from '../i18n';
import App from '../adapters/driving/svelte/app.svelte';
import '../adapters/driving/svelte/app.scss';
import { createStubPlayerSurface, createStubSession } from './stub-session';

initI18n();

const roomId = location.hash.slice(1) || 'stub';

const session = createStubSession(roomId);

export default mount(App, {
    target: document.getElementById('app') as HTMLElement,
    props: {
        session: {
            commands: session,
            view: session.view,
            player: createStubPlayerSurface(),
        },
    },
});
