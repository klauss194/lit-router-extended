import { expect, fixture, html } from "@open-wc/testing";
import appRouter from "./test-utils/app-router.js";

suite("Lit Router - Happy Paths", () => {
  suiteSetup(() => {
    appRouter("my-app-nav", [
      { name: "home", path: "/", render: () => html`<h1>Home</h1>` },
      { name: "about", path: "/about", render: () => html`<h1>About</h1>` },
      { name: "section", path: "/section/:param", render: () => html`<h1>Section</h1>` },
      { name: "partition-path", path: "/partition/:path*", render: () => html`<h1>Partition Path</h1>` },
      { name: "catchall", path: "/:restOfUrl*", render: () => html`<h1>Catch all path</h1>` },
    ]);
  });

  test("navigates to / and renders Home", async () => {
    const el = await fixture(html`<my-app-nav></my-app-nav>`);
    await el.updateComplete;

    await el.navigator.navigate("/");
    await el.updateComplete;

    expect(el.querySelector("h1").innerText).to.equal("Home");
  });

  test("navigates to /about and renders the About view", async () => {
    const el = await fixture(html`<my-app-nav></my-app-nav>`);
    await el.updateComplete;

    await el.navigator.navigate("/about");
    await el.updateComplete;

    expect(el.querySelector("h1").innerText).to.equal("About");
  });

  test("navigates to /section/:param, renders Section and exposes the param", async () => {
    const el = await fixture(html`<my-app-nav></my-app-nav>`);
    await el.updateComplete;

    await el.navigator.navigate("/section/test-param");
    await el.updateComplete;

    expect(el.querySelector("h1").innerText).to.equal("Section");
    expect(el.navigator.params.param).to.equal("test-param");
  });

  test("navigates to /partition/:path*, renders the view and captures the tail as 'path' param", async () => {
    const el = await fixture(html`<my-app-nav></my-app-nav>`);
    await el.updateComplete;

    await el.navigator.navigate("/partition/rest/path");
    await el.updateComplete;

    expect(el._router.pathname).to.equal("/partition/rest/path");
    expect(el._router.currentRoute.name).to.equal("partition-path");
    expect(el.navigator.params).to.deep.equal({ path: "rest/path" });
    expect(el.querySelector("h1").innerText).to.equal("Partition Path");
  });

  test("navigates to /random-path and the named catch-all route handles it", async () => {
    const el = await fixture(html`<my-app-nav></my-app-nav>`);
    await el.updateComplete;

    await el.navigator.navigate("/random-path");
    await el.updateComplete;

    expect(el._router.pathname).to.equal("/random-path");
    expect(el._router.currentRoute.name).to.equal("catchall");
    expect(el.navigator.params).to.deep.equal({ restOfUrl: "random-path" });
    expect(el.querySelector("h1").innerText).to.equal("Catch all path");
  });

  test("navigates with extraParams without leaking them into the URL search", async () => {
    const el = await fixture(html`<my-app-nav></my-app-nav>`);

    await el.navigator.navigate("/section/secret", { secretData: 12345 });
    await el.updateComplete;

    expect(window.location.search).to.be.empty;
    expect(el._router.extraParams.secretData).to.equal(12345);
  });
});
