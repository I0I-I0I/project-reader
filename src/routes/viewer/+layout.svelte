<script lang="ts">
    const { children } = $props<{
        children?: any
    }>()
</script>

<div class="viewer-layout">
    {@render children()}
</div>

<style>
    .viewer-layout {
        display: flex;
        flex-direction: column;
        height: 100dvh;
        width: 100%;
    }
</style>
