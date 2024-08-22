<script lang="ts">
    import { _ } from 'svelte-i18n';
    import User from './user.svelte';
    import { myNameStore } from '../../stores/my-name';

    export let users: User[];
</script>

<div class="users uk-flex-center uk-flex uk-text-center uk-flex-middle">
    <User user={({ name: $myNameStore })} me={true} bind:myName={$myNameStore} />
    {#if users}
        {#each users as user (user.id)}
            {#if $myNameStore !== user}
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
