<script lang="ts">
    import { _ } from 'svelte-i18n';
    import User from './user.svelte';
    import { me } from '../../stores/me';

    export let users: User[];
</script>

<div class="users uk-flex-center uk-flex uk-text-center uk-flex-middle">
    <User user={({ name: $me.name })} me={true} bind:myName={$me.name} />
    {#if users}
        {#each users as user (user.id)}
            {#if $me.id !== user.id}
                <User user={user} me={false} status={ $_('users.online')} />
            {/if}
        {/each}
    {/if}
</div>

<style lang="scss">
    .users {
        overflow-y: hidden;
    }
</style>
