<script lang="ts">
    import { _ } from 'svelte-i18n';
    import Participant from './participant.svelte';
    import { useSession } from '../session-context';

    const { view } = useSession();
    const participants = view.participants;
</script>

<div class="users uk-flex-center uk-flex uk-text-center uk-flex-top">
    <Participant
        name={$participants.self.name}
        colour={$participants.self.colour}
        canEdit={true}
        status={$_('you')}
    />
    {#each $participants.others as participant (participant.id)}
        <Participant
            name={participant.name}
            colour={participant.colour}
            canEdit={false}
            status={$_('users.online')}
        />
    {/each}
</div>
