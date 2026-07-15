<script lang="ts">
    import { AppShell } from "$lib/app"

    let { children } = $props()
</script>

<AppShell>{@render children()}</AppShell>
