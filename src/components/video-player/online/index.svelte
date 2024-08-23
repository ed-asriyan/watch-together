<script lang="ts">
    import { _ } from 'svelte-i18n';
    import type { Room } from '../../../stores/room';
    import Lock from '../lock.svelte';

    export let room: Room;
    export let visible: boolean;

    $: users = room?.users;
    $: usersList = $users.map(user => user.name);
    $: usersStr = [$_('you')].concat(usersList).join(', ');

    let forceLock: boolean = false;
</script>

{#if visible || forceLock}
    <div class="users">
        <Lock bind:locked={forceLock} />
        { $_('player.onlineUsers',  { values: { users: usersStr, number: usersList.length + 1 }}) }
    </div>
{/if}

<style lang="scss">
    .users {
        position: absolute;
        left: 1rem;
        top: 1rem;
        z-index: 100;
    }
</style>