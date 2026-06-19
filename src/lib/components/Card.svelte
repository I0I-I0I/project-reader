<script lang="ts">
    import type { Component } from "svelte"
    import type { HTMLAttributes } from "svelte/elements"
    import Spinner from "$lib/components/ui/Spinner.svelte"
    import * as m from "$lib/paraglide/messages"
    import { viewerStore } from "$lib/stores/viewerStore.svelte"
    import { fileNodeToBook } from "$lib/stores/viewerStore.types"
    import BookOpenIcon from "$lib/components/icons/BookOpenIcon.svelte"
    import CheckCircleIcon from "$lib/components/icons/CheckCircleIcon.svelte"
    import { vfsStore, usePreviewUrl } from "$lib/stores/vfsStore.svelte"
    import type { VFSNode, FileNode } from "$lib/stores/vfsStore.types"
    import TrashIcon from "$lib/components/icons/TrashIcon.svelte"
    import NavigationIcon from "$lib/components/icons/NavigationIcon.svelte"
    import MoreVerticalIcon from "$lib/components/icons/MoreVerticalIcon.svelte"
    import FolderIcon from "$lib/components/icons/FolderIcon.svelte"
    import CheckIcon from "$lib/components/icons/CheckIcon.svelte"
    import EditIcon from "$lib/components/icons/EditIcon.svelte"
    import PDFDocument from "$lib/pdf"
    import { settingsStore } from "$lib/stores/settingsStore.svelte"
    import Button from "./ui/Button.svelte"
    import Dropdown from "./ui/Dropdown.svelte"
    import { uiStore } from "$lib/stores/uiStore.svelte"

    interface Props extends HTMLAttributes<HTMLDivElement> {
        node?: VFSNode
        name?: string
        isPlaceholder?: boolean
        Icon?: Component
        class?: string
        onclick?: (e: MouseEvent) => void | Promise<void>
    }

    let {
        node,
        name = "",
        isPlaceholder = false,
        Icon,
        class: className,
        onclick,
        ...props
    }: Props = $props()
    let isRestoring = $state(false)
    let showMenu = $state(false)
    let longPressTimeout: ReturnType<typeof setTimeout> | undefined

    const isSelected = $derived(node ? vfsStore.selectedIds.has(node.id) : false)
    const kind = $derived(isPlaceholder ? "book" : node?.type === "file" ? "book" : "folder")
    const extension = $derived(isPlaceholder ? "pdf" : node?.type === "file" ? "pdf" : undefined)

    const preview = usePreviewUrl(() => (node && node.type === "file" ? node.id : ""))
    const previewUrl = $derived(preview ? preview.url : "")

    const fileNode = $derived(node && node.type === "file" ? (node as FileNode) : null)

    const book = $derived.by(() => {
        if (!isPlaceholder && fileNode) {
            const b = fileNodeToBook(fileNode)
            b.previewDataUrl = previewUrl
            b.isLocked = vfsStore.isLockedMap[fileNode.id]
            return b
        }
        return null
    })

    let progressPercent = $derived.by(() => {
        if (
            !isPlaceholder &&
            fileNode &&
            fileNode.metadata.totalPages &&
            fileNode.metadata.totalPages > 0
        ) {
            const page = fileNode.metadata.pageNumber || 1
            const total = fileNode.metadata.totalPages
            return Math.min(100, Math.max(0, Math.round((page / total) * 100)))
        }
        return 0
    })

    const handleClick = async (e: MouseEvent) => {
        if (isPlaceholder || isRestoring) return
        const target = e.target as HTMLElement | null
        if (target && target.closest(".card-menu")) return
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
        if (!node || uiStore.isSelectionMode) return
        longPressTimeout = setTimeout(() => {
            if (node) {
                uiStore.isSelectionMode = true
                vfsStore.toggleSelection(node.id)
                if (navigator.vibrate) navigator.vibrate(50)
            }
        }, 500)
    }

    const onPointerUp = () => {
        clearTimeout(longPressTimeout)
    }

    const handleImageError = async () => {
        if (!node) return
        console.warn(
            `[Card] Preview image failed to load for node ${node.id}, attempting to regenerate...`,
        )
        // This will trigger the getPreviewUrl again in a bit, but we might want to force clear it in DB
        // For now, let's just clear the local cache
        if (preview) {
            await preview.regenerate()
        }
    }

    const onRemove = async (e: MouseEvent) => {
        if (!node) return
        e.stopPropagation()
        showMenu = false
        uiStore.nodesToDeleteIds = [node.id]
        uiStore.isDeleteModalOpen = true
    }

    const onMove = (e: MouseEvent) => {
        if (!node) return
        e.stopPropagation()
        uiStore.nodeToMoveId = node.id
        uiStore.prompt.mode = "move"
        uiStore.prompt.isOpen = true
        showMenu = false
    }

    const onSelect = (e: MouseEvent) => {
        if (!node) return
        e.stopPropagation()
        uiStore.isSelectionMode = true
        vfsStore.toggleSelection(node.id)
        showMenu = false
    }

    const onEditMetadata = (e: MouseEvent) => {
        if (!node) return
        e.stopPropagation()
        uiStore.nodeToEditMetadataId = node.id
        uiStore.isEditMetadataModalOpen = true
        showMenu = false
    }

    const isRead = $derived(
        fileNode &&
            fileNode.metadata.totalPages !== undefined &&
            fileNode.metadata.totalPages > 0 &&
            (fileNode.metadata.pageNumber || 1) === fileNode.metadata.totalPages,
    )

    const toggleReadState = async (e: MouseEvent) => {
        e.stopPropagation()
        showMenu = false
        if (!fileNode) return

        let total = fileNode.metadata.totalPages
        if (!total) {
            // Load metadata on the fly if it is missing
            const url = await vfsStore.getFileUrl(fileNode.id)
            if (url) {
                const doc = new PDFDocument(url)
                try {
                    await doc.load(settingsStore.scale)
                    total = await doc.getPageNumber()
                } catch (err) {
                    console.error("[Card] Failed to get total pages for toggleReadState:", err)
                } finally {
                    await doc.close()
                    if (vfsStore.isLockedMap[fileNode.id]) {
                        vfsStore.revokeFileUrl(fileNode.id)
                    }
                }
            }
        }

        if (!total) {
            total = 1
        }

        const isCurrentlyRead = (fileNode.metadata.pageNumber || 1) === total
        const targetPage = isCurrentlyRead ? 1 : total

        const currentBook = viewerStore.getCurrentBook()
        if (currentBook && currentBook.id === fileNode.id) {
            await viewerStore.updateBook({
                ...currentBook,
                pageNumber: targetPage,
                totalPages: total,
            })
        } else {
            await vfsStore.updateFile(fileNode.id, {
                metadata: {
                    ...fileNode.metadata,
                    pageNumber: targetPage,
                    totalPages: total,
                },
            })
        }
    }

    const closeMenu = () => {
        showMenu = false
    }

    const handleMouseLeave = () => {
        if (window.matchMedia("(hover: hover)").matches) {
            closeMenu()
        }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
        if (isPlaceholder) return
        if (e.target !== e.currentTarget) return
        if (e.key === "e" || e.key === "E") {
            e.preventDefault()
            showMenu = true
        }
        if (e.key === " ") {
            e.preventDefault()
            if (node) {
                uiStore.isSelectionMode = true
                vfsStore.toggleSelection(node.id)
            }
        }
        if (e.key === "Enter") {
            e.preventDefault()
            handleClick(e as any)
        }
    }
</script>

<div
    role="button"
    tabindex={isPlaceholder || isRestoring ? -1 : 0}
    class={`card ${className}`}
    class:is-selected={isSelected}
    class:is-placeholder={isPlaceholder}
    onmouseleave={handleMouseLeave}
    onpointerdown={isPlaceholder ? null : onPointerDown}
    onpointerup={isPlaceholder ? null : onPointerUp}
    onpointercancel={isPlaceholder ? null : onPointerUp}
    onclick={handleClick}
    onkeydown={handleKeyDown}
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

        {#if isPlaceholder}
            <div class="card-icon" aria-hidden="true">
                <Spinner variant="classic" size="md" />
            </div>
        {:else if book && book.previewDataUrl}
            <div class="card-preview" aria-hidden="true">
                <div class="pdf-image-wrapper">
                    <img
                        src={book.previewDataUrl}
                        alt={m.cover_preview_alt()}
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
        <p class="card-title">{isPlaceholder ? name : node?.name}</p>
        {#if kind === "book"}
            <p class="card-author">
                {#if isPlaceholder}
                    {m.importing_book()}
                {:else if book}
                    {#if book.author}
                        {book.author}
                    {:else}
                        {m.unknown_author()}
                    {/if}
                {/if}
            </p>
        {/if}
    </div>

    {#if !isPlaceholder && !uiStore.isSelectionMode && (kind === "book" || kind === "folder")}
        <div class="card-menu">
            <Dropdown align="right" bind:isOpen={showMenu}>
                {#snippet trigger(props)}
                    <Button
                        {...props}
                        variant="fab"
                        square={true}
                        size="large"
                        class="menu-btn"
                        tabindex={-1}
                        aria-label={m.more_options ? m.more_options() : "More options"}
                        onpointerdown={(e) => e.stopPropagation()}
                    >
                        <MoreVerticalIcon />
                    </Button>
                {/snippet}

                <Button variant="none" class="dropdown-item" role="menuitem" onclick={onSelect}>
                    <CheckIcon class="dropdown-icon" />
                    <span>{m.select ? m.select() : "Select"}</span>
                </Button>
                <Button variant="none" class="dropdown-item" role="menuitem" onclick={onMove}>
                    <NavigationIcon class="dropdown-icon" />
                    <span>{m.move ? m.move() : "Move"}</span>
                </Button>
                {#if kind === "book"}
                    <Button
                        variant="none"
                        class="dropdown-item"
                        role="menuitem"
                        onclick={toggleReadState}
                    >
                        {#if isRead}
                            <BookOpenIcon class="dropdown-icon" />
                            <span>{m.mark_as_unread ? m.mark_as_unread() : "Mark as unread"}</span>
                        {:else}
                            <CheckCircleIcon class="dropdown-icon" />
                            <span>{m.mark_as_read ? m.mark_as_read() : "Mark as read"}</span>
                        {/if}
                    </Button>
                    <Button
                        variant="none"
                        class="dropdown-item"
                        role="menuitem"
                        onclick={onEditMetadata}
                    >
                        <EditIcon class="dropdown-icon" />
                        <span>{m.edit_metadata ? m.edit_metadata() : "Edit metadata"}</span>
                    </Button>
                {/if}
                <Button variant="none" class="dropdown-item" role="menuitem" onclick={onRemove}>
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
                </Button>
            </Dropdown>
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
        width: 100%;
        height: 100%;
        padding: 0;
        cursor: pointer;
        font-family: inherit;
        text-align: left;
        color: inherit;
        align-items: stretch;
        justify-content: flex-start;
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
        .card:hover:not(.is-placeholder) {
            transform: translate(-4px, -4px);
            box-shadow: 8px 8px 0 var(--shadow-color);
            background-color: var(--surface-hover-color);
        }

        .card.is-selected:hover:not(.is-placeholder) {
            box-shadow: 8px 8px 0 var(--danger-active-color);
        }
    }

    .card:focus-visible:not(.is-placeholder) {
        transform: translate(-4px, -4px);
        box-shadow: 8px 8px 0 var(--shadow-color);
        background-color: var(--surface-hover-color);
        outline: none;
    }

    .card.is-selected:focus-visible:not(.is-placeholder) {
        box-shadow: 8px 8px 0 var(--danger-active-color);
        outline: none;
    }

    .card:active:not(.is-placeholder) {
        transform: translate(2px, 2px);
        box-shadow: 2px 2px 0 var(--shadow-color);
    }

    .card.is-selected:active:not(.is-placeholder) {
        box-shadow: 2px 2px 0 var(--danger-active-color);
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
        font-size: var(--font-size-md);
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
        font-size: var(--font-size-2xs);
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
        font-size: var(--font-size-sm);
        font-weight: bold;
        padding: 4px 10px;
        transform: rotate(-10deg);
        border: 1.5px solid var(--border-color);
        box-shadow: 2px 2px 0 var(--shadow-color);
        z-index: var(--z-10);
        text-transform: uppercase;
    }

    .card-menu {
        position: absolute;
        top: 15px;
        right: 15px;
        z-index: var(--z-20);
    }

    :global(.menu-btn) {
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.15s ease !important;
        box-shadow: 2px 2px 0 var(--shadow-color) !important;
    }

    :global(.menu-btn) :global(svg) {
        width: 20px !important;
        height: 20px !important;
    }

    :global(.menu-btn.open),
    .card:hover :global(.menu-btn),
    .card:focus-visible :global(.menu-btn) {
        opacity: 1;
        pointer-events: auto;
    }

    @media (hover: hover) {
        :global(.menu-btn):hover:not(:disabled):not(.open),
        :global(.menu-btn):focus-visible:not(:disabled):not(.open) {
            transform: translate(-1px, -1px) !important;
            box-shadow: 3px 3px 0 var(--shadow-color) !important;
        }
    }

    :global(.menu-btn):active:not(:disabled),
    :global(.menu-btn.open) {
        transform: translate(1px, 1px) !important;
        box-shadow: 1px 1px 0 var(--shadow-color) !important;
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
        z-index: var(--z-5);
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
        font-size: var(--font-size-base);
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
            font-size: var(--font-size-sm);
        }

        .card-author {
            font-size: var(--font-size-2xs);
        }

        .card-icon :global(svg) {
            width: 36px;
            height: 36px;
        }

        .badge {
            top: 8px;
            left: 8px;
            font-size: var(--font-size-2xs);
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

        .progress-container {
            height: 22px;
        }

        .progress-text {
            font-size: var(--font-size-2xs);
        }
    }

    .card.is-placeholder {
        opacity: 0.7;
        cursor: wait;
    }

    .card.is-placeholder :global(.card-main-button) {
        cursor: wait;
    }
</style>
