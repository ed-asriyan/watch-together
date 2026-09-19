/**
 * Entry point. Builds the session from real adapters and hands it to the UI.
 */
import 'uikit/dist/js/uikit';
import { mount } from 'svelte';
import { initI18n } from '../i18n';
import App from '../adapters/driving/svelte/app.svelte';
import '../adapters/driving/svelte/app.scss';
import { buildSession } from './container';

initI18n();

export default mount(App, {
    target: document.getElementById('app') as HTMLElement,
    props: { session: buildSession() },
});
