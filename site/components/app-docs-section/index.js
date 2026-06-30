import { LitElement, html, unsafeCSS } from "lit";
import { repeat } from "lit/directives/repeat.js";
import hljs from "highlight.js/lib/core";
import typescript from "highlight.js/lib/languages/typescript";
import hljsTheme from "highlight.js/styles/atom-one-dark.css?inline";
import { styles } from "./styles.js";
import { sidebarLinks, CODE_BASIC, CODE_ADVANCED } from "./data.js";

hljs.registerLanguage("typescript", typescript);

export class AppDocsSection extends LitElement {
  static styles = [styles, unsafeCSS(hljsTheme)];

  firstUpdated() {
    this.renderRoot.querySelectorAll("pre code").forEach((el) => {
      hljs.highlightElement(el);
    });
  }

  render() {
    return html`
      <div class="wrapper">
        <aside class="sidebar">
          <nav class="sidebar-nav">
            <h4>On this page</h4>
            <ul>
              ${repeat(sidebarLinks, (l) => l.href, (l) => html`
                <li><a href="${l.href}">${l.label}</a></li>
              `)}
            </ul>
          </nav>
        </aside>
        <div class="content">
          <div class="content-section" id="installation">
            <span class="badge">Quick Start</span>
            <h3>1. Installation</h3>
            <p class="body-text">
              Get started by installing the package via your preferred package
              manager.
            </p>
            <div class="terminal-inline">
              <span class="icon">terminal</span>
              <code>npm install lit-router</code>
            </div>
            <h3 id="basic-setup" style="scroll-margin-top: 80px;">2. Basic Setup</h3>
            <p class="body-text">
              Define your router instance within your root component.
            </p>
            <div class="code-block">
              <div class="code-header">
                <div class="dots">
                  <div class="dot"></div>
                  <div class="dot"></div>
                  <div class="dot"></div>
                </div>
                <span class="filename">app.ts</span>
              </div>
              <div class="code-body">
                <pre><code class="language-typescript">${CODE_BASIC}</code></pre>
              </div>
            </div>
          </div>
          <div class="content-section" id="route-matching" style="padding-bottom: var(--spacing-section); border-bottom: none;">
            <h2>Advanced Route Matching</h2>
            <p class="body-text-lg">
              Leverage powerful regex-based matching and custom guard
              functions to handle complex navigation flows. lit-router allows
              you to define dynamic segments and catch-all routes with ease,
              ensuring your application state remains predictable even in the
              most complex hierarchical structures.
            </p>
            <div class="code-block">
              <div class="code-header">
                <div class="dots">
                  <div class="dot"></div>
                  <div class="dot"></div>
                  <div class="dot"></div>
                </div>
                <span class="filename">advanced-routes.ts</span>
              </div>
              <div class="code-body">
                <pre><code class="language-typescript">${CODE_ADVANCED}</code></pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define("app-docs-section", AppDocsSection);
