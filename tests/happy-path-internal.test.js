import { expect, fixture, html } from "@open-wc/testing";
import appRouter from "./test-utils/app-router.js";

suite("Lit Router - Happy Paths (Internal Router API)", () => {
  suiteSetup(() => {
    appRouter("my-app", [
      { name: "home", path: "/", render: () => html`<h1>Home</h1>` },
      { name: "about", path: "/about", render: () => html`<h1>About</h1>` },
      { name: "section", path: "/section/:param", render: () => html`<h1>Section</h1>` },
      { name: "partition-path", path: "/partition/:path*", render: () => html`<h1>Partition Path</h1>` },
      { name: "catchall", path: "/:restOfUrl*", render: () => html`<h1>Catch all path</h1>` },
    ]);
  });

  test("goto / renders Home through internal router API", async () => {
    const el = await fixture(html`<my-app></my-app>`);
    await el.updateComplete;

    await el._router.goto("/");
    await el.updateComplete;

    expect(el.querySelector("h1").innerText).to.equal("Home");
  });

  test("goto /about renders About through internal router API", async () => {
    const el = await fixture(html`<my-app></my-app>`);
    await el.updateComplete;

    await el._router.goto("/about");
    await el.updateComplete;

    expect(el.querySelector("h1").innerText).to.equal("About");
  });

  test("goto /section/:param renders Section and exposes params", async () => {
    const el = await fixture(html`<my-app></my-app>`);
    await el.updateComplete;

    await el._router.goto("/section/test-param");
    await el.updateComplete;

    expect(el.querySelector("h1").innerText).to.equal("Section");
    expect(el._router.params.param).to.equal("test-param");
  });

  test("goto /partition/:path* renders Partition Path and captures tail param", async () => {
    const el = await fixture(html`<my-app></my-app>`);
    await el.updateComplete;

    await el._router.goto("/partition/rest/path");
    await el.updateComplete;

    expect(el.querySelector("h1").innerText).to.equal("Partition Path");
    expect(el._router.params).to.have.property("path");
  });

  test("goto /random-path triggers the named catch-all route", async () => {
    const el = await fixture(html`<my-app></my-app>`);
    await el.updateComplete;

    await el._router.goto("/random-path");
    await el.updateComplete;

    expect(el.querySelector("h1").innerText).to.equal("Catch all path");
  });

  test("goto with extraParams stores them in router state", async () => {
    const el = await fixture(html`<my-app></my-app>`);

    await el._router.goto("/section/secret", { secretData: 12345 });
    await el.updateComplete;

    expect(el._router.extraParams.secretData).to.equal(12345);
  });

  test("goto to the same URL is a no-op (same-path guard)", async () => {
    const el = await fixture(html`<my-app></my-app>`);
    await el.updateComplete;
    await el._router.goto("/about");
    await el.updateComplete;

    const logBefore = el._navLog.length;
    await el._router.goto("/about");
    await el.updateComplete;

    expect(el._navLog.length).to.equal(logBefore);
  });

  test("goto with different searchParams on the same pathname triggers navigation", async () => {
    const el = await fixture(html`<my-app></my-app>`);
    await el.updateComplete;
    await el._router.goto("/about");
    await el.updateComplete;

    const logBefore = el._navLog.length;
    await el._router.goto("/about", { searchParams: { tab: "new" } });
    await el.updateComplete;

    expect(el._navLog.length).to.be.greaterThan(logBefore);
    expect(el._router.searchParams.tab).to.equal("new");
  });

  test("event payloads emitted after goto never contain undefined params or searchParams", async () => {
    const el = await fixture(html`<my-app></my-app>`);

    await el._router.goto("/section/test");
    await el.updateComplete;

    for (const entry of el._navLog) {
      expect(entry.params).to.not.be.undefined;
      expect(entry.searchParams).to.not.be.undefined;
    }
  });
});
