import { LitElement, html, css } from "lit";
import { Router } from "lit-router-extended";

import "./demo-nav.js";
import "./event-log.js";
import "./pages/home-page.js";
import "./pages/about-page.js";
import "./pages/users-list-page.js";
import "./pages/user-detail-page.js";
import "./pages/search-page.js";
import "./pages/protected-page.js";
import "./pages/protected-denied-page.js";
import "./pages/reports-page.js";
import "./pages/editor-page.js";
import "./pages/not-found-page.js";
import "./admin/admin-layout.js";

const log = (entries, text, kind = "router") => {
  const ts = new Date().toLocaleTimeString([], { hour12: false });
  return [...entries.slice(-199), { ts, text, kind }];
};

export class DemoApp extends LitElement {
  static styles = css`
    :host {
      display: block;
      min-height: 100vh;
      padding-bottom: 34vh;
    }
    main {
      max-width: 760px;
      margin: 0 auto;
      padding: 1.5rem;
    }
  `;

  static properties = {
    _logEntries: { state: true },
  };

  constructor() {
    super();
    this._logEntries = [];

    this._router = new Router(this, [
      {
        name: "home",
        path: "/",
        render: () => html`<home-page></home-page>`,
      },
      {
        name: "about",
        path: "/about",
        enter: () => {
          this._appendLog("enter() /about — sync, no return value (allow)");
        },
        render: () => html`<about-page></about-page>`,
      },
      {
        name: "users-list",
        path: "/users",
        enter: async ({ signal }) => {
          this._appendLog("enter() /users — async fetch starting");
          try {
            await fakeFetch("users", signal);
          } catch (err) {
            if (isAbort(err)) return;
            throw err;
          }
          this._appendLog("enter() /users — async fetch resolved");
        },
        render: () => html`<users-list-page></users-list-page>`,
      },
      {
        name: "user-detail",
        path: "/users/:id",
        enter: async ({ params, signal }) => {
          try {
            this._user = await fakeFetch(`user:${params.id}`, signal);
          } catch (err) {
            if (isAbort(err)) return;
            throw err;
          }
        },
        render: ({ params }) =>
          html`<user-detail-page .params=${params} .user=${this._user}></user-detail-page>`,
      },
      {
        name: "search",
        path: "/search/:query?",
        render: (ctx) => html`<search-page .ctx=${ctx}></search-page>`,
      },
      {
        name: "protected",
        path: "/protected/:id",
        enter: async ({ params, signal }) => {
          this._appendLog(`enter() /protected/${params.id} — checking auth (async)`);
          let allowed;
          try {
            allowed = await fakeCheckAuth(params.id, signal);
          } catch (err) {
            if (isAbort(err)) return;
            throw err;
          }
          if (!allowed) {
            this._appendLog("enter() /protected — DENIED, returning false");
            await this._router.goto(`/protected-denied/${params.id}`);
            return false;
          }
          this._appendLog("enter() /protected — ALLOWED");
        },
        render: ({ params }) => html`<protected-page .params=${params}></protected-page>`,
      },
      {
        name: "protected-denied",
        path: "/protected-denied/:id",
        render: ({ params }) => html`<protected-denied-page .params=${params}></protected-denied-page>`,
      },
      {
        name: "reports",
        path: "/reports/:id",
        enter: async ({ params, signal }) => {
          this._appendLog(`enter() /reports/${params.id} — fetch starting (abortable)`);
          try {
            this._report = await fakeFetch(`report:${params.id}`, signal, 1500);
            this._appendLog(`enter() /reports/${params.id} — fetch resolved`);
          } catch (err) {
            if (isAbort(err)) {
              this._appendLog(`enter() /reports/${params.id} — ABORTED (superseded)`);
              return;
            }
            throw err;
          }
        },
        render: ({ params }) =>
          html`<reports-page .params=${params} .report=${this._report}></reports-page>`,
      },
      {
        name: "editor",
        path: "/editor/:id",
        leave: () => {
          if (this._editorDirty) {
            const ok = confirm("You have unsaved changes in the editor. Leave anyway?");
            this._appendLog(`leave() /editor — confirm() returned ${ok}`);
            return ok;
          }
          this._appendLog("leave() /editor — no unsaved changes, allow");
        },
        render: ({ params }) => html`<editor-page .params=${params}></editor-page>`,
      },
      {
        name: "admin",
        path: "/admin/*",
        render: () => html`<admin-layout></admin-layout>`,
      },
      {
        name: "not-found",
        path: "*",
        render: ({ pathname }) => html`<not-found-page .pathname=${pathname}></not-found-page>`,
      },
    ]);

    this._router.subscribe(({ eventName, prev, next }) => {
      this._appendLog(
        `subscribe(): ${eventName} — ${prev ? prev.pathname : "∅"} → ${next.pathname}`,
      );
    });
  }

  connectedCallback() {
    super.connectedCallback();
    this._onChanging = (e) => {
      this._appendLog(
        `window "lit-router-location-changing": ${e.detail.currentPathname} → ${e.detail.pathname}`,
        "window-event",
      );
    };
    this._onChanged = (e) => {
      this._appendLog(`window "lit-router-location-changed": now at ${e.detail.pathname}`, "window-event");
    };
    window.addEventListener("lit-router-location-changing", this._onChanging);
    window.addEventListener("lit-router-location-changed", this._onChanged);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("lit-router-location-changing", this._onChanging);
    window.removeEventListener("lit-router-location-changed", this._onChanged);
  }

  _appendLog(text, kind = "router") {
    this._logEntries = log(this._logEntries, text, kind);
  }

  render() {
    return html`
      <demo-nav></demo-nav>
      <main
        @lit-router-error=${(e) => this._appendLog(`lit-router-error: ${e.detail.error.message}`)}
        @editor-dirty-changed=${(e) => {
          this._editorDirty = e.detail.dirty;
        }}
      >
        ${this._router.outlet()}
      </main>
      <event-log .entries=${this._logEntries}></event-log>
    `;
  }
}

customElements.define("demo-app", DemoApp);

function isAbort(err) {
  return err?.name === "AbortError";
}

function fakeFetch(label, signal, delay = 600) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"));
    const timer = setTimeout(() => resolve({ label, fetchedAt: Date.now() }), delay);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

function fakeCheckAuth(id, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"));
    const timer = setTimeout(() => resolve(Number(id) % 2 === 0), 500);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}
