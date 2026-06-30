import { css } from "lit";

export const styles = css`
  :host {
    --color-primary: #000000;
    --color-on-primary: #ffffff;
    --color-secondary: #005fad;
    --color-ink: #171717;
    --color-background: #ffffff;
    --color-surface: #f8f9ff;
    --color-surface-dark: #171717;
    --color-surface-strong: #f0f0f3;
    --color-surface-tint: #5e5e5e;
    --color-surface-container-lowest: #ffffff;
    --color-canvas-soft: #fafafa;
    --color-hairline-strong: #dcdee0;
    --color-on-surface-variant: #4c4546;
    --color-on-primary-fixed-variant: #474747;
    --color-outline-variant: #cfc4c5;

    --color-secondary-fixed-dim: #a4c9ff;

    --rounded-lg: 0.5rem;
    --rounded-xl: 0.75rem;
    --rounded-full: 9999px;

    --spacing-base: 16px;
    --spacing-md: 20px;
    --spacing-lg: 24px;
    --spacing-xl: 32px;
    --spacing-xxl: 48px;
    --spacing-section: 96px;
    --spacing-gutter: 24px;
    --spacing-margin-mobile: 16px;
    --max-width: 1200px;

    display: block;
    background: var(--color-background);
    color: var(--color-ink);
    font-family: "Inter", sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  *, *::before, *::after {
    box-sizing: border-box;
  }
`;
