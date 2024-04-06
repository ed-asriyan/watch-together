<script lang="ts">
    import { flip } from 'svelte/animate';
    import { fade, blur, fly, slide, scale, draw } from 'svelte/transition';
    import { _ } from 'svelte-i18n';
    import User from './user.svelte';
    import type { User } from '../../stores/remote-room';
    import { myNameStore } from '../../stores/my-name';
    import { myId } from '../../stores/my-id';

    export let users: User[];
</script>

<div class="users uk-flex-center uk-flex uk-margin-top uk-text-center uk-flex-middle">
    <User user={({ name: $myNameStore, id: myId })} me={true} bind:myName={$myNameStore} />
    {#each users as user (user.id)}
        {#if $myNameStore !== user}
            <User user={user} me={false} />
        {/if}
    {/each}
</div>

<style lang="scss">
    .users {
        overflow-y: scroll;
    }
</style>
