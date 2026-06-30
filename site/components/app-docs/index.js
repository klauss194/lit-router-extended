import { LitElement, html, unsafeCSS } from "lit";
import { styles } from "./styles.js";
import { sidebarLinks, CODE_BASIC, CODE_ADVANCED } from "./data.js";
import hljsTheme from "highlight.js/styles/atom-one-dark.css?inline";

import "./app-docs-layout/index.js";
import "./app-docs-section/index.js";

export class AppDocs extends LitElement {
  static styles = [styles, unsafeCSS(hljsTheme)];

  render() {
    return html`
      <app-docs-layout id="get-started" .menuOptions=${sidebarLinks}>
        <app-docs-section id="installation">
          <span class="badge">Quick Start</span>
          <h3>1. Installation</h3>
          <p class="body-text">
            Get started by installing the package via your preferred package
            manager.
          </p>
          <copy-console content="npm install lit-router"></copy-console>
          <h3 style="scroll-margin-top: 80px;">Basic Setup</h3>
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
        </app-docs-section>
        <app-docs-section id="advanced-route-matching">
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
        </app-docs-section>
      </app-docs-layout>
    `;
  }
}

customElements.define("app-docs", AppDocs);
