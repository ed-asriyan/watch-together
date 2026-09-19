<script lang="ts">
    import { _ } from 'svelte-i18n';
    import Interpolator from '../interpolator.svelte';
    import Participants from './participants.svelte';
    import { useSession } from '../session-context';

    interface Props {
        highlight: boolean;
    }

    let { highlight }: Props = $props();

    const { commands, view } = useSession();
    const invite = view.invite;

    let copied = $state(false);

    const flash = function () {
        copied = true;
        setTimeout(() => (copied = false), 4000);
    };

    const copy = async function () {
        commands.recordInteraction('link_copy');
        try {
            await navigator.clipboard.writeText($invite.url);
            flash();
        } catch { /* denied without a gesture; the link is on screen anyway */ }
    };

    const primary = async function () {
        if ($invite.canShare) {
            commands.recordInteraction('link_share');
            try {
                await navigator.share({ title: 'Watch Together', url: $invite.url });
            } catch { /* user dismissed the sheet */ }
        } else {
            await copy();
        }
    };
</script>

<div>{ $_('invite.description') }</div>
<div class="uk-text-center uk-margin-top">
    <div class="uk-text-center">
        {#if copied}
            { $_('invite.linkHasBeenCopied') }
        {:else}
            <div
                class="uk-button-link uk-text-lowercase pointer"
                class:gradient-text={highlight}
                class:uk-text-bold={highlight}
                uk-tooltip={$invite.canShare ? $_('invite.clickToShare') : $_('invite.clickToCopy')}
                onclick={primary}
            >
                { $invite.url }
            </div>
        {/if}
    </div>

    <div class="uk-text-small uk-text-muted">
        {#if copied}
            <br/>
        {:else if $invite.canShare}
            <Interpolator text={$_('invite.clickToShareHint')}>
                {#snippet children({ data })}
                    {#if data.name === 'link'}
                        <span class="uk-text-secondary pointer" onclick={copy}>{ data.text }</span>
                    {/if}
                {/snippet}
            </Interpolator>
        {:else}
            { $_('invite.copyLink') }
        {/if}
    </div>
</div>

<hr class="uk-margin-bottom"/>

<div class="uk-width-1-1">
    <div class="uk-text-center uk-text-muted uk-text-small uk-margin-small-bottom">
        { $_('player.onlineUsers') }
    </div>
    <Participants />
</div>
