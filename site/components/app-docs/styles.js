import { css } from "lit";

export const styles = css`
    h2 {
        font-size: 25px;
        font-weight: 600;
        line-height: 1.2;
        letter-spacing: -1px;
        color: var(--color-ink);
        margin: 0 0 24px;
    }

    h3 {
        font-size: 18px;
        font-weight: 600;
        line-height: 1.4;
        color: var(--color-ink);
        margin: 32px 0 12px;
    }

    h3:first-child {
        margin-top: 0;
    }

    p {
        font-size: 16px;
        font-weight: 400;
        line-height: 1.5;
        color: var(--color-on-surface-variant);
        margin: 0 0 16px;
    }

    a {
        color: var(--color-secondary);
        text-decoration: none;
    }

    a:hover {
        text-decoration: underline;
    }

    ul, ol {
        font-size: 16px;
        font-weight: 400;
        line-height: 1.5;
        color: var(--color-on-surface-variant);
        margin: 0 0 16px;
        padding-left: 24px;
    }

    li {
        margin-bottom: 4px;
    }

    blockquote {
        margin: 0 0 16px;
        padding: 12px 16px;
        border-left: 3px solid var(--color-hairline-strong);
        color: var(--color-on-surface-variant);
        font-size: 16px;
        font-weight: 400;
        line-height: 1.5;
    }

    pre {
        background: #282c34;
        border-radius: var(--rounded-xl);
        border: 1px solid rgba(94, 94, 94, 0.2);
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        padding: var(--spacing-md);
        margin: 0 0 24px;
        overflow-x: auto;
        font-size: 13px;
        line-height: 1.625;
    }

    pre code {
        font-family: "JetBrains Mono", monospace;
    }

    code {
        font-family: "JetBrains Mono", monospace;
        font-size: 13px;
        font-weight: 400;
        background: var(--color-surface-strong);
        padding: 2px 6px;
        border-radius: var(--rounded-xs);
        color: var(--color-ink);
    }

    pre code {
        background: none;
        padding: 0;
        border-radius: 0;
        color: inherit;
    }

    pre.mermaid {
        background: var(--color-surface-container-lowest);
        border: 1px solid var(--color-hairline-strong);
        border-radius: var(--rounded-lg);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
        padding: var(--spacing-lg);
        overflow-x: auto;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    pre.mermaid svg {
        max-width: 100%;
        height: auto;
    }
  table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
    border: 1px solid var(--color-hairline-strong);
    border-radius: var(--rounded-xl);
    overflow: hidden;
    margin: 0 0 24px;
  }

  thead tr {
    background: var(--color-surface-strong);
    border-bottom: 1px solid var(--color-hairline-strong);
  }

  th {
    padding: var(--spacing-base);
    font-family: "Inter", sans-serif;
    font-size: 16px;
    font-weight: 600;
    line-height: 1.4;
    color: var(--color-ink);
  }

  tbody tr {
    border-bottom: 1px solid var(--color-hairline-strong);
    transition: background-color 0.15s;
  }

  tbody tr:last-child {
    border-bottom: none;
  }

  tbody tr:hover {
    background: var(--color-canvas-soft);
  }

  td {
    padding: var(--spacing-base);
    font-family: "Inter", sans-serif;
    font-size: 14px;
    font-weight: 400;
    line-height: 1.5;
    color: var(--color-on-surface-variant);
  }

  td:first-child {
    font-weight: 600;
    color: var(--color-ink);
  }

  td code {
    white-space: nowrap;
  }
`;
