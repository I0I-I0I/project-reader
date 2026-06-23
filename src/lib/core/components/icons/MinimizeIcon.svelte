<script lang="ts">
    let { ...props } = $props()
</script>

<svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="3"
    stroke-linecap="square"
    stroke-linejoin="miter"
    {...props}
>
    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
</svg>
