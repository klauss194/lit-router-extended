import { css } from "lit";

export const styles = css`
  :host { 
      display: block;
  }

  .content-section {
    padding-top: var(--spacing-section);
    border-bottom: 1px solid var(--color-hairline-strong);
  }

  .content-section:last-child { border-bottom: none; }
`;
