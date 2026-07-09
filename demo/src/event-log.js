import { LitElement, html, css } from "lit";

export class EventLog extends LitElement {
  static properties = {
    entries: { type: Array },
  };

  static styles = css`
    :host {
      display: block;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      max-height: 34vh;
      background: #0a0b0f;
      border-top: 1px solid #2a2f3a;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.78rem;
      overflow-y: auto;
      z-index: 50;
    }
    header {
      position: sticky;
      top: 0;
      background: #12141a;
      padding: 0.35rem 1rem;
      color: #9fb3c8;
      border-bottom: 1px solid #2a2f3a;
    }
    ol {
      list-style: none;
      margin: 0;
      padding: 0.4rem 1rem;
    }
    li {
      padding: 0.15rem 0;
      color: #8fd694;
      white-space: pre-wrap;
      word-break: break-word;
    }
    li.window-event {
      color: #e0b35c;
    }
    li .ts {
      color: #5a6272;
      margin-right: 0.5rem;
    }
  `;

  constructor() {
    super();
    this.entries = [];
  }

  render() {
    return html`
      <header>event log · router.subscribe() + window events (newest first)</header>
      <ol>
        ${this.entries
          .slice()
          .reverse()
          .map(
            (e) => html`
              <li class=${e.kind === "window-event" ? "window-event" : ""}>
                <span class="ts">${e.ts}</span>${e.text}
              </li>
            `,
          )}
      </ol>
    `;
  }
}

customElements.define("event-log", EventLog);
