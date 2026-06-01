<script lang="ts">
    import type { SVGAttributes } from "svelte/elements"
    let { ...props }: SVGAttributes<SVGSVGElement> = $props()
</script>

<svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="3"
    stroke-linecap="round"
    stroke-linejoin="round"
    {...props}
>
    <polyline points="20 6 9 17 4 12" />
</svg>
