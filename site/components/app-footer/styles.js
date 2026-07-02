import { css } from "lit";

export const styles = css`
  :host { display: block; }

  footer {
    background: var(--color-canvas-soft);
    padding: var(--spacing-section) var(--spacing-lg);
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
    font: var(--font-title-md);
    color: var(--color-ink);
  }

  .links { display: flex; align-items: center; gap: var(--spacing-lg); }

  .links a {
    font: var(--font-body-sm);
    color: var(--color-body);
    text-decoration: none;
    transition: color 0.15s;
  }

  .links a:hover {
    color: var(--color-text-link);
  }

  .copyright {
    font: var(--font-body-sm);
    color: var(--color-body);
  }

  @media (min-width: 768px) {
    .inner { flex-direction: row; justify-content: space-between; }
  }

  @media (max-width: 767px) {
    footer {
      padding-left: var(--spacing-base);
      padding-right: var(--spacing-base);
    }
  }
`;
