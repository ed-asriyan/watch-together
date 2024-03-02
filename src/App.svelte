<script lang="ts">
    import 'uikit/dist/js/uikit';
    import GitHub from './components/github.svelte';
    import { init } from './google-analytics';
    import randomStr from './random-str';
    import './app.scss';

    import Page from './components/index.svelte';

    init();

    let roomId = document.location.hash?.slice(1);
    if (!roomId) {
        roomId = randomStr(6);
        document.location.hash = `#${roomId}`;
    }
</script>

<svelte:head>
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-39LEN0SXX6"></script>
</svelte:head>

<GitHub/>

<Page roomId={roomId}/>
