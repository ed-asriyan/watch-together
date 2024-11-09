<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { me } from '../../../stores/me';
    import type { Room } from '../../../stores/room';
    import Lock from '../lock.svelte';

    interface Props {
        room: Room;
        visible: boolean;
    }

    let { room, visible }: Props = $props();

    let users = $derived(room?.users);
    let usersList = $derived($users.map(user => user.name));
    let usersStr = $derived([`${$me.name} (${$_('you')})`].concat(usersList).join(', '));

    let forceLock: boolean = $state(false);
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