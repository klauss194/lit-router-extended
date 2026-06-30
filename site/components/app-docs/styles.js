import { css } from "lit";

export const styles = css`
  .badge {
    display: inline-block;
    font-size: 11px;
    font-weight: 600;
    line-height: 1.4;
    letter-spacing: 0.88px;
    color: var(--color-on-surface-variant);
    text-transform: uppercase;
    background: var(--color-surface-strong);
    padding: 4px 12px;
    border-radius: var(--rounded-full);
    margin-bottom: 32px;
  }

  h3 {
    font-size: 18px;
    font-weight: 600;
    line-height: 1.4;
    color: var(--color-ink);
    margin: 0 0 12px;
  }

  .body-text {
    font-size: 16px;
    font-weight: 400;
    line-height: 1.5;
    color: var(--color-on-surface-variant);
    margin: 0 0 16px;
  }

  .terminal-inline {
    display: flex;
    align-items: center;
    gap: 12px;
    background: var(--color-surface-strong);
    border: 1px solid var(--color-hairline-strong);
    border-radius: var(--rounded-lg);
    padding: 12px 16px;
    max-width: max-content;
    margin-bottom: 32px;
  }

  .terminal-inline .icon {
    font-size: 18px;
    color: var(--color-on-surface-variant);
    font-family: "Material Symbols Outlined";
    font-variation-settings: "FILL" 0, "wght" 400;
  }

  .terminal-inline code {
    font-family: "JetBrains Mono", monospace;
    font-size: 13px;
    font-weight: 400;
    line-height: 1.5;
    color: var(--color-ink);
  }

  .code-block {
    background: #282c34;
    border-radius: var(--rounded-xl);
    overflow: hidden;
    border: 1px solid rgba(94, 94, 94, 0.2);
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  }

  .code-header {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(94, 94, 94, 0.2);
    background: rgba(23, 23, 23, 0.5);
  }

  .dots { display: flex; gap: 8px; }

  .dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: rgba(94, 94, 94, 0.5);
  }

  .filename {
    margin-left: 16px;
    font-family: "JetBrains Mono", monospace;
    font-size: 13px;
    font-weight: 400;
    line-height: 1.5;
    color: var(--color-surface-tint);
  }

  .code-body {
    padding: var(--spacing-md);
    overflow-x: auto;
  }

  .code-body pre {
    margin: 0;
    font-size: 13px;
    line-height: 1.625;
  }

  .code-body code {
    font-family: "JetBrains Mono", monospace;
  }

  h2 {
    font-size: 36px;
    font-weight: 600;
    line-height: 1.15;
    letter-spacing: -1.08px;
    color: var(--color-ink);
    margin: 0 0 24px;
  }

  .body-text-lg {
    font-size: 16px;
    font-weight: 400;
    line-height: 1.5;
    color: var(--color-on-surface-variant);
    margin: 0 0 32px;
  }
`;
