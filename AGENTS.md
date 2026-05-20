# AGENTS.md

## 🚀 Core Technology Stack & Strict Rules

1. **Package Manager**: **`pnpm`**
    - **Rule**: ALWAYS use `pnpm` for installing dependencies, running scripts, and managing the workspace.
    - _Example Commands_: `pnpm install`, `pnpm add <pkg>`, `pnpm run dev`, `pnpm check`, `pnpm lint`, `pnpm format`.

2. **Framework**: **Svelte 5 & SvelteKit**
    - **Rule**: Svelte 5 **Runes Mode** is forced in `svelte.config.js` for all non-node_modules files.
    - Use Svelte 5 runes:
        - Reactive state: `let count = $state(0);`
        - Derived state: `let doubled = $derived(count * 2);`
        - Component props: `let { propA, propB } = $props();`
        - Side effects: `let effect = $effect(() => { ... });` (use sparingly)
        - Component slots: Use **Snippets** (`{#snippet children()}`, etc.) instead of `<slot />`.
        - Event handling: Pass callback functions as standard props (e.g., `onclick` prop) instead of `on:click`.

3. **Styling & Design System**: **Vanilla CSS / Custom Styles**
    - **Rule**: Avoid generic colors or browser defaults. Use curated, vibrant color palettes, HSL variables, sleek dark modes, glassmorphism, dynamic transitions, and modern typography (Google Fonts like Outfit, Inter, Playfair Display).
    - Do NOT use Tailwind CSS unless the user explicitly requests it.

4. **Styling & Design System**: **Vanilla CSS / Custom Styles**
    - **Rule**: Avoid generic colors or browser defaults. Use curated, vibrant color palettes, HSL variables, sleek dark modes, glassmorphism, dynamic transitions, and modern typography (Google Fonts like Outfit, Inter, Playfair Display).
    - Do NOT use Tailwind CSS unless the user explicitly requests it.
