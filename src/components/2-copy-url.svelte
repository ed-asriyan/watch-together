<script lang="ts">
    import { _ } from 'svelte-i18n';
    import Interpolator from './interpolator.svelte';
    import { track, ClickEvent } from '../analytics';

    export let roomId: string;

    let copyTumbler: boolean = false;

    const copyToClipboard = function () {
        const input = document.createElement('input');
        input.setAttribute('value', url);
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        trigger();
    };

    $: url = `${location.protocol}//${location.host}${location.pathname}#${roomId}`; 
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
        track(new ClickEvent({ target: 'link_share' }));
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
            <div 
                class="uk-button uk-button-link uk-text-lowercase"
                uk-tooltip={canShare ? $_('invite.clickToShare') : $_('invite.clickToCopy')}
                on:click={linkClick}
            >
                {url}
            </div>
        {/if}
    </div>

    <div class="uk-text-small uk-text-muted">
        {#if copyTumbler}
            <br/>
        {:else}
            {#if canShare}
                <Interpolator text={$_('invite.clickToShareHint')} let:data={data}>
                    {#if data.name === 'link' }
                        <span class="uk-text-secondary pointer" on:click={copyToClipboard}>{ data.text }</span>
                    {/if}
                </Interpolator>
            {:else}
                { $_('invite.copyLink') }
            {/if}
        {/if}
    </div>
</div>
