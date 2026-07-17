<script lang="ts">
    import type { Snippet } from "svelte"

    let {
        children,
        tone = "accent",
        class: className = "",
    } = $props<{
        children: Snippet
        tone?: "accent" | "surface"
        class?: string
    }>()
</script>

<footer class={["sidebar-footer", `tone-${tone}`, className]}>
    {@render children()}
</footer>

<style>
    .sidebar-footer {
        display: flex;
        flex-shrink: 0;
        align-items: center;
        justify-content: center;
        flex-wrap: wrap;
        box-sizing: border-box;
        gap: 6px;
        padding: 10px 8px;
        border-top: 3px solid var(--border-color);
        color: var(--text-color);
        font-size: var(--font-size-2xs);
        font-weight: 900;
        letter-spacing: 0.5px;
        line-height: 1.5;
        text-transform: uppercase;
    }

    .sidebar-footer :global(.hint-divider) {
        opacity: 0.5;
    }

    .tone-accent {
        background: var(--accent-active-color);
    }

    .tone-surface {
        background: var(--surface-color);
    }

    .sidebar-footer :global(kbd) {
        padding: 1px 4px;
        border: 1.5px solid var(--border-color);
        border-radius: var(--radius-sm);
        background: var(--surface-color);
        box-shadow: 1px 1px 0 var(--shadow-color);
        font-family: monospace;
        font-weight: 900;
    }
</style>
