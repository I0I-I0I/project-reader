<script lang="ts">
    let { ...props } = $props()
</script>

<svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    {...props}
>
    <path d="M12 17v5"></path>
    <path d="M5 17h14"></path>
    <path d="M6 3h12l-2 6 3 3v2H5v-2l3-3-2-6Z"></path>
</svg>
