export function shouldCloseOnBackdrop(
    variant: "default" | "confirmation",
    closeOnBackdrop: boolean | undefined,
): boolean {
    return variant === "default" && closeOnBackdrop !== false
}
