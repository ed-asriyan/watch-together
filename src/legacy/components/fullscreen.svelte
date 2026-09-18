
<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { fade } from 'svelte/transition';


    const fullscreen = function () {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            document.documentElement.requestFullscreen();
        }
    }
</script>

<img transition:fade class="fullscreen pointer" onclick={fullscreen} src="https://img.icons8.com/?size=100&id=bVZzgZnZ6TqW&format=png&color=FFFFFF"
    uk-tooltip={ $_('fullscreen') }
/>

<style lang="scss">
    .fullscreen {
        position: fixed;
        z-index: 20;
        bottom: 0.5rem;
        right: 0.7rem;
        padding: 3px;

        height: 40px;

        &:hover {
            opacity: 0.5;
            background-color: rgba(245, 245, 245, 0.376);
            border-radius: 29%;
        }
    }
</style>