<script lang="ts">
    export let ratio: number = 3;
</script>

<span class="container">
    <span uk-spinner={`ratio: ${ratio}`}></span>
    <span><slot/></span>
</span>
