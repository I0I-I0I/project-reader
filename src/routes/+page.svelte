<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import NewFolderIcon from '$lib/components/icons/NewFolderIcon.svelte';
	import ImportBookIcon from '$lib/components/icons/ImportBookIcon.svelte';
	import FolderIcon from '$lib/components/icons/FolderIcon.svelte';
	import BookIcon from '$lib/components/icons/BookIcon.svelte';
</script>

<div class="container">
	<header>
		<div class="title-wrapper">
			<h1 class="title" data-text={m.library()}>{m.library()}</h1>
		</div>
		<h2 class="subtitle">{m.root()}</h2>
	</header>

	<nav class="actions">
		<button class="action-btn" aria-label={m.new_folder()}>
			<NewFolderIcon />
			<span class="sr-only">{m.new_folder()}</span>
		</button>
		<button class="action-btn" aria-label={m.import_book()}>
			<ImportBookIcon />
			<span class="sr-only">{m.import_book()}</span>
		</button>
	</nav>

	<main class="grid">
		<div class="card">
			<div class="card-icon">
				<FolderIcon />
			</div>
			<p class="card-title">{m.test()}</p>
		</div>

		<div class="card">
			<div class="badge">PDF</div>
			<div class="card-icon">
				<BookIcon />
			</div>
			<p class="card-title">{m.book_title()}</p>
		</div>
	</main>
</div>

<style>
	.container {
		max-width: 1200px;
		margin: 0 auto;
	}

	header {
		margin-bottom: 40px;
	}

	.title-wrapper {
		position: relative;
		margin-bottom: 10px;
	}

	.title {
		font-size: 80px;
		margin: 0;
		text-transform: uppercase;
		font-weight: 900;
		letter-spacing: -2px;
		position: relative;
		display: inline-block;
		color: #1a1a1a;
		line-height: 1;
	}

	.subtitle {
		font-size: 24px;
		font-weight: normal;
		text-transform: uppercase;
		margin: 0;
		color: #1a1a1a;
		letter-spacing: 1px;
	}

	.actions {
		display: flex;
		gap: 40px;
		margin-bottom: 60px;
	}

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
	}

	.action-btn svg {
		stroke-width: 2.5;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: 20px;
	}

	.card {
		background: white;
		aspect-ratio: 1/1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 20px;
		position: relative;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
		border: 1px solid rgba(0, 0, 0, 0.05);
	}

	.card-icon {
		margin-bottom: 20px;
		color: #1a1a1a;
	}

	.card-title {
		font-size: 14px;
		font-weight: bold;
		text-transform: uppercase;
		margin: 0;
		text-align: center;
		max-width: 180px;
		word-wrap: break-word;
	}

	.badge {
		position: absolute;
		top: 15px;
		right: 15px;
		background: #ff4d4d;
		color: white;
		font-size: 11px;
		font-weight: bold;
		padding: 4px 10px;
		transform: rotate(-10deg);
		border: 1.5px solid #1a1a1a;
		box-shadow: 2px 2px 0 #1a1a1a;
		z-index: 10;
	}
</style>
