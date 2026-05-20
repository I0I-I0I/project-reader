<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import FolderIcon from '$lib/components/icons/FolderIcon.svelte';
	import BookIcon from '$lib/components/icons/BookIcon.svelte';
	import Card from '$lib/components/Card.svelte';
	import Header from '$lib/components/Header.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
</script>

<div class="container">
	<Header />
	<Breadcrumbs breadcrumbs={[m.library(), m.test()]} />

	<main class="grid">
		<Card title={m.test()} kind="folder" Icon={FolderIcon} />
		<Card title={m.book_title()} kind="book" extension="pdf" Icon={BookIcon} />
	</main>
</div>

<style>
	.container {
		max-width: 1200px;
		margin: 0 auto;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: 20px;
	}
</style>
