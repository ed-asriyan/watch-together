<script lang="ts">
    import { tick } from 'svelte';
    import { _ } from 'svelte-i18n';
    import SourceCard from './source-card.svelte';
    import InviteCard from './invite-card.svelte';
    import LanguageSelector from './language-selector.svelte';
    import Interpolator from '../interpolator.svelte';
    import { useSession } from '../session-context';
    import { ui } from '../../../../composition/config';

    const { commands, view } = useSession();
    const source = view.source;
    const participants = view.participants;

    let highlightSource = $derived($source.empty);
    let highlightInvite = $derived(!highlightSource && $participants.others.length === 0);

    const generateNewRoom = async function () {
        if (!confirm($_('room.generateNewRoom.confirmation'))) return;
        commands.recordInteraction('generate_new_room');
        await commands.generateNewRoom();
    };

    const joinAnotherRoom = async function () {
        const input = prompt($_('invite.joinPromt'));
        if (!input) return;
        commands.recordInteraction('join_another_room');
        await commands.joinRoomByLinkOrId(input);
    };

    let container: HTMLElement | undefined = $state();

    const scroll = function (direction: 'top' | 'bottom') {
        const top = direction === 'top'
            ? 0
            : (container?.getBoundingClientRect().top ?? 0) + window.scrollY - 86;
        window.scrollTo({ top, behavior: 'smooth' });
    };

    let lastHadSource = $state(false);
    let lastOthers = $state(0);
    let settled = $state(false);
    $effect(() => {
        if (window.innerWidth <= 675) return;
        const hasSource = !$source.empty;
        const others = $participants.others.length;
        const changed = !settled
            || hasSource !== lastHadSource
            || (lastOthers === 0 && others > 0);
        lastHadSource = hasSource;
        lastOthers = others;
        settled = true;
        if (changed) {
            tick().then(() => scroll(hasSource && others > 0 ? 'top' : 'bottom'));
        }
    });
</script>

<div bind:this={container} class="uk-container uk-grid-collapse uk-grid-match" uk-grid>
    <div class="uk-width-1-2@m uk-padding-small">
        <div class="tile uk-width-1-1" class:focus={highlightSource}>
            <h2 class="uk-card-title uk-text-center" class:gradient-text={highlightSource}>
                🍿 { $_('selectVideo.title') }
            </h2>
            <SourceCard />
        </div>
    </div>
    <div class="uk-width-1-2@m uk-padding-small">
        <div class="tile uk-text-center uk-width-1-1" class:focus={highlightInvite}>
            <h2 class="uk-card-title" class:gradient-text={highlightInvite}>
                👥 { $_('invite.title') }
            </h2>
            <InviteCard highlight={highlightInvite} />
        </div>
        <div class="uk-flex uk-margin-top uk-flex-column">
            <button class="uk-button glass tile uk-padding-remove" onclick={generateNewRoom}>
                ↻ { $_('room.generateNewRoom.button') }
            </button>
        </div>
        <div class="uk-flex uk-margin-top uk-flex-column">
            <button class="uk-button glass tile uk-padding-remove" onclick={joinAnotherRoom}>
                { $_('room.joinAnotherRoom') } →
            </button>
        </div>
    </div>
</div>

<div class="uk-text-small uk-width-1-1 uk-text-center uk-margin-medium-top">
    <Interpolator text={$_('feedback.linkText')}>
        {#snippet children({ data })}
            {#if data.name === 'link'}
                <a
                    href={$_('feedback.link')}
                    target="_blank"
                    onclick={() => commands.recordInteraction('feedback_link')}
                >{ data.text }</a>
            {/if}
        {/snippet}
    </Interpolator>
</div>

<div class="footer uk-text-small uk-text-muted uk-text-center uk-padding uk-padding-remove-bottom">
    <LanguageSelector />
    <div class="uk-margin-top">
        <a href="/terms-and-conditions.txt" class="uk-text-muted" target="_blank">{ $_('termsAndConditions') }</a>
        · <a href="/privacy-policy.txt" class="uk-text-muted" target="_blank">{ $_('privacyPolicy') }</a>
    </div>
    <div class="uk-margin-top">
        <span>{ $_('poweredBy') }</span>
        · <a class="uk-text-muted" href="https://svelte.dev" target="_blank">Svelte</a>
        · <a class="uk-text-muted" href="https://firebase.google.com" target="_blank">Firebase</a>
        · <a class="uk-text-muted" href="https://vidstack.io" target="_blank">Vidstack</a>
        · <a class="uk-text-muted" href="https://webtorrent.io" target="_blank">WebTorrent</a>
        · <a class="uk-text-muted" href="https://getuikit.com" target="_blank">UIkit</a>
    </div>
    <div class="uk-margin-top">
        <div>v.{ ui.version }</div>
        <a class="uk-text-muted" href="https://asriyan.me" target="_blank">Ed Asriyan</a>
    </div>
</div>

<style lang="scss">
    .uk-card-title { font-weight: bold; }
    .tile.uk-button:hover { background-color: rgba(255, 255, 255, 0.1); }
</style>
