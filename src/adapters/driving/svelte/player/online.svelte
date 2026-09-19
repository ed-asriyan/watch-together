<script lang="ts">
    import { _ } from 'svelte-i18n';
    import Lock from '../lock.svelte';
    import { useSession } from '../session-context';

    interface Props {
        visible: boolean;
    }

    let { visible }: Props = $props();

    const { view } = useSession();
    const participants = view.participants;

    let names = $derived([
        `${$participants.self.name} (${$_('you')})`,
        ...$participants.others.map((p) => p.name),
    ].join(', '));

    let pinned: boolean = $state(false);
</script>

{#if visible || pinned}
    <div class="users">
        <Lock bind:locked={pinned} />
        { $_('player.onlineUsersList', { values: { users: names, number: $participants.total } }) }
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
