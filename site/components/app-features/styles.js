import { css } from "lit";

export const styles = css`
  :host { display: block; }

  .section {
    padding: var(--spacing-section) var(--spacing-base);
    max-width: var(--max-width);
    margin: 0 auto;
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--spacing-lg);
  }

  .card {
    background: var(--color-surface-card);
    border: 1px solid var(--color-hairline-strong);
    border-radius: var(--rounded-xl);
    padding: var(--spacing-lg);
    transition: box-shadow 0.3s;
  }

  .card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
  }

  .card-icon {
    width: 48px;
    height: 48px;
    background: var(--color-surface-strong);
    border-radius: var(--rounded-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--spacing-lg);
    font-family: "Material Symbols Outlined";
    font-size: 24px;
    color: var(--color-ink);
    font-variation-settings: "FILL" 0, "wght" 400;
  }

  .card h3 {
    font: var(--font-title-md);
    color: var(--color-ink);
    margin: 0 0 var(--spacing-sm);
  }

  .card p {
    font: var(--font-body-md);
    color: var(--color-body);
    margin: 0;
  }

  @media (min-width: 768px) {
    .section {
      padding-left: var(--spacing-lg);
      padding-right: var(--spacing-lg);
    }

    .grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }
`;
