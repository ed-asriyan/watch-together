<script lang="ts">
    import type { Room } from '../../stores/room';
    import Chat from './chat/index.svelte';
    import Online from './online/index.svelte';
    import Reactions from './reactions/index.svelte';

    export let room: Room
    export let visible: boolean;
</script>

<Chat room={room} displayInput={visible} />
<Online room={room} visible={visible}/>
<Reactions room={room} displayButtons={visible} />
