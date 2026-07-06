import { expect, fixture, html } from "@open-wc/testing";
import appRouter from "./test-utils/app-router.js";
import { Route } from "../src/index.js";

suite("Lit Router - Route Cache Mutation", () => {
  suiteSetup(() => {
    appRouter("route-cache-app", [
      { name: "home", path: "/", render: () => html`<h1>home</h1>` },
      { name: "fallback", path: "/*", render: () => html`<h1>fallback</h1>` },
    ]);
  });

  test("routes added via the Set API are picked up by future navigations", async () => {
    const el = await fixture(html`<route-cache-app></route-cache-app>`);
    await el.updateComplete;

    await el.navigator.navigate("/new-route");
    await el.updateComplete;
    expect(el.querySelector("h1").innerText).to.equal("fallback");

    el._router.routes.add(
      new Route({ name: "new", path: "/new-route", render: () => html`<h1>new</h1>` }),
    );

    await el.navigator.navigate("/");
    await el.updateComplete;
    await el.navigator.navigate("/new-route");
    await el.updateComplete;
    expect(el.querySelector("h1").innerText).to.equal("new");
  });

  test("mutating the routes Set without using the Set API does not affect routing", async () => {
    const el = await fixture(html`<route-cache-app></route-cache-app>`);
    await el.updateComplete;

    await el.navigator.navigate("/other-route");
    await el.updateComplete;
    expect(el.querySelector("h1").innerText).to.equal("fallback");

    el._router.routes.routes = undefined;

    await el.navigator.navigate("/other-route");
    await el.updateComplete;
    expect(el.querySelector("h1").innerText).to.equal("fallback");
  });
});
