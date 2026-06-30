import { css } from "lit";

export const styles = css`
  :host { display: block; }

  .hero {
    position: relative;
    padding: var(--spacing-section) var(--spacing-margin-mobile) 96px;
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
    font-family: "Inter", sans-serif;
    font-size: 32px;
    font-weight: 600;
    line-height: 1.1;
    letter-spacing: -1px;
    color: var(--color-ink);
    margin: 0 0 32px;
  }

  .subtitle {
    font-size: 16px;
    font-weight: 400;
    line-height: 1.5;
    color: var(--color-on-surface-variant);
    max-width: 672px;
    margin: 0 auto 32px;
  }

  .actions {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding-top: 16px;
  }

  .cta {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 12px 32px;
    background: var(--color-primary);
    color: var(--color-on-primary);
    font-size: 14px;
    font-weight: 500;
    line-height: 1.4;
    border: none;
    border-radius: var(--rounded-full);
    cursor: pointer;
    text-decoration: none;
    white-space: nowrap;
    transition: opacity 0.15s;
  }

  .cta:hover { opacity: 0.9; }

  @media (min-width: 768px) {
    .hero {
      padding-left: var(--spacing-gutter);
      padding-right: var(--spacing-gutter);
    }

    h1 {
      font-size: 64px;
      line-height: 1.05;
      letter-spacing: -1.92px;
    }

    .actions {
      flex-direction: row;
      justify-content: center;
    }
  }
`;
