<script lang="ts">
    import { onDestroy } from 'svelte';
    import { _ } from 'svelte-i18n';
    import { initWebtorrent } from '../stores/web-torrent';
    import Loader from './loader.svelte';
    import { Room } from '../stores/room';
    import { syncTime } from '../stores/clock';
    import RoomPage from './room.svelte';
    import LanguageSelector from './language-selector.svelte';
        
    export let roomId: string;

    let previousRoom: Room;

    const destroy = async function () {
        previousRoom && await previousRoom.destruct();
    };
    onDestroy(destroy);

    let isTimeSynced = false;
    const initTime = async function () {
        if (!isTimeSynced) {
            try {
                await syncTime();
                isTimeSynced = true;
            } catch {
            }
        }
    };

    const init = async function (roomId: string): Promise<Room> {
        await initTime();
        await initWebtorrent();
        await destroy();
        previousRoom = new Room(roomId);
        await previousRoom.init();
        return previousRoom;
    };
</script>

<div class="uk-flex-1 uk-flex uk-flex-center uk-flex-middle uk-flex-column">
    {#await init(roomId)}
        <Loader/>
    {:then room}
        <RoomPage room={room} />
    {:catch e}
        <h3 class="uk-margin-medium-bottom uk-text-leads">{ $_('error.description') } 💩</h3>
        <button class="uk-button uk-button-default" on:click={() => location.reload()}>{ $_('error.reload') }</button>
        <code class="uk-margin-medium-top uk-text-smsall">{ e.stack || e }</code>
    {/await}
</div>
