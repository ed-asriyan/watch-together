<script lang="ts">
    import '../app.scss';
    import GitHub from './github.svelte';
    import { init } from '../google-analytics';
    import { onMount } from 'svelte';

    onMount(() => {
        init();
    });
</script>

<svelte:head>
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-39LEN0SXX6"></script>
</svelte:head>

<GitHub/>

<slot />
