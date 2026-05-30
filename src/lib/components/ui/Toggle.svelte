<script lang="ts">
    import { untrack } from "svelte"

    let {
        checked = $bindable(false),
        label = "",
        disabled = false,
        id = `toggle-${Math.random().toString(36).substring(2, 9)}`,
        onchange,
    } = $props<{
        checked?: boolean
        label?: string
        disabled?: boolean
        id?: string
        onchange?: (checked: boolean) => void
    }>()

    $effect(() => {
        const val = checked
        untrack(() => {
            if (onchange) {
                onchange(val)
            }
        })
    })
</script>

<div class="toggle-container" class:disabled>
    <label for={id} class="toggle-label-wrapper">
        <input type="checkbox" {id} bind:checked {disabled} class="toggle-input" />
        <span class="toggle-track">
            <span class="toggle-thumb"></span>
        </span>
        {#if label}
            <span class="toggle-label-text">{label}</span>
        {/if}
    </label>
</div>

<style>
    .toggle-container {
        display: inline-flex;
        align-items: center;
        user-select: none;
    }

    .toggle-label-wrapper {
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
        font-family: inherit;
        font-size: 12px;
        font-weight: 800;
        text-transform: uppercase;
        color: var(--text-color);
        position: relative;
    }

    .toggle-input {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
    }

    .toggle-track {
        position: relative;
        display: inline-block;
        width: 48px;
        height: 24px;
        background: var(--button-bg);
        border: 2px solid var(--border-color);
        box-shadow: 2px 2px 0 var(--shadow-color);
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        box-sizing: border-box;
    }

    .toggle-thumb {
        position: absolute;
        top: 2px;
        left: 2px;
        width: 16px;
        height: 16px;
        background: var(--text-color);
        border: 2px solid var(--border-color);
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        box-sizing: border-box;
    }

    .toggle-input:checked + .toggle-track {
        background: var(--viewer-accent);
    }

    .toggle-input:checked + .toggle-track .toggle-thumb {
        left: 26px;
        background: var(--viewer-accent-active);
    }

    .toggle-input:focus-visible + .toggle-track {
        border-color: var(--viewer-accent-active);
        outline: none;
    }

    @media (hover: hover) {
        .toggle-label-wrapper:hover .toggle-track {
            transform: translate(-1px, -1px);
            box-shadow: 3px 3px 0 var(--shadow-color);
            background: var(--button-hover-bg);
        }
        .toggle-input:checked + .toggle-track:hover {
            background: var(--viewer-accent);
        }
    }

    .toggle-label-wrapper:active .toggle-track {
        transform: translate(1px, 1px);
        box-shadow: 1px 1px 0 var(--shadow-color);
    }

    /* Disabled state */
    .disabled {
        opacity: 0.5;
    }

    .disabled .toggle-label-wrapper {
        cursor: not-allowed;
    }
</style>
