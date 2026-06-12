<script lang="ts">
    import type { Snippet } from "svelte"

    interface Props {
        children: Snippet
        class?: string
    }

    let { children, class: className = "" }: Props = $props()
</script>

<div class="tabs-list {className}">
    {@render children()}
</div>

<style>
    .tabs-list {
        display: flex;
        gap: 8px;
        align-items: center;
        overflow-x: auto;
        overflow-y: hidden;
        scrollbar-width: none;
        -ms-overflow-style: none;
        -webkit-overflow-scrolling: touch;
        padding: 4px 0;
    }

    .tabs-list::-webkit-scrollbar {
        display: none;
    }
</style>
