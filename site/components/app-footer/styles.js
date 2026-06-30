import { css } from "lit";

export const styles = css`
  :host { display: block; }

  footer {
    background: var(--color-canvas-soft);
    padding: var(--spacing-section) var(--spacing-gutter);
    margin-top: var(--spacing-section);
    border-top: 1px solid var(--color-hairline-strong);
  }

  .inner {
    max-width: var(--max-width);
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-base);
  }

  .brand {
    font-size: 18px;
    font-weight: 600;
    line-height: 1.4;
    color: var(--color-ink);
  }

  .links { display: flex; align-items: center; gap: 24px; }

  .links a {
    font-size: 14px;
    font-weight: 400;
    line-height: 1.5;
    color: var(--color-on-surface-variant);
    text-decoration: none;
    transition: color 0.15s;
  }

  .links a:hover { color: var(--color-secondary); }

  .copyright {
    font-size: 14px;
    font-weight: 400;
    line-height: 1.5;
    color: var(--color-on-surface-variant);
  }

  @media (min-width: 768px) {
    .inner { flex-direction: row; justify-content: space-between; }
  }

  @media (max-width: 767px) {
    footer {
      padding-left: var(--spacing-margin-mobile);
      padding-right: var(--spacing-margin-mobile);
    }
  }
`;
