<script lang="ts">
    import { trackClick } from '../google-analytics';

    const copyToClipboard = function (text: string) {
        const input = document.createElement('input');
        input.setAttribute('value', text);
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
    };

    const copyUrl = function () {
        copyToClipboard(document.location.href);
        trackClick('copy_link');
    };
</script>

<h3>2. Share the link to this room with who you want to watch a movie with</h3>

<div class="uk-text-center uk-margin-top">
    <div 
        class="uk-button uk-button-link uk-text-lowercase uk-text-center"
        uk-tooltip="Click to copy"
        on:click={copyUrl}
    >
        {document.location.href}
    </div>
    <div class="uk-text-muted uk-text-small">Click the link to copy it to the clipboard</div>
</div>
