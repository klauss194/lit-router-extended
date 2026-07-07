import { css } from "lit";

export const styles = css`
  :host { display: block; }

  .wrapper {
    max-width: var(--max-width);
    margin: 0 auto;
    padding: 0 var(--spacing-base);
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

  .sidebar-group { margin-bottom: var(--spacing-lg); }

  .sidebar-group:last-child { margin-bottom: 0; }

  .sidebar h4 {
    font: var(--font-caption-uppercase);
    color: var(--color-body);
    text-transform: uppercase;
    letter-spacing: 0.88px;
    margin: 0 0 var(--spacing-xs);
  }

  .sidebar ul { list-style: none; padding: 0; margin: 0; }

  .sidebar li { margin-bottom: var(--spacing-xs); }

  .sidebar a {
    font: var(--font-nav);
    color: var(--color-body-strong);
    text-decoration: none;
    transition: color 0.15s;
  }

  .sidebar a:hover { color: var(--color-ink); }

  .content { flex: 1; min-width: 0; }

  @media (min-width: 768px) {
    .wrapper {
      padding: 0 var(--spacing-lg);
      flex-direction: row;
    }

    .sidebar { width: 256px; }
  }
`;
