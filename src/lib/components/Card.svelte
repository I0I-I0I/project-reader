<script lang="ts">
    import type { Component } from "svelte"
    import type { HTMLButtonAttributes } from "svelte/elements"
    import * as m from "$lib/paraglide/messages"
    import { fileNodeToBook } from "$lib/stores/viewerStore.svelte"
    import { vfsStore } from "$lib/stores/vfsStore.svelte"
    import type { VFSNode, FileNode } from "$lib/stores/vfsStore.types"
    import TrashIcon from "$lib/components/icons/TrashIcon.svelte"
    import NavigationIcon from "$lib/components/icons/NavigationIcon.svelte"
    import MoreVerticalIcon from "$lib/components/icons/MoreVerticalIcon.svelte"
    import FolderIcon from "$lib/components/icons/FolderIcon.svelte"
    import LockIcon from "$lib/components/icons/LockIcon.svelte"
    import CheckIcon from "$lib/components/icons/CheckIcon.svelte"
    import PDFDocument from "$lib/pdf"
    import { settingsStore } from "$lib/stores/settingsStore.svelte"
    import Button from "./ui/Button.svelte"
    import { uiStore } from "$lib/stores/uiStore.svelte"
    import { onMount, onDestroy } from "svelte"

    interface Props extends HTMLButtonAttributes {
        node: VFSNode
        Icon?: Component
        class?: string
        onclick?: (e: MouseEvent) => void | Promise<void>
    }

    let { node, Icon, class: className, onclick, ...props }: Props = $props()
    let isRestoring = $state(false)
    let showMenu = $state(false)
    let longPressTimeout: ReturnType<typeof setTimeout> | undefined

    const isSelected = $derived(vfsStore.selectedIds.has(node.id))
    const kind = $derived(node.type === "file" ? "book" : "folder")
    const extension = $derived(node.type === "file" ? "pdf" : undefined)

    // PHASE 2: Fetch preview URL lazily when the card is visible/rendered
    let previewUrl = $state("")

    onMount(async () => {
        if (node.type === "file") {
            previewUrl = await vfsStore.getPreviewUrl(node.id)
        }
    })

    onDestroy(() => {
        if (node.type === "file") {
            vfsStore.revokePreviewUrl(node.id)
        }
    })

    const book = $derived.by(() => {
        if (node.type === "file") {
            const b = fileNodeToBook(node)
            b.previewDataUrl = previewUrl
            b.isLocked = vfsStore.isLockedMap[node.id]
            return b
        }
        return null
    })

    let progressPercent = $derived.by(() => {
        if (node.type === "file" && node.metadata.totalPages && node.metadata.totalPages > 0) {
            const page = node.metadata.pageNumber || 1
            const total = node.metadata.totalPages
            return Math.min(100, Math.max(0, Math.round((page / total) * 100)))
        }
        return 0
    })

    // Metadata regeneration logic: If metadata is missing but we have a way to get the file
    $effect(() => {
        if (
            node.type === "file" &&
            (!node.metadata.totalPages || node.metadata.author === undefined)
        ) {
            let isCancelled = false
            const loadMetadata = async () => {
                const url = await vfsStore.getFileUrl(node.id)
                if (!url || isCancelled) return

                const doc = new PDFDocument(url)
                try {
                    await doc.load(settingsStore.scale)
                    const totalPages = await doc.getPageNumber()
                    const author = await doc.getAuthor()

                    if (!isCancelled) {
                        await vfsStore.updateFile(node.id, {
                            metadata: {
                                ...node.metadata,
                                totalPages,
                                author,
                            },
                        })
                    }
                } catch (err) {
                    console.error("[Card] Failed to regenerate PDF metadata:", err)
                } finally {
                    await doc.close()
                    // If the node was locked before, we should probably revoke the URL we just created
                    if (vfsStore.isLockedMap[node.id]) {
                        vfsStore.revokeFileUrl(node.id)
                    }
                }
            }
            loadMetadata()
            return () => {
                isCancelled = true
            }
        }
    })

    const handleClick = async (e: MouseEvent) => {
        if (onclick) {
            isRestoring = true
            try {
                await onclick(e)
            } finally {
                isRestoring = false
            }
        }
    }

    const onPointerDown = (e: PointerEvent) => {
        if (uiStore.isSelectionMode) return
        longPressTimeout = setTimeout(() => {
            uiStore.isSelectionMode = true
            vfsStore.toggleSelection(node.id)
            if (navigator.vibrate) navigator.vibrate(50)
        }, 500)
    }

    const onPointerUp = () => {
        clearTimeout(longPressTimeout)
    }

    const handleImageError = async () => {
        console.warn(
            `[Card] Preview image failed to load for node ${node.id}, attempting to regenerate...`,
        )
        // This will trigger the getPreviewUrl again in a bit, but we might want to force clear it in DB
        // For now, let's just clear the local cache
        vfsStore.revokePreviewUrl(node.id)
        previewUrl = await vfsStore.getPreviewUrl(node.id)
    }

    const onRemove = async (e: MouseEvent) => {
        e.stopPropagation()
        showMenu = false
        uiStore.nodesToDeleteIds = [node.id]
        uiStore.isDeleteModalOpen = true
    }

    const onMove = (e: MouseEvent) => {
        e.stopPropagation()
        uiStore.nodeToMoveId = node.id
        uiStore.isPromptOpen = { value: true, mode: "move" }
        showMenu = false
    }

    const onSelect = (e: MouseEvent) => {
        e.stopPropagation()
        uiStore.isSelectionMode = true
        vfsStore.toggleSelection(node.id)
        showMenu = false
    }

    const toggleMenu = (e: MouseEvent) => {
        e.stopPropagation()
        showMenu = !showMenu
    }

    const closeMenu = () => {
        showMenu = false
    }

    const handleMouseLeave = () => {
        if (window.matchMedia("(hover: hover)").matches) {
            closeMenu()
        }
    }
</script>

<svelte:window onpointerdown={closeMenu} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class={`card ${className}`}
    class:is-selected={isSelected}
    onmouseleave={handleMouseLeave}
    onpointerdown={onPointerDown}
    onpointerup={onPointerUp}
    onpointercancel={onPointerUp}
>
    <button
        type="button"
        class="card-main-button"
        onclick={handleClick}
        disabled={isRestoring}
        {...props}
    >
        <div class="card-cover-container">
            {#if kind === "book" && extension}
                <div class="badge" aria-label="{m.file_format()}: {extension}">
                    {extension}
                </div>
            {/if}

            {#if isSelected}
                <div class="selection-badge">
                    <CheckIcon />
                </div>
            {/if}

            {#if book && book.previewDataUrl}
                <div class="card-preview" aria-hidden="true">
                    <div class="pdf-image-wrapper">
                        <img
                            src={book.previewDataUrl}
                            alt="Cover preview"
                            onerror={handleImageError}
                        />
                    </div>
                </div>
            {:else}
                <div class="card-icon" aria-hidden="true">
                    {#if kind === "folder"}
                        <FolderIcon />
                    {:else if Icon}
                        <Icon />
                    {/if}
                </div>
            {/if}

            {#if kind === "book" && book && book.totalPages && book.totalPages > 0}
                <div class="progress-container">
                    <div class="progress-bar-track">
                        <div
                            class="progress-bar-fill"
                            class:has-border={progressPercent > 0 && progressPercent < 100}
                            style="width: {progressPercent}%"
                        ></div>
                    </div>
                    <span class="progress-text">{progressPercent}%</span>
                </div>
            {/if}
        </div>

        <div class="card-metadata">
            <p class="card-title">{node.name}</p>
            {#if kind === "book" && book}
                <p class="card-author">
                    {#if book.author}
                        {book.author}
                    {:else}
                        {m.unknown_author()}
                    {/if}
                </p>
            {/if}
        </div>

        {#if kind === "book" && book && book.isLocked}
            <div class="lock-overlay" aria-hidden="true">
                <LockIcon class="lock-icon" />
                <span class="lock-text">{m.restore_access()}</span>
            </div>
        {/if}
    </button>

    {#if kind === "book" || kind === "folder"}
        <div class="card-menu">
            <Button
                variant="fab"
                square={true}
                size="large"
                class="menu-btn"
                aria-label={m.more_options ? m.more_options() : "More options"}
                onclick={toggleMenu}
            >
                <MoreVerticalIcon />
            </Button>

            {#if showMenu}
                <div class="dropdown-menu" onpointerdown={(e) => e.stopPropagation()}>
                    <button class="dropdown-item" onclick={onSelect}>
                        <CheckIcon class="dropdown-icon" />
                        <span>{m.select ? m.select() : "Select"}</span>
                    </button>
                    <button class="dropdown-item" onclick={onMove}>
                        <NavigationIcon class="dropdown-icon" />
                        <span>{m.move ? m.move() : "Move"}</span>
                    </button>
                    <button class="dropdown-item" onclick={onRemove}>
                        <TrashIcon class="dropdown-icon" />
                        <span>
                            {kind === "book"
                                ? m.remove_book
                                    ? m.remove_book()
                                    : "Remove book"
                                : m.remove_folder
                                  ? m.remove_folder()
                                  : "Remove folder"}
                        </span>
                    </button>
                </div>
            {/if}
        </div>
    {/if}
</div>

<style>
    .card {
        background: var(--surface-color);
        position: relative;
        border: 2px solid var(--border-color);
        box-shadow: 4px 4px 0 var(--shadow-color);
        transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        user-select: none;
        -webkit-touch-callout: none;
    }

    .card.is-selected {
        border-color: var(--danger-active-color);
        box-shadow: 4px 4px 0 var(--danger-active-color);
        background-color: var(--faded-color);
    }

    .card.is-selected .card-cover-container {
        border-bottom-color: var(--danger-active-color);
    }

    @media (hover: hover) {
        .card:hover {
            transform: translate(-4px, -4px);
            box-shadow: 8px 8px 0 var(--shadow-color);
            background-color: var(--surface-hover-color);
        }

        .card.is-selected:hover {
            box-shadow: 8px 8px 0 var(--danger-active-color);
        }
    }

    .card:active {
        transform: translate(2px, 2px);
        box-shadow: 2px 2px 0 var(--shadow-color);
    }

    .card.is-selected:active {
        box-shadow: 2px 2px 0 var(--danger-active-color);
    }

    .card-main-button {
        background: transparent;
        border: none;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        justify-content: flex-start;
        padding: 0;
        cursor: pointer;
        font-family: inherit;
        text-align: left;
        color: inherit;
        box-sizing: border-box;
    }

    .card-cover-container {
        position: relative;
        width: 100%;
        aspect-ratio: 2/3;
        background: var(--bg-color);
        border-bottom: 2px solid var(--border-color);
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
    }

    .selection-badge {
        position: absolute;
        top: 15px;
        right: 15px;
        background: var(--danger-active-color);
        color: var(--danger-text-color);
        width: 32px;
        height: 32px;
        border: 2px solid var(--border-color);
        box-shadow: 2px 2px 0 var(--shadow-color);
        z-index: 25;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: badge-pop 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    @keyframes badge-pop {
        0% {
            transform: scale(0.5);
        }
        100% {
            transform: scale(1);
        }
    }

    .selection-badge :global(svg) {
        width: 20px;
        height: 20px;
    }

    .card-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        color: var(--text-color);
    }

    .card-icon :global(svg) {
        width: 48px;
        height: 48px;
        stroke-width: 2;
    }

    .card-preview {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
    }

    .pdf-image-wrapper {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .card-preview img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
    }

    :global(html.dark) .card-preview img {
        filter: invert(1) hue-rotate(180deg);
    }

    .card-metadata {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 12px;
        box-sizing: border-box;
        text-align: left;
    }

    .card-title {
        font-size: 13px;
        font-weight: 800;
        text-transform: uppercase;
        margin: 0;
        text-align: left;
        width: 100%;
        word-wrap: break-word;
        color: var(--text-color);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        line-height: 1.3;
    }

    .card-author {
        font-size: 10.5px;
        font-weight: 600;
        text-transform: uppercase;
        margin: 0;
        text-align: left;
        width: 100%;
        word-wrap: break-word;
        color: var(--text-color);
        opacity: 0.7;
        display: -webkit-box;
        -webkit-line-clamp: 1;
        line-clamp: 1;
        -webkit-box-orient: vertical;
        overflow: hidden;
        line-height: 1.2;
    }

    .badge {
        position: absolute;
        top: 15px;
        left: 15px;
        background: var(--danger-active-color);
        color: var(--danger-text-color);
        font-size: 11px;
        font-weight: bold;
        padding: 4px 10px;
        transform: rotate(-10deg);
        border: 1.5px solid var(--border-color);
        box-shadow: 2px 2px 0 var(--shadow-color);
        z-index: 10;
        text-transform: uppercase;
    }

    .card-menu {
        position: absolute;
        top: 15px;
        right: 15px;
        z-index: 20;
    }

    :global(.menu-btn) {
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.15s ease !important;
    }

    @media (hover: hover) {
        .card:hover :global(.menu-btn) {
            opacity: 1;
            pointer-events: auto;
        }
    }

    .dropdown-menu {
        position: absolute;
        top: calc(100% + 8px);
        right: 0;
        background: var(--surface-color);
        border: 2px solid var(--border-color);
        box-shadow: 4px 4px 0 var(--shadow-color);
        min-width: 160px;
        z-index: 100;
        overflow: hidden;
    }

    .dropdown-item {
        width: 100%;
        padding: 10px 12px;
        display: flex;
        align-items: center;
        gap: 10px;
        background: transparent;
        border: none;
        color: var(--text-color);
        font-family: inherit;
        font-size: 12px;
        font-weight: 800;
        text-transform: uppercase;
        cursor: pointer;
        text-align: left;
        transition: background-color 0.1s ease;
    }

    @media (hover: hover) {
        .dropdown-item:hover {
            background-color: var(--surface-hover-color);
            color: var(--danger-active-color);
        }
    }

    .dropdown-item:active {
        background-color: var(--surface-hover-color);
    }

    :global(.dropdown-icon) {
        width: 16px;
        height: 16px;
    }

    .lock-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.45);
        backdrop-filter: blur(3px);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        color: #ffffff;
        font-weight: 800;
        z-index: 10;
        opacity: 0.9;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    @media (hover: hover) {
        .card:hover .lock-overlay {
            background: rgba(0, 0, 0, 0.7);
            opacity: 1;
            backdrop-filter: blur(5px);
        }
    }

    :global(.lock-icon) {
        width: 28px;
        height: 28px;
        stroke: #ffde4d;
        filter: drop-shadow(2px 2px 0 rgba(0, 0, 0, 0.5));
        transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    @media (hover: hover) {
        .card:hover .lock-overlay :global(.lock-icon) {
            transform: scale(1.15) rotate(-5deg);
        }
    }

    .lock-text {
        text-transform: uppercase;
        font-size: 10px;
        background: #1a1a1a;
        color: #ffde4d;
        border: 2px solid var(--border-color);
        padding: 4px 8px;
        box-shadow: 2px 2px 0 var(--shadow-color);
        letter-spacing: 0.5px;
        font-weight: 900;
        transition: all 0.1s ease;
    }

    @media (hover: hover) {
        .card:hover .lock-text {
            background: var(--accent-color, #00cec9);
            color: var(--text-color, #1a1a1a);
        }
    }

    .progress-container {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 28px;
        background: var(--surface-color);
        border-top: 2px solid var(--border-color);
        box-sizing: border-box;
        overflow: hidden;
        z-index: 5;
    }

    .progress-bar-track {
        width: 100%;
        height: 100%;
        position: relative;
        background: transparent;
    }

    .progress-bar-fill {
        height: 100%;
        background: var(--danger-active-color);
        transition: width 0.3s ease-in-out;
        box-sizing: border-box;
    }

    .progress-bar-fill.has-border {
        border-right: 2px solid var(--border-color);
    }

    .progress-text {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 900;
        text-transform: uppercase;
        color: var(--text-color);
        pointer-events: none;
    }

    @media (--mobile-width) {
        .card-metadata {
            padding: 8px;
            gap: 2px;
        }

        .card-title {
            font-size: 11px;
        }

        .card-author {
            font-size: 9.5px;
        }

        .card-icon :global(svg) {
            width: 36px;
            height: 36px;
        }

        .badge {
            top: 8px;
            left: 8px;
            font-size: 9px;
            padding: 2px 6px;
        }

        .card-menu {
            top: 8px;
            right: 8px;
        }

        :global(.menu-btn) {
            opacity: 1;
            pointer-events: auto;
        }

        .dropdown-menu {
            min-width: 140px;
            box-shadow: 2px 2px 0 var(--shadow-color);
        }

        .dropdown-item {
            padding: 8px 10px;
            font-size: 11px;
        }

        .lock-icon {
            width: 20px;
            height: 20px;
        }

        .lock-text {
            font-size: 8px;
            padding: 2px 4px;
            border-width: 1.5px;
            box-shadow: 1px 1px 0 var(--shadow-color);
        }

        .progress-container {
            height: 22px;
        }

        .progress-text {
            font-size: 10.5px;
        }
    }
</style>
