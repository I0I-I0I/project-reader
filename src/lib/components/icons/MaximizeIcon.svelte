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
    <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7" />
</svg>
