import { css } from "lit";

export const styles = css`
  :host { display: block; }

  .wrapper {
    max-width: var(--max-width);
    margin: 0 auto;
    padding: 0 var(--spacing-margin-mobile);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xxl);
    position: relative;
  }

  .sidebar {
    width: 100%;
    flex-shrink: 0;
  }

  .sidebar-nav { position: sticky; top: 96px; }

  .sidebar h4 {
    font-size: 11px;
    font-weight: 600;
    line-height: 1.4;
    letter-spacing: 0.88px;
    color: var(--color-on-surface-variant);
    text-transform: uppercase;
    margin: 0 0 16px;
  }

  .sidebar ul { list-style: none; padding: 0; margin: 0; }

  .sidebar li { margin-bottom: 12px; }

  .sidebar a {
    font-size: 14px;
    font-weight: 500;
    line-height: 1.4;
    color: var(--color-on-surface-variant);
    text-decoration: none;
    transition: color 0.15s;
  }

  .sidebar a:hover { color: var(--color-ink); }

  .content { flex: 1; min-width: 0; }

  @media (min-width: 768px) {
    .wrapper {
      padding: 0 var(--spacing-gutter);
      flex-direction: row;
    }

    .sidebar { width: 256px; }
  }
`;
