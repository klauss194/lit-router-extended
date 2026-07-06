import { expect, fixture, html, chai } from "@open-wc/testing";
import chaiAsPromised from "chai-as-promised";

import appRouter from "./test-utils/app-router.js";

chai.use(chaiAsPromised);

suite("Lit Router - Match special paths & exact paths", () => {
  suiteSetup(() => {
    appRouter("my-app", [
      { name: "empty", path: "", render: () => html`<h1>empty</h1>` },
      { name: "space", path: " ", render: () => html`<h1>space</h1>` },
      { name: "slash", path: "/", render: () => html`<h1>slash</h1>` },
      { name: "index", path: "/index", exact: true, render: () => html`<h1>index</h1>` },
      { name: "exact", path: "/exact", exact: true, render: () => html`<h1>exact</h1>` },
    ]);
  });

  test("empty path normalizes to / and renders the first-defined empty route", async () => {
    const el = await fixture(html`<my-app></my-app>`);
    await el.updateComplete;

    await el.navigator.navigate("");
    await el.updateComplete;

    expect(el._router.pathname).to.equal("/");
    expect(el._router.currentRoute.name).to.equal("empty");
    expect(el.querySelector("h1").innerText).to.equal("empty");
  });

  test("space path normalizes to / and does not match the space route", async () => {
    const el = await fixture(html`<my-app></my-app>`);
    await el.updateComplete;

    await el.navigator.navigate(" ");
    await el.updateComplete;

    expect(el._router.pathname).to.equal("/");
    expect(el._router.currentRoute.name).to.not.equal("space");
    expect(el.querySelector("h1").innerText).to.not.equal("space");
  });

  test("slash path / resolves to the empty route, not the slash route", async () => {
    const el = await fixture(html`<my-app></my-app>`);
    await el.updateComplete;

    await el.navigator.navigate("/");
    await el.updateComplete;

    expect(el._router.pathname).to.equal("/");
    expect(el._router.currentRoute.name).to.not.equal("slash");
    expect(el.querySelector("h1").innerText).to.not.equal("slash");
  });

  test("/index path renders the index route", async () => {
    const el = await fixture(html`<my-app></my-app>`);
    await el.updateComplete;

    await el.navigator.navigate("/index");
    await el.updateComplete;

    expect(el._router.pathname).to.equal("/index");
    expect(el._router.currentRoute.name).to.equal("index");
    expect(el.querySelector("h1").innerText).to.equal("index");
  });

  test("/exact path renders the exact route", async () => {
    const el = await fixture(html`<my-app></my-app>`);
    await el.updateComplete;

    await el.navigator.navigate("/exact");
    await el.updateComplete;

    expect(el._router.pathname).to.equal("/exact");
    expect(el._router.currentRoute.name).to.equal("exact");
    expect(el.querySelector("h1").innerText).to.equal("exact");
  });

  test("navigating to an unmatched path throws RouteNotFoundError and clears the DOM", async () => {
    const el = await fixture(html`<my-app></my-app>`);
    await el.updateComplete;

    let caughtError = null;
    try {
      await el.navigator.navigate("/unknown");
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).to.not.be.null;
    expect(caughtError.name).to.equal("RouteNotFoundError");
    expect(caughtError.metadata.targetPath).to.equal("/unknown");

    await el.updateComplete;
    expect(el.querySelector("h1")).to.be.null;
  });
});
