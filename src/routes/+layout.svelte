<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="app">
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
</style>
