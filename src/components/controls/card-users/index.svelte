<script lang="ts">
    import { _ } from 'svelte-i18n';
    import Interpolator from '../../interpolator.svelte';
    import { track, ClickEvent } from '../../../analytics.svelte';
    import type { Room } from '../../../stores/room';
    import Loader from '../../loader.svelte';
    import Users from './users/index.svelte';
    import { readable } from 'svelte/store';

    interface Props {
        room: Room;
        highlight: boolean;
    }

    let { room, highlight }: Props = $props();

    let users = $derived(room?.users || readable([]));
    let copyTumbler: boolean = $state(false);

    const copyToClipboard = function () {
        const input = document.createElement('input');
        input.setAttribute('value', url);
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        trigger();
    };

    let url = $derived(!!room && `${location.protocol}//${location.host}${location.pathname}#${room.id}`); 
    const canShare: boolean = Boolean(navigator.share);

    const linkClick = function () {
        if (canShare) {
            navigator.share({
                title: 'Watch Together',
                url,
            });
        } else {
            copyToClipboard();
        }
        track(new ClickEvent(room, { target: 'link_share' }));
    };

    const trigger = function () {
        copyTumbler = true;
        setTimeout(() => copyTumbler = false, 4000);
    };
</script>

<div>{ $_('invite.description') }</div>
<div class="uk-text-center uk-margin-top">
    <div class="uk-text-center">
        {#if copyTumbler}
            { $_('invite.linkHasBeenCopied') }
        {:else}
            {#if url}
                <div
                    class="uk-button-link uk-text-lowercase pointer"
                    class:gradient-text={highlight}
                    class:uk-text-bold={highlight}
                    uk-tooltip={canShare ? $_('invite.clickToShare') : $_('invite.clickToCopy')}
                    onclick={linkClick}
                >
                    {url}
                </div>
            {:else}
                <Loader ratio={0.5} />
            {/if}
        {/if}
    </div>

    <div class="uk-text-small uk-text-muted">
        {#if copyTumbler}
            <br/>
        {:else}
            {#if canShare}
                <Interpolator text={$_('invite.clickToShareHint')} >
                    {#snippet children({ data: data })}
                                        {#if data.name === 'link'}
                            <span class="uk-text-secondary pointer" onclick={copyToClipboard}>{ data.text }</span>
                        {/if}
                    {/snippet}
                </Interpolator>
            {:else}
                { $_('invite.copyLink') }
            {/if}
        {/if}
    </div>
</div>

<hr class="uk-margin-bottom"/>

<div class="uk-width-1-1">
    <div class="uk-text-center uk-text-muted uk-text-small uk-margin-small-bottom">
        { $_('player.onlineUsers') }
    </div>
    <Users users={$users} />
</div>