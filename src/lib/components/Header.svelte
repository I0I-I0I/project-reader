<script lang="ts">
    import NewFolderIcon from "$lib/components/icons/NewFolderIcon.svelte"
    import Button from "$lib/components/Button.svelte"
    import ThemeSwitcher from "$lib/components/ThemeSwitcher.svelte"
    import LanguageSwitcher from "$lib/components/LanguageSwitcher.svelte"
    import * as m from "$lib/paraglide/messages"
</script>

<header>
    <div class="title-wrapper">
        <h1 class="title" data-text={m.library()}>{m.library()}</h1>
    </div>
    <div class="actions-wrapper" role="toolbar" aria-label={m.action_controls()}>
        <div class="action-nav">
            <div class="header-btn-wrapper">
                <Button
                    Icon={NewFolderIcon}
                    aria-label={m.new_folder()}
                    on_hover={m.new_folder()}
                />
            </div>
        </div>

        <div class="header-btn-wrapper">
            <ThemeSwitcher />
            <LanguageSwitcher />
        </div>
    </div>
</header>

<style>
    header {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        border-bottom: 3px solid var(--border-color);
        padding-bottom: 24px;
        margin-bottom: 40px;
        gap: 20px;
    }

    .title-wrapper {
        position: relative;
    }

    .title {
        font-size: clamp(36px, 6vw, 64px);
        margin: 0;
        text-transform: uppercase;
        font-weight: 900;
        letter-spacing: -2px;
        position: relative;
        display: inline-block;
        color: var(--text-color);
        line-height: 1;
    }

    .actions-wrapper {
        display: flex;
        align-items: center;
        gap: 24px;
    }

    .action-nav {
        display: flex;
        align-items: center;
        gap: 16px;
    }

    .header-btn-wrapper :global(.action-btn) {
        background: var(--button-bg);
        border: 2px solid var(--border-color);
        padding: 8px 16px;
        box-shadow: 2px 2px 0 var(--shadow-color);
        transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .header-btn-wrapper :global(.action-btn:hover) {
        transform: translate(-2px, -2px);
        box-shadow: 4px 4px 0 var(--shadow-color);
        background: var(--button-hover-bg);
    }

    .header-btn-wrapper :global(.action-btn:active) {
        transform: translate(2px, 2px);
        box-shadow: 0px 0px 0 var(--shadow-color);
    }

    @media (max-width: 768px) {
        header {
            flex-direction: column;
            align-items: flex-start;
            padding-bottom: 20px;
            gap: 20px;
        }

        .actions-wrapper {
            width: 100%;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 16px;
        }
    }
</style>
