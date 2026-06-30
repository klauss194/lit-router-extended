export const sidebarLinks = [
  { href: "#installation", label: "Installation" },
  { href: "#advanced-route-matching", label: "Advanced Route Matching" },
];

export const CODE_BASIC = [
  "import { LitElement, html } from 'lit';",
  "import { customElement } from 'lit/decorators.js';",
  "import { Router } from 'lit-router';",
  "",
  "@customElement('my-app')",
  "export class MyApp extends LitElement {",
  "  private router = new Router(this, [",
  "    { path: '/', render: () => html`<home-page></home-page>` },",
  "    { path: '/users/:id', render: ({ id }) => html`<user-profile id=\"${id}\"></user-profile>` },",
  "  ]);",
  "",
  "  render() {",
  "    return html`",
  "      <header>",
  "        <nav>",
  '          <a href="/">Home</a>',
  '          <a href="/users/123">Profile</a>',
  "        </nav>",
  "      </header>",
  "      <main>",
  "        ${this.router.outlet()}",
  "      </main>",
  "    `;",
  "  }",
  "}"
].join("\n");

export const CODE_ADVANCED = [
  "const routes = [",
  "  {",
  "    path: '/admin/(.*)',",
  "    guard: () => isAdmin(),",
  "    render: () => html`<admin-panel></admin-panel>`,",
  "    children: [",
  "      { path: 'settings', render: () => html`<admin-settings></admin-settings>` }",
  "    ]",
  "  },",
  "  { path: '*', render: () => html`<not-found></not-found>` }",
  "];"
].join("\n");
