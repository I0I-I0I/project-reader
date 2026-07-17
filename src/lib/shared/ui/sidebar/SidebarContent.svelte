<script lang="ts">
    import type { Snippet } from "svelte"

    let {
        children,
        padded = false,
        class: className = "",
    } = $props<{
        children: Snippet
        padded?: boolean
        class?: string
    }>()
</script>

<div class={["sidebar-content", padded && "padded", className]}>
    {@render children()}
</div>

<style>
    .sidebar-content {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        overscroll-behavior: contain;
    }

    .sidebar-content.padded {
        padding: 12px;
    }
</style>
