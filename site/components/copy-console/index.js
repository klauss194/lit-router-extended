import { LitElement, html, css } from "lit";

export class CopyConsole extends LitElement {
    static styles = css`
    :host {
        display: flex;
        align-items: center;
        width: fit-content;
        gap: 12px;
        background: var(--color-surface-strong);
        border: 1px solid var(--color-hairline-strong);
        border-radius: var(--rounded-lg);
        padding: 12px 16px;
        margin-block: 8px;
    }

    .icon {
        font-size: 18px;
        color: var(--color-on-surface-variant);
        font-family: "Material Symbols Outlined";
        font-variation-settings: "FILL" 0, "wght" 400;
    }

    code {
        font: var(--font-code);
        color: var(--color-ink);
    }

    .copy {
        background: none;
        border: none;
        color: var(--color-on-surface-variant);
        cursor: pointer;
        font-family: "Material Symbols Outlined";
        font-size: 16px;
        font-variation-settings: "FILL" 0, "wght" 400;
        padding: 0;
        transition: color 0.15s;
    }

    .copy:hover { color: var(--color-ink); }
  `;

    static properties = {
        content: { type: String },
    };

    onCopyToClipboard() {
        navigator.clipboard.writeText(this.content).then(() => {
            const button = this.shadowRoot.querySelector(".copy");
            button.textContent = "check";
            setTimeout(() => {
                button.textContent = "content_copy";
            }, 2000);
        });
    }

    render() {
        return html`
        <span class="icon">terminal</span>
        <code>${this.content}</code>
        <button class="copy" aria-label="Copy command" @click=${this.onCopyToClipboard}>content_copy</button>
        `;
    }
}

customElements.define("copy-console", CopyConsole);
