<script lang="ts">
    import { onMount, tick } from "svelte"
    import Button from "../Button.svelte"
    import Float from "./Float.svelte"
    import { getFocusableElements, restoreFocus, trapTabKey } from "./modalFocus"
    import {
        clampModalPosition,
        exceededDragThreshold,
        getVisualViewportBounds,
        type ModalPosition,
    } from "./modalDrag"
    import { modalManager } from "./modalManager.svelte"
    import type { ModalCloseReason, ModalProps } from "./modal.types"

    let props: ModalProps = $props()

    const generatedId = $props.id()
    let modalId = $derived(props.id ?? generatedId)
    let titleId = $derived(`${modalId}-title`)
    let descriptionId = $derived(`${modalId}-description`)

    let surfaceRef = $state<HTMLElement | null>(null)
    let closeButtonRef = $state<HTMLButtonElement | null>(null)
    let localBusy = $state(false)
    let position = $state<ModalPosition | null>(null)
    let dragStart: { pointerX: number; pointerY: number; x: number; y: number } | null = null

    let variant = $derived(props.variant ?? "default")
    let modalType = $derived(props.type ?? "float")
    let modalSize = $derived(props.size ?? (modalType === "layout" ? "large" : "medium"))
    let modalPlacement = $derived(props.placement ?? "center")
    let showHeader = $derived(props.showHeader ?? true)
    let showCloseButton = $derived(
        props.showCloseButton ?? (variant === "confirmation" ? Boolean(props.cancelLabel) : true),
    )
    let isDraggable = $derived(variant === "default" && Boolean(props.draggable) && showHeader)
    let isBusy = $derived(variant === "confirmation" && (Boolean(props.busy) || localBusy))
    let modalState = $derived(modalManager.get(modalId)?.state ?? "blocking")
    let isTopmostBlocking = $derived(modalManager.topmostBlockingModal?.id === modalId)
    let zIndex = $derived(modalManager.zIndex(modalId))
    let surfaceStyle = $derived(
        position ? `position:fixed;left:${position.x}px;top:${position.y}px;margin:0;` : "",
    )
    let floatPlacementProps = $derived(
        modalPlacement === "anchor"
            ? ({ placement: "anchor", anchor: props.anchor! } as const)
            : ({ placement: modalPlacement } as const),
    )

    function requestClose(reason: ModalCloseReason) {
        if (isBusy) return
        if (variant === "confirmation") {
            if (reason === "backdrop") return
            if (reason === "escape" || reason === "close-button" || reason === "cancel") {
                if (!props.cancelLabel) return
                props.onCancel?.()
                props.onClose("cancel")
                return
            }
        }
        props.onClose(reason)
    }

    async function confirm() {
        if (variant !== "confirmation" || isBusy) return
        localBusy = true
        try {
            await props.onConfirm!()
            props.onClose("confirmed")
        } finally {
            localBusy = false
        }
    }

    function resolveInitialFocus(): HTMLElement | null {
        const requested = props.initialFocus
        if (requested instanceof HTMLElement) return requested
        if (typeof requested === "function") return requested()
        if (requested === "close") return closeButtonRef
        if (requested === "first") return surfaceRef ? getFocusableElements(surfaceRef)[0] : null
        if (variant === "confirmation" && surfaceRef) {
            return surfaceRef.querySelector<HTMLElement>(".confirmation-actions button:last-child")
        }
        return surfaceRef ? getFocusableElements(surfaceRef)[0] : null
    }

    function handleWindowKeydown(event: KeyboardEvent) {
        if (!isTopmostBlocking || modalState !== "blocking" || !surfaceRef) return
        if (event.key === "Tab") {
            trapTabKey(event, surfaceRef)
            return
        }
        if (event.key !== "Escape") return

        const canEscape =
            variant === "confirmation"
                ? Boolean(props.cancelLabel) && !isBusy
                : (props.closeOnEscape ?? true)
        if (!canEscape) return
        event.preventDefault()
        event.stopImmediatePropagation()
        requestClose("escape")
    }

    function handleSurfacePointerDown() {
        if (modalState === "modeless") modalManager.bringToFront(modalId)
    }

    function handleHeaderPointerDown(event: PointerEvent) {
        if (!isDraggable || event.button !== 0 || !surfaceRef) return
        const target = event.target as HTMLElement
        if (target.closest("button, a, input, select, textarea, [contenteditable='true']")) return
        const rect = surfaceRef.getBoundingClientRect()
        dragStart = { pointerX: event.clientX, pointerY: event.clientY, x: rect.left, y: rect.top }
        if (event.currentTarget instanceof HTMLElement) {
            event.currentTarget.setPointerCapture(event.pointerId)
        }
    }

    function handleHeaderPointerMove(event: PointerEvent) {
        if (!dragStart || !surfaceRef) return
        const dx = event.clientX - dragStart.pointerX
        const dy = event.clientY - dragStart.pointerY
        if (modalState === "blocking" && !exceededDragThreshold(dx, dy)) return
        if (modalState === "blocking") modalManager.setModeless(modalId)
        position = clampModalPosition(
            { x: dragStart.x + dx, y: dragStart.y + dy },
            surfaceRef.getBoundingClientRect(),
            getVisualViewportBounds(),
        )
    }

    function handleHeaderPointerUp(event: PointerEvent) {
        if (
            event.currentTarget instanceof HTMLElement &&
            event.currentTarget.hasPointerCapture(event.pointerId)
        ) {
            event.currentTarget.releasePointerCapture(event.pointerId)
        }
        dragStart = null
    }

    function reclampPosition() {
        if (!position || !surfaceRef) return
        position = clampModalPosition(
            position,
            surfaceRef.getBoundingClientRect(),
            getVisualViewportBounds(),
        )
    }

    onMount(() => {
        if (!props.title && !props.ariaLabel) throw new Error("Modal requires title or ariaLabel")
        if (modalPlacement === "anchor" && !props.anchor) {
            throw new Error('Modal placement="anchor" requires an anchor element')
        }
        if (props.draggable && !showHeader) {
            throw new Error("A headerless Modal cannot be draggable")
        }
        if (variant === "confirmation" && (props.draggable || modalSize === "fullscreen")) {
            throw new Error("Confirmation Modals cannot be draggable or fullscreen")
        }

        const restoreFocusTo =
            document.activeElement instanceof HTMLElement ? document.activeElement : null
        const unregister = modalManager.register({
            id: modalId,
            state: "blocking",
            element: surfaceRef,
            close: requestClose,
            restoreFocusTo,
        })

        void tick().then(() => {
            modalManager.updateElement(modalId, surfaceRef)
            requestAnimationFrame(() =>
                (resolveInitialFocus() ?? closeButtonRef ?? surfaceRef)?.focus(),
            )
        })

        const viewport = window.visualViewport
        viewport?.addEventListener("resize", reclampPosition)
        viewport?.addEventListener("scroll", reclampPosition)
        window.addEventListener("resize", reclampPosition)

        return () => {
            viewport?.removeEventListener("resize", reclampPosition)
            viewport?.removeEventListener("scroll", reclampPosition)
            window.removeEventListener("resize", reclampPosition)
            const removed = unregister()
            restoreFocus(removed?.restoreFocusTo ?? null, modalManager.topmostModal?.element)
        }
    })
</script>

<svelte:window onkeydowncapture={handleWindowKeydown} />

<Float
    {...floatPlacementProps}
    backdrop={modalState === "blocking" ? "blur" : "none"}
    onBackdropPointerDown={() => {
        if (variant === "default" && (props.closeOnBackdrop ?? false)) requestClose("backdrop")
    }}
    onSurfacePointerDown={handleSurfacePointerDown}
    onSurfaceFocusIn={handleSurfacePointerDown}
    bind:surfaceRef
    wrapperClass={[
        "modal-wrapper",
        `modal-wrapper-${modalType}`,
        `modal-wrapper-${modalSize}`,
    ].join(" ")}
    class={["modal-surface", `modal-${modalType}`, `modal-${modalSize}`, position && "positioned"]
        .filter(Boolean)
        .join(" ")}
    style={surfaceStyle}
    role={variant === "confirmation" ? "alertdialog" : "dialog"}
    ariaModal={modalState === "blocking"}
    ariaLabel={props.ariaLabel}
    ariaLabelledby={props.title ? titleId : undefined}
    ariaDescribedby={props.description ? descriptionId : undefined}
    {zIndex}
>
    {#if props.description}
        <p id={descriptionId} class="visually-hidden">{props.description}</p>
    {/if}

    {#if showHeader}
        <div
            class={["modal-header", isDraggable && "drag-handle"]}
            role="toolbar"
            tabindex={isDraggable ? 0 : undefined}
            aria-label={isDraggable
                ? `Move ${props.title ?? "dialog"}`
                : `${props.title ?? "Dialog"} header`}
            onpointerdown={handleHeaderPointerDown}
            onpointermove={handleHeaderPointerMove}
            onpointerup={handleHeaderPointerUp}
            onpointercancel={handleHeaderPointerUp}
        >
            {#if props.header}
                {#if props.title}
                    <h2 id={titleId} class="visually-hidden">{props.title}</h2>
                {/if}
                <div class="custom-header">{@render props.header()}</div>
                {#if showCloseButton}
                    <Button
                        bind:ref={closeButtonRef}
                        variant="close"
                        square
                        onclick={() => requestClose("close-button")}
                        aria-label={props.closeLabel ?? "Close"}
                        disabled={isBusy}>×</Button
                    >
                {/if}
            {:else}
                <h2 id={titleId} class="modal-title">{props.title}</h2>
                {#if showCloseButton}
                    <Button
                        bind:ref={closeButtonRef}
                        variant="close"
                        square
                        onclick={() => requestClose("close-button")}
                        aria-label={props.closeLabel ?? "Close"}
                        disabled={isBusy}>×</Button
                    >
                {/if}
            {/if}
        </div>
    {:else if props.title}
        <h2 id={titleId} class="visually-hidden">{props.title}</h2>
    {/if}

    {#if variant === "confirmation"}
        <div class="modal-body confirmation-body">
            <p class="confirmation-message">{props.message}</p>
        </div>
        <div class="modal-footer confirmation-actions">
            {#if props.cancelLabel}
                <Button
                    class="confirmation-cancel"
                    variant="close"
                    disabled={isBusy}
                    onclick={() => requestClose("cancel")}>{props.cancelLabel}</Button
                >
            {/if}
            <Button
                variant="brutalist"
                class={props.confirmTone === "danger" ? "confirmation-danger" : ""}
                disabled={isBusy}
                aria-busy={isBusy}
                onclick={() => void confirm()}>{props.confirmLabel}</Button
            >
        </div>
    {:else}
        <div class="modal-body">
            {#if modalType === "layout" && props.sidebar}
                <aside class="modal-sidebar">{@render props.sidebar()}</aside>
                <div class="modal-content-region">{@render props.children?.()}</div>
            {:else}
                {@render props.children?.()}
            {/if}
        </div>
        {#if props.footer}
            <div class="modal-footer">{@render props.footer()}</div>
        {/if}
    {/if}
</Float>

<style>
    :global(.modal-wrapper) {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 40px 20px;
    }

    :global(.modal-wrapper .modal-surface) {
        max-width: 100%;
        max-height: 100%;
        margin: auto;
    }

    :global(.modal-wrapper.placement-top .modal-surface) {
        margin-top: 80px;
        margin-bottom: auto;
    }

    :global(.modal-wrapper.placement-bottom .modal-surface) {
        margin-top: auto;
        margin-bottom: 0;
    }

    :global(.modal-surface) {
        --modal-small: 34rem;
        --modal-medium: 46rem;
        --modal-large: 72rem;
        display: flex;
        flex-direction: column;
        width: min(var(--modal-width), calc(var(--float-viewport-width, 100vw) - 40px));
        max-height: min(52rem, calc(var(--float-viewport-height, 100dvh) - 80px));
        min-width: 0;
        min-height: 0;
        overflow: hidden;
        background: var(--surface-color);
        border: 3px solid var(--border-color);
        border-radius: var(--radius-md);
        box-shadow: 6px 6px 0 var(--shadow-color);
        color: var(--text-color);
        font-family: inherit;
    }

    :global(.modal-small) {
        --modal-width: var(--modal-small);
    }
    :global(.modal-medium) {
        --modal-width: var(--modal-medium);
    }
    :global(.modal-large) {
        --modal-width: var(--modal-large);
        height: min(48rem, calc(var(--float-viewport-height, 100dvh) - 80px));
    }
    :global(.modal-fullscreen) {
        --modal-width: calc(var(--float-viewport-width, 100vw) - 40px);
        width: var(--modal-width);
        height: calc(var(--float-viewport-height, 100dvh) - 40px);
        max-height: none;
    }
    :global(.modal-surface.positioned) {
        max-width: calc(var(--float-viewport-width, 100vw) - 16px);
        max-height: calc(var(--float-viewport-height, 100dvh) - 16px);
    }

    .modal-header,
    .modal-footer {
        flex: 0 0 auto;
        background: var(--bg-color);
    }

    .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-width: 0;
        padding: 16px 24px;
        border-bottom: 2px solid var(--border-color);
        touch-action: none;
    }

    .modal-header.drag-handle {
        cursor: grab;
        user-select: none;
    }
    .modal-header.drag-handle:active {
        cursor: grabbing;
    }
    .modal-header.drag-handle:focus-visible {
        outline: 3px solid var(--accent-color);
        outline-offset: -5px;
    }

    .custom-header {
        min-width: 0;
        width: 100%;
    }

    .modal-title {
        min-width: 0;
        margin: 0;
        overflow-wrap: anywhere;
        font-size: var(--font-size-3xl);
        font-weight: 800;
        letter-spacing: -0.5px;
        text-transform: uppercase;
    }

    .modal-body,
    .modal-content-region,
    .modal-sidebar {
        min-width: 0;
        min-height: 0;
    }

    .modal-body {
        display: flex;
        flex: 1 1 auto;
        flex-direction: column;
        overflow-x: hidden;
        overflow-y: auto;
        overscroll-behavior: contain;
    }

    :global(.modal-layout) .modal-body {
        display: grid;
        grid-template-columns: minmax(12rem, 18rem) minmax(0, 1fr);
        overflow: hidden;
    }
    .modal-sidebar,
    .modal-content-region {
        overflow-x: hidden;
        overflow-y: auto;
        overscroll-behavior: contain;
    }
    .modal-sidebar {
        border-right: 2px solid var(--border-color);
        background: var(--bg-color);
    }

    .modal-footer {
        padding: 12px 24px;
        border-top: 2px solid var(--border-color);
    }

    .confirmation-body {
        padding: 24px;
    }
    .confirmation-message {
        margin: 0;
        overflow-wrap: anywhere;
        font-size: var(--font-size-xl);
        line-height: 1.5;
    }
    .confirmation-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
    }
    :global(.confirmation-danger) {
        background: var(--danger-active-color) !important;
        color: var(--danger-text-color) !important;
    }

    .visually-hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
    }

    @media (--mobile) {
        :global(.modal-wrapper) {
            padding: 16px 12px;
        }
        :global(.modal-wrapper.placement-top .modal-surface) {
            margin-top: 0;
        }
        :global(.modal-wrapper-layout.modal-wrapper-large),
        :global(.modal-wrapper-layout.modal-wrapper-fullscreen) {
            padding: 0;
        }
        :global(.modal-surface) {
            width: min(var(--modal-width), calc(var(--float-viewport-width, 100vw) - 24px));
            max-height: calc(var(--float-viewport-height, 100dvh) - 32px);
        }
        :global(.modal-layout.modal-large),
        :global(.modal-layout.modal-fullscreen) {
            width: var(--float-viewport-width, 100vw);
            height: var(--float-viewport-height, 100dvh);
            max-height: none;
            border-right: 0;
            border-left: 0;
            border-radius: 0;
            box-shadow: none;
        }
        :global(.modal-layout) .modal-body {
            grid-template-columns: 1fr;
        }
        .modal-sidebar {
            max-height: 35%;
            border-right: 0;
            border-bottom: 2px solid var(--border-color);
        }
        .modal-header,
        .modal-footer {
            padding: 12px 16px;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        :global(.modal-surface),
        .modal-header {
            transition: none;
        }
    }
</style>
