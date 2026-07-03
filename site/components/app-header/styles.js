import { css } from "lit";

export const styles = css`
  :host { display: block; }

  nav {
    position: fixed;
    top: 0;
    width: 100%;
    z-index: 50;
    background: rgba(248, 249, 255, 0.8);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border-bottom: 1px solid var(--color-hairline-strong);
  }

  .inner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: var(--header-height);
    padding: 0 var(--spacing-lg);
    max-width: var(--max-width);
    margin: 0 auto;
  }

  .logo {
    font: var(--font-title-md);
    color: var(--color-ink);
    text-decoration: none;
  }

  .cta {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-xs);
    padding: 8px 24px;
    background: var(--color-primary);
    color: var(--color-on-primary);
    font: var(--font-nav);
    border: none;
    border-radius: var(--rounded-pill);
    cursor: pointer;
    text-decoration: none;
    transition: opacity 0.15s;
  }

  .cta:hover { opacity: 0.9; }

  .icon {
    display: inline-flex;
    width: 18px;
    height: 18px;
  }

  .icon svg,
  .icon svg path {
    width: 18px;
    height: 18px;
    fill: currentColor;
  }

  @media (max-width: 767px) {
    .inner { padding: 0 var(--spacing-base); }
  }
`;
