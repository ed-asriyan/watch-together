<script lang="ts">
    import { _ } from 'svelte-i18n';
    import type { Room } from '../../../stores/room';

    export let room: Room;
    export let visible: boolean;

    $: users = room?.users;
    $: usersList = $users.map(user => user.name);
    $: usersStr = [$_('you')].concat(usersList).join(', ');
</script>

{#if visible}
    <div class="users">
        { $_('player.onlineUsers',  { values: { users: usersStr, number: usersList.length + 1 }}) }
    </div>
{/if}

<style lang="scss">
    .users {
        position: absolute;
        left: 1rem;
        top: 1rem;
        z-index: 10;
    }
</style>