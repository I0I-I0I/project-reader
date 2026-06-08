<script lang="ts">
    import "./components/styles/pdf-viewer.css"

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
        max-height: 100dvh;
        height: 100%;
        width: 100%;
    }
</style>
