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
    <rect x="2" y="3" width="9" height="18" rx="1" ry="1" />
    <rect x="13" y="3" width="9" height="18" rx="1" ry="1" />
</svg>
