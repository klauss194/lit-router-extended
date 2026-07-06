import { expect, fixture, html } from "@open-wc/testing";
import appRouter from "./test-utils/app-router.js";
import { Route } from "../src/index.js";

suite("Lit Router - Dynamic Routes", () => {
  suiteSetup(() => {
    appRouter("dynamic-route-app", [
      { name: "home", path: "/home", render: () => html`<h1>Home</h1>` },
      { name: "about", path: "/about", render: () => html`<h1>About</h1>` },
      { name: "fallback", path: "/*", render: () => html`<h1>Fallback</h1>` },
      { name: "root", path: "/", render: () => html`<h1>Root</h1>` },
    ]);
  });

  test("adds a new route dynamically via the Set API and navigates to it", async () => {
    const el = await fixture(html`<dynamic-route-app></dynamic-route-app>`);
    await el.updateComplete;

    await el.navigator.navigate("/home");
    await el.updateComplete;
    expect(el.querySelector("h1").innerText).to.equal("Home");

    await el.navigator.navigate("/new-feature");
    await el.updateComplete;
    expect(el.querySelector("h1").innerText).to.equal("Fallback");

    el._router.routes.add(
      new Route({ name: "new", path: "/new-feature", render: () => html`<h1>New Feature</h1>` }),
    );

    await el.navigator.navigate("/");
    await el.updateComplete;
    await el.navigator.navigate("/new-feature");
    await el.updateComplete;
    expect(el.querySelector("h1").innerText).to.equal("New Feature");
    expect(el._router.currentRoute.name).to.equal("new");
  });

  test("two routes with the same path can coexist in the Set but the first match wins", async () => {
    const el = await fixture(html`<dynamic-route-app></dynamic-route-app>`);
    await el.updateComplete;

    el._router.routes.add(
      new Route({ path: "/home", render: () => html`<h1>Duplicate</h1>` }),
    );

    await el.navigator.navigate("/home");
    await el.updateComplete;
    expect(el.querySelector("h1").innerText).to.equal("Home");
  });

  test("replaces routes by clearing and re-adding", async () => {
    const el = await fixture(html`<dynamic-route-app></dynamic-route-app>`);
    await el.updateComplete;

    await el.navigator.navigate("/about");
    await el.updateComplete;
    expect(el.querySelector("h1").innerText).to.equal("About");

    el._router.routes.clear();
    el._router.routes.add(new Route({ name: "home", path: "/home", render: () => html`<h1>Home</h1>` }));
    el._router.routes.add(new Route({ name: "about-v2", path: "/about", render: () => html`<h1>About V2</h1>` }));
    el._router.routes.add(new Route({ name: "fallback", path: "/*", render: () => html`<h1>Fallback</h1>` }));

    await el.navigator.navigate("/home");
    await el.updateComplete;
    await el.navigator.navigate("/about");
    await el.updateComplete;
    expect(el.querySelector("h1").innerText).to.equal("About V2");
    expect(el._router.currentRoute.name).to.equal("about-v2");
  });
});
