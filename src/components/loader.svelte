<script lang="ts">
    export let ratio: number = 3;
</script>

<div class="container">
    <div uk-spinner={`ratio: ${ratio}`}></div>
    <div><slot/></div>
</div>
