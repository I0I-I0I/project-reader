<script lang="ts">
	import type { Component, Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	interface Props extends HTMLButtonAttributes {
		children?: Snippet;
		Icon?: Component;
		on_hover?: string;
	}

	let { children, Icon, on_hover, ...props }: Props = $props();
</script>

<button class="action-btn" {...props}>
	{#if Icon}
		<Icon />
	{/if}
	{@render children?.()}

	{#if on_hover}
		<span class="tooltip" role="tooltip">{on_hover}</span>
	{/if}
</button>

<style>
	.action-btn {
		background: none;
		border: none;
		display: flex;
		align-items: center;
		gap: 8px;
		font-family: inherit;
		font-size: 14px;
		font-weight: bold;
		text-transform: uppercase;
		cursor: pointer;
		padding: 0;
		color: #1a1a1a;
		position: relative;
	}

	.tooltip {
		position: absolute;
		bottom: calc(100% + 10px);
		left: 50%;
		transform: translateX(-50%) translateY(4px);
		background-color: #1a1a1a;
		color: #f5f0e1;
		padding: 6px 12px;
		font-size: 11px;
		font-weight: bold;
		letter-spacing: 0.5px;
		text-transform: uppercase;
		white-space: nowrap;
		border-radius: 4px;
		pointer-events: none;
		opacity: 0;
		visibility: hidden;
		transition:
			opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1),
			transform 0.15s cubic-bezier(0.4, 0, 0.2, 1);
		z-index: 100;
	}

	.tooltip::after {
		content: '';
		position: absolute;
		top: 100%;
		left: 50%;
		transform: translateX(-50%);
		border-width: 5px;
		border-style: solid;
		border-color: #1a1a1a transparent transparent transparent;
	}

	.action-btn:hover .tooltip,
	.action-btn:focus-visible .tooltip {
		opacity: 1;
		visibility: visible;
		transform: translateX(-50%) translateY(0);
	}

	.action-btn :global(svg) {
		stroke-width: 2.5;
	}
</style>
