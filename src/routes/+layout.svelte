<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="app">
	<nav class="languages">
		{#each locales as locale (locale)}
			<a data-sveltekit-reload href={resolve(localizeHref(page.url.pathname, { locale }) as Pathname)}>
				{locale}
			</a>
		{/each}
	</nav>
	{@render children()}
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		background-color: #f5f0e1;
		font-family: Georgia, 'Times New Roman', Times, serif;
		color: #1a1a1a;
	}

	.app {
		padding: 40px;
		min-height: 100vh;
	}

	.languages {
		position: fixed;
		top: 10px;
		right: 10px;
		display: flex;
		gap: 10px;
		font-family: sans-serif;
		font-size: 0.8rem;
	}

	.languages a {
		text-decoration: none;
		color: #666;
		padding: 2px 5px;
		border: 1px solid #ccc;
		border-radius: 3px;
	}

	.languages a:hover {
		background: #eee;
	}
</style>
