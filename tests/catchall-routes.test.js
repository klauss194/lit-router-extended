import { expect, fixture, html } from "@open-wc/testing";
import appRouter from "./test-utils/app-router.js";

suite('Lit Router - Match "catch-all" routes', () => {
  suiteSetup(() => {
    appRouter("my-app-named", [
      { name: "home", path: "/", render: () => html`<h1>home</h1>` },
      { name: "named-rest", path: "/:rest*", render: () => html`<h1>named-rest</h1>` },
      { name: "route2", path: "/*", render: () => html`<h1>rout2</h1>` },
      { name: "route3", path: "*", render: () => html`<h1>route3</h1>` },
    ]);

    appRouter("my-app-nonnamed", [
      { name: "home", path: "/", render: () => html`<h1>home</h1>` },
      { name: "first-catchall", path: "/*", render: () => html`<h1>first-catchall</h1>` },
      { name: "route3", path: "*", render: () => html`<h1>route3</h1>` },
      { name: "route1", path: "/:rest*", render: () => html`<h1>route1</h1>` },
    ]);
  });

  test("named catch-all :rest* captures /unknown with rest=unknown param", async () => {
    const el = await fixture(html`<my-app-named></my-app-named>`);
    await el.updateComplete;
    await el.navigator.navigate("/");
    await el.updateComplete;

    await el.navigator.navigate("/unknown");
    await el.updateComplete;

    expect(el._router.currentRoute.name).to.equal("named-rest");
    expect(el.navigator.params).to.deep.equal({ rest: "unknown" });
    expect(el.querySelector("h1").innerText).to.equal("named-rest");
  });

  test("unanamed /* catches /unknown as the first-defined catch-all route", async () => {
    const el = await fixture(html`<my-app-nonnamed></my-app-nonnamed>`);
    await el.updateComplete;
    await el.navigator.navigate("/");
    await el.updateComplete;

    await el.navigator.navigate("/unknown");
    await el.updateComplete;

    expect(el._router.currentRoute.name).to.equal("first-catchall");
    expect(el.querySelector("h1").innerText).to.equal("first-catchall");
  });
});
