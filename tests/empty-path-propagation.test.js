import { html, fixture, expect } from "@open-wc/testing";
import appRouter from "./test-utils/app-router.js";
import nestedRoutes from "./test-utils/nested-routes.js";
import { waitForElement } from "./test-utils/wait.js";

suite("Lit Router - Empty Path Propagation", () => {
  suiteSetup(() => {
    nestedRoutes("test-empty-child", [
      { name: "empty", path: "", render: () => html`<div id="empty-child-empty">Empty</div>` },
      { name: "space", path: " ", render: () => html`<div id="empty-child-space">Space</div>` },
      { name: "root", path: "/", render: () => html`<div id="empty-child-root">Root</div>` },
    ]);

    nestedRoutes("test-empty-parent", [
      { path: "/folder/*", render: () => html`<test-empty-child></test-empty-child>` },
    ]);

    appRouter("test-empty-app", [
      { path: "/base/*", render: () => html`<test-empty-parent></test-empty-parent>` },
      { path: "/", render: () => html`<div id="root"></div>` },
      { path: "/*", render: () => html`<div id="fallback"></div>` },
    ]);
  });

  test("empty child path resolves to the highest-precedence empty/root route", async () => {
    const el = await fixture(html`<test-empty-app></test-empty-app>`);
    await el.updateComplete;

    await el.navigator.navigate("/base/folder/");
    await el.updateComplete;
    await waitForElement(el, "test-empty-child");

    const child = el.querySelector("test-empty-parent").querySelector("test-empty-child");

    expect(child.querySelector("#empty-child-empty")).to.exist;
    expect(child.querySelector("#empty-child-space")).to.be.null;
    expect(child._routes.state.pathname).to.equal("/");
    expect(child._routes.currentRoute.name).to.equal("empty");
  });
});
