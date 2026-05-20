<script lang="ts">
	let { ...props } = $props();
</script>

<svg
	width="64"
	height="64"
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	{...props}
>
	<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
	<rect width="8" height="10" x="8" y="6" rx="1" />
</svg>
