<script lang="ts">
    import { onDestroy } from 'svelte';
    import { _ } from 'svelte-i18n';
    import { Room } from '../stores/room';
    import RoomPage from './room.svelte';

    export let roomId: string;

    let previousRoom: Room;
    const destroy = async function () {
        previousRoom && await previousRoom.destruct();
    };
    onDestroy(destroy);

    const init = async function (roomId: string): Promise<Room> {
        destroy();
        previousRoom = new Room(roomId);
        await previousRoom.init();
        return previousRoom;
    };
</script>

<div class="uk-flex-1 uk-flex uk-flex-center uk-flex-middle uk-flex-column">
    {#await init(roomId)}
        <RoomPage roomId={roomId} room={null} />
    {:then room}
        <RoomPage roomId={roomId} room={room} />
    {:catch e}
        <h3 class="uk-margin-medium-bottom uk-text-leads">{ $_('error.description') } 💩</h3>
        <button class="uk-button uk-button-default" on:click={() => location.reload()}>{ $_('error.reload') }</button>
        <code class="uk-margin-medium-top uk-text-smsall">{ e.stack || e }</code>
    {/await}
</div>
