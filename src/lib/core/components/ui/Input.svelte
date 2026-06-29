<script lang="ts">
    import type { HTMLInputAttributes } from "svelte/elements"

    interface Props extends HTMLInputAttributes {
        label?: string
        value?: string | number
        errors?: string[]
        classInput?: string
    }

    let {
        label,
        value = $bindable(""),
        errors = [],
        class: className = "",
        classInput,
        ...props
    }: Props = $props()
</script>

<div class="input-group {className || ''}">
    {#if label}
        <label class="input-label" for={props.id}>{label}</label>
    {/if}
    <input
        class={`input-field ${classInput}`}
        class:has-error={errors.length > 0}
        bind:value
        {...props}
    />
    {#if errors.length > 0}
        {#each errors as error}
            <span class="error-text">{error}</span>
        {/each}
    {/if}
</div>

<style>
    .input-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
        width: 100%;
    }

    .input-label {
        font-size: var(--font-size-base);
        font-weight: 800;
        text-transform: uppercase;
        color: var(--text-color);
        letter-spacing: 0.5px;
    }

    .input-field {
        background: var(--bg-color);
        border: 2px solid var(--border-color);
        padding: 12px 16px;
        font-family: inherit;
        color: var(--text-color);
        outline: none;
        box-shadow: 3px 3px 0 var(--shadow-color);
        transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .input-field:focus {
        transform: translate(-1px, -1px);
        box-shadow: 4px 4px 0 var(--shadow-color);
        border-color: var(--accent-color, #00cec9);
    }

    .input-field::placeholder {
        color: var(--text-color);
        opacity: 0.4;
    }

    .input-field.has-error {
        border-color: var(--error-color, #ff7675);
    }

    .error-text {
        font-size: var(--font-size-sm);
        font-weight: 700;
        color: var(--error-color, #ff7675);
        text-transform: uppercase;
    }
</style>
