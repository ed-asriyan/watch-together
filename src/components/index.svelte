<script lang="ts">
    import { onDestroy, onMount } from 'svelte';
    import { get } from 'svelte/store';
    import { _ } from 'svelte-i18n';
    import { Room } from '../stores/room';
    import RoomPage from './room.svelte';

    export let roomId: string;
    export let headerHeight: number;

    let previousRoom: Room;
    const destroy = async function () {
        previousRoom && await previousRoom.destruct();
    };
    onDestroy(destroy);

    const isDesktop = window.matchMedia('(min-width: 960px)').matches;

    const init = async function (roomId: string): Promise<Room> {
        destroy();
        previousRoom = new Room(roomId);
        await previousRoom.init();
        if (isDesktop && get(previousRoom.link)) {
            setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 1000);     
        }
        return previousRoom;
    };

    onMount(() => {
        isDesktop && scroll('bottom', false);
    });

    const scroll = function (direction: 'top' | 'bottom', smooth: boolean = true) {
        window.scrollTo({
            top: direction === 'top' ? 0 : 9999,
            behavior: smooth ? 'smooth' : 'instant'
        });
    };
</script>

<div class="uk-flex-1 uk-flex uk-flex-center uk-flex-middle uk-flex-column">
    {#await init(roomId)}
        <RoomPage roomId={roomId} />
    {:then room}
        <RoomPage roomId={roomId} room={room} headerHeight={headerHeight} />
    {:catch e}
        <h3 class="uk-margin-medium-bottom uk-text-leads">{ $_('error.description') } 💩</h3>
        <button class="uk-button uk-button-default" on:click={() => location.reload()}>{ $_('error.reload') }</button>
        <code class="uk-margin-medium-top uk-text-smsall">{ e.stack || e }</code>
    {/await}
</div>
