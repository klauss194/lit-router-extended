import { css } from "lit";

export const styles = css`
  :host { display: block; }

  .hero {
    position: relative;
    padding: var(--spacing-section) var(--spacing-base) 96px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    background: radial-gradient(
      circle at top center,
      rgba(168, 200, 232, 0.4) 0%,
      rgba(255, 255, 255, 0) 70%
    );
  }

  .content { max-width: 768px; }

  h1 {
    font-family: var(--font-family-sans);
    font-size: 32px;
    font-weight: 600;
    line-height: 1.1;
    letter-spacing: -1px;
    color: var(--color-ink);
    margin: 0 0 var(--spacing-xl);
  }

  .subtitle {
    font: var(--font-body-md);
    color: var(--color-body);
    max-width: 672px;
    margin: 0 auto var(--spacing-xl);
  }

  .actions {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-base);
    padding-top: var(--spacing-base);
  }

  .cta {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 12px var(--spacing-xl);
    background: var(--color-primary);
    color: var(--color-on-primary);
    font: var(--font-button);
    border: none;
    border-radius: var(--rounded-pill);
    cursor: pointer;
    text-decoration: none;
    white-space: nowrap;
    transition: opacity 0.15s;
  }

  .cta:hover { opacity: 0.9; }

  @media (min-width: 768px) {
    .hero {
      padding-left: var(--spacing-lg);
      padding-right: var(--spacing-lg);
    }

    h1 {
      font: var(--font-display-mega);
      letter-spacing: -1.92px;
    }

    .actions {
      flex-direction: row;
      justify-content: center;
    }
  }
`;
