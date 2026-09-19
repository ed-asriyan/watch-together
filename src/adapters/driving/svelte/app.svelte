<script lang="ts">
    import { onMount } from 'svelte';
    import { _ } from 'svelte-i18n';
    import Room from './room.svelte';
    import Loader from './loader.svelte';
    import { provideSession, type Session } from './session-context';
    import { ui } from '../../../composition/config';

    interface Props {
        session: Session;
    }

    let { session }: Props = $props();

    provideSession(session);

    const connection = session.view.connection;

    // Routing is NOT done here. `resume()` decides which room to enter from the
    // address bar, the stored last room, or a fresh id, and keeps following the
    // URL afterwards. Legacy did all of that inline in App.svelte, including
    // writing to localStorage and force-prefixing ids with `test_`.
    // Note: no teardown here. `WatchSession` is owned by the composition root,
    // which created it and is the only thing entitled to dispose of it. A view
    // that disposes its own session would take the app down on a re-render.
    onMount(() => {
        session.commands.resume();
    });
</script>

{#if !ui.isProduction}
    <span class="uk-position-fixed uk-text-warning" style:top="0" style:left="0" style:z-index="1000">
        { ui.environment }
    </span>
{/if}

<div class="uk-section-secondary window-height uk-flex uk-flex-column">
    {#if $connection.state === 'connecting'}
        <div class="uk-flex-1 uk-flex uk-flex-center uk-flex-middle uk-flex-column">
            <Loader />
        </div>
    {:else if $connection.state === 'error'}
        <div class="uk-flex-1 uk-flex uk-flex-center uk-flex-middle uk-flex-column">
            <h3 class="uk-margin-medium-bottom uk-text-lead">{ $_('error.description') } 💩</h3>
            <button class="uk-button uk-button-default" onclick={() => location.reload()}>
                { $_('error.reload') }
            </button>
        </div>
    {:else}
        <Room />
    {/if}
</div>

<style lang="scss">
    .window-height { min-height: 100lvh; }
    .uk-section-secondary { background-color: #000; }
</style>
