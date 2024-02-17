<script lang="ts">
    import { browser } from '$app/environment';
    import { page } from '$app/stores';
    import VideoView from './video-view.svelte';
    import { url, time, paused } from '../room';
    import { database } from '../firebase';
    import { ref, set, onValue, get, child, update } from "firebase/database";
    import { get as getStore } from 'svelte/store';

    const timeDeltaThresholdInward = 1;
    const timeDeltaThresholdOutward = 5;

    let roomId = $page.url.hash?.slice(1);
    if (!roomId) {
        roomId = 'rest';
        if (browser) {
            window.location.hash = `#${roomId}`;
        }
    }

    let lastTime = getStore(time);
    let initLoading = true;
    (async function () {
        const roomRef = child(ref(database), `room/${roomId}`);
        const initSnapshot = await get(roomRef);
        if (initSnapshot.exists()) {
            const initRoom = initSnapshot.val();
            url.set(initRoom.url);
            time.set(initRoom.time);
            paused.set(initRoom.paused);
        }

        initLoading = false;

        onValue(roomRef, (snapshot) => {
            const room = snapshot.val();
            url.set(room.url);
            paused.set(room.paused);
            
            if (Math.abs(room.time - $time) > timeDeltaThresholdInward) {
                lastTime = room.time;
                time.set(room.time);
            }
        });

        paused.subscribe((paused) => {
            update(roomRef, { paused });
        });

        url.subscribe((url) => {
            update(roomRef, { url });
        });

        time.subscribe((time) => {
            if (Math.abs(lastTime - time) > timeDeltaThresholdOutward) {
                lastTime = time;
                update(roomRef, { time });
            }
        });
    }());


</script>

<svelte:head>
    <title>Movie Together</title>
</svelte:head>



{#if initLoading}
    loading
{:else}
    <div class="container uk-flex">
        <div class="content uk-flex uk-flex-column uk-flex-center uk-flex-middle">
            <div class="title uk-text-left">
                <h1 class="uk-heading-large">Movie Together</h1>
                <hr class="uk-divider-icon">
            </div>
            <input bind:value={$url} class="uk-input" placeholder="Video URL" />
            {#if $url}
                <VideoView bind:paused={$paused} bind:time={$time} bind:url={$url}/>
            {/if}
        </div>
    </div>
{/if}

<style lang="scss">
        $title-height: 5rem;

:global(html, body) {
    margin: 0;
    padding: 0;
    overflow-y: scroll;
    min-height: 100hv;
}

.container {
    min-height: 100vh;
    padding: 0 1rem;
    background-color: hsl(0, 0%, 96%);

    & .content {
        flex: 1;
    }
}
</style>
