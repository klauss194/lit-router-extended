import { expect, fixture, html } from "@open-wc/testing";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import appRouter from "./test-utils/app-router.js";
import nestedRoutes from "./test-utils/nested-routes.js";
import { waitForUrl, waitForElement } from "./test-utils/wait.js";

import { InvalidNavigationError } from "../src/index.js";

chai.use(chaiAsPromised);

suite("Lit Router - Navigation Controller", () => {
  suiteSetup(() => {
    nestedRoutes("nav-child", [
      { path: "/", render: () => html`<div id="child-root"></div>` },
      { path: "settings", render: () => html`<div id="child-settings"></div>` },
    ]);

    nestedRoutes("nav-parent", [
      { path: "/", render: () => html`<nav-child></nav-child>` },
    ]);

    appRouter("nav-app", [
      { path: "/app/*", render: () => html`<nav-parent></nav-parent>` },
      { path: "/simple", render: () => html`<div id="simple"></div>` },
      { path: "/", render: () => html`<div id="root"></div>` },
      { path: "/*", render: () => html`<div id="fallback"></div>` },
    ]);

    appRouter("nav-app-nochild", [
      { path: "/home", render: () => html`<div id="home"></div>` },
      { path: "/", render: () => html`<div id="root"></div>` },
      { path: "/*", render: () => html`<div id="fallback"></div>` },
    ]);

    appRouter("nav-app-nowild", [
      { path: "/app", render: () => html`<nav-parent></nav-parent>` },
      { path: "/", render: () => html`<div id="root"></div>` },
      { path: "/*", render: () => html`<div id="fallback"></div>` },
    ]);
  });

  test("push throws when no child routes exist", async () => {
    const el = await fixture(html`<nav-app-nochild></nav-app-nochild>`);
    await el.updateComplete;

    await el.navigator.navigate("/home");
    await el.updateComplete;

    const err = await el.navigator.push("./settings").catch((e) => e);
    expect(err).to.be.instanceOf(InvalidNavigationError);
    expect(err.message).to.equal("This Route has no child routes to push to");
  });

  test("push throws when current route is not a wildcard", async () => {
    const el = await fixture(html`<nav-app-nowild></nav-app-nowild>`);
    await el.updateComplete;

    await el.navigator.navigate("/app");
    await waitForUrl("/app");

    const parent = el.querySelector("nav-parent");
    expect(parent).to.exist;

    let error;
    try {
      await parent.navigator.push("./settings");
    } catch (err) {
      error = err;
    }

    expect(error).to.be.instanceOf(InvalidNavigationError);
    expect(error.metadata.reason).to.equal("Current route mapping does not end in a wildcard (*)");
  });

  test("link throws when child routes exist and pathname is absolute", async () => {
    const el = await fixture(html`<nav-app></nav-app>`);
    await el.updateComplete;

    await el.navigator.navigate("/app/");
    await waitForElement(el, "nav-parent");

    const parent = el.querySelector("nav-parent");
    expect(parent).to.exist;
    expect(() => parent.navigator.link("/absolute")).to.throw(InvalidNavigationError);
  });

  test("hasFocus returns false on nav-parent because its route has children but no wildcard (hasTail=false)", async () => {
    const el = await fixture(html`<nav-app></nav-app>`);
    await el.updateComplete;

    await el.navigator.navigate("/app/");
    await waitForElement(el, "nav-parent");

    const parent = el.querySelector("nav-parent");
    expect(parent).to.exist;
    expect(parent.navigator.hasFocus()).to.equal(false);
  });

  test("hasFocus returns true on the root Router because no children and no tail (!hasChildren)", async () => {
    const el = await fixture(html`<nav-app></nav-app>`);
    await el.updateComplete;

    await el.navigator.navigate("/");
    await el.updateComplete;

    expect(el.navigator.hasFocus()).to.equal(true);
  });
});
