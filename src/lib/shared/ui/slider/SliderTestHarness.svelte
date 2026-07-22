<script lang="ts">
    import Slider from "./Slider.svelte"

    let { onCommit }: { onCommit: () => void } = $props()
    let enabled = $state(true)

    export function setEnabled(value: boolean) {
        enabled = value
    }
</script>

<Slider {enabled} resolveMove={() => onCommit} ariaLabel="Test slider">
    {#snippet previous()}
        <span>Previous</span>
    {/snippet}
    {#snippet current()}
        <span>Current</span>
    {/snippet}
    {#snippet next()}
        <span>Next</span>
    {/snippet}
</Slider>
