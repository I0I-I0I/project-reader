<script lang="ts">
    let { ...props } = $props()
</script>

<svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    {...props}
>
    <rect x="6" y="3" width="12" height="8" rx="1.5" ry="1.5" />
    <rect x="6" y="13" width="12" height="8" rx="1.5" ry="1.5" />
</svg>
