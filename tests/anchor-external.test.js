import { expect, fixture, html } from "@open-wc/testing";
import appRouter from "./test-utils/app-router.js";

suite("Lit Router - Anchor External Links", () => {
  suiteSetup(() => {
    appRouter("anchor-ext-app", [
      { path: "/", render: () => html`<a id="ext" href="https://example.com">ext</a>` },
      { path: "/next", render: () => html`<div id="next"></div>` },
    ]);
  });

  test("external anchors are NOT intercepted by the router", async () => {
    const el = await fixture(html`<anchor-ext-app></anchor-ext-app>`);
    await el.updateComplete;

    let navigateCalls = 0;
    const originalNavigate = el._router.navigate.bind(el._router);
    el._router.navigate = async (...args) => {
      navigateCalls += 1;
      return originalNavigate(...args);
    };

    const anchor = el.querySelector("#ext");
    anchor.addEventListener("click", (e) => e.preventDefault());
    anchor.click();
    await el.updateComplete;

    expect(navigateCalls).to.equal(0);
  });
});
