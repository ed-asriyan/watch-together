<script lang="ts">
    import Chat from './chat.svelte';
    import Online from './online.svelte';
    import Reactions from './reactions.svelte';

    interface Props {
        visible: boolean;
    }

    let { visible }: Props = $props();
</script>

<Chat displayInput={visible} />
<Online visible={visible} />
<Reactions displayButtons={visible} />
