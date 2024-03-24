<script lang="ts">
    import { trackClick } from '../google-analytics';

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
        trackClick('link_share');
    };

    const trigger = function () {
        copyTumbler = true;
        setTimeout(() => copyTumbler = false, 4000);
    };
</script>

<div>Share the link to this room with who you want to watch a movie with</div>
<div class="uk-text-center uk-margin-top">
    <div class="uk-text-center">
        {#if copyTumbler}
            The link is copied to the clipboard
        {:else}
            <div 
                class="uk-button uk-button-link uk-text-lowercase"
                uk-tooltip={canShare ? 'Chlick to share the link' : 'Click to copy the link'}
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
                Click the link to share. Or <span class="uk-text-secondary pointer" uk-tooltip="Click to copy the link" on:click={copyToClipboard}>click here</span> to copy it to the clipboard
            {:else}
                Click the link to copy it to the clipboard
            {/if}
        {/if}
    </div>
</div>
