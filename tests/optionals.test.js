import { expect, fixture, html } from "@open-wc/testing";
import appRouter from "./test-utils/app-router.js";

suite("Lit Router - Match Optional params & Optional segments", () => {
  suiteSetup(() => {
    appRouter("my-app", [
      { name: "home", path: "/", render: () => html`<h1>home</h1>` },
      { name: "optional1", path: "/optional/:id?", render: () => html`<h1>optional1</h1>` },
      { name: "optional2", path: "/optional/:id/:action?", render: () => html`<h1>optional2</h1>` },
      { name: "optional3", path: "/optional/:id/*", render: () => html`<h1>optional3</h1>` },
      { name: "optional4", path: "/optional/:id?/literal", render: () => html`<h1>optional4</h1>` },
      { name: "optional5", path: "/route/to/optional/segment?", render: () => html`<h1>optional5</h1>` },
      { name: "optional6", path: "/another/optional?/segment", render: () => html`<h1>optional6</h1>` },
      { name: "opt", path: "/opt/:id?", render: () => html`<h1>optional</h1>` },
    ]);
  });

  test("matches /optional without id to optional1", async () => {
    const el = await fixture(html`<my-app></my-app>`);
    await el.updateComplete;

    await el.navigator.navigate("/optional");
    await el.updateComplete;

    expect(el.querySelector("h1").innerText).to.equal("optional1");
  });

  test("scores /optional/123 against optional2 route (higher depth)", async () => {
    const el = await fixture(html`<my-app></my-app>`);
    await el.updateComplete;

    await el.navigator.navigate("/optional/123");
    await el.updateComplete;

    expect(el.querySelector("h1").innerText).to.equal("optional2");
  });

  test("optional2 also matches /optional/123/edit", async () => {
    const el = await fixture(html`<my-app></my-app>`);
    await el.updateComplete;

    await el.navigator.navigate("/optional/123/edit");
    await el.updateComplete;

    expect(el.querySelector("h1").innerText).to.equal("optional2");
  });

  test("wildcard optional3 captures /optional/123/action/extra/path", async () => {
    const el = await fixture(html`<my-app></my-app>`);
    await el.updateComplete;

    await el.navigator.navigate("/optional/123/action/extra/path/");
    await el.updateComplete;

    expect(el.querySelector("h1").innerText).to.equal("optional3");
  });

  test("optional4 matches /optional/123/literal with explicit id", async () => {
    const el = await fixture(html`<my-app></my-app>`);
    await el.updateComplete;

    await el.navigator.navigate("/optional/123/literal");
    await el.updateComplete;

    expect(el.querySelector("h1").innerText).to.equal("optional4");
  });

  test("optional4 matches /optional/literal with omitted optional id", async () => {
    const el = await fixture(html`<my-app></my-app>`);
    await el.updateComplete;

    await el.navigator.navigate("/optional/literal");
    await el.updateComplete;

    expect(el.querySelector("h1").innerText).to.equal("optional4");
  });

  test("optional segment /route/to/optional matches optional5", async () => {
    const el = await fixture(html`<my-app></my-app>`);
    await el.updateComplete;

    await el.navigator.navigate("/route/to/optional");
    await el.updateComplete;

    expect(el.querySelector("h1").innerText).to.equal("optional5");
  });

  test("optional segment /route/to/optional/segment matches optional5", async () => {
    const el = await fixture(html`<my-app></my-app>`);
    await el.updateComplete;

    await el.navigator.navigate("/route/to/optional/segment");
    await el.updateComplete;

    expect(el.querySelector("h1").innerText).to.equal("optional5");
  });

  test("optional6 matches /another/optional/segment", async () => {
    const el = await fixture(html`<my-app></my-app>`);
    await el.updateComplete;

    await el.navigator.navigate("/another/optional/segment");
    await el.updateComplete;

    expect(el.querySelector("h1").innerText).to.equal("optional6");
  });

  test("optional6 matches /another/segment with omitted optional", async () => {
    const el = await fixture(html`<my-app></my-app>`);
    await el.updateComplete;

    await el.navigator.navigate("/another/segment");
    await el.updateComplete;

    expect(el.querySelector("h1").innerText).to.equal("optional6");
  });

  test("/opt/something captures id param via optional :id?", async () => {
    const el = await fixture(html`<my-app></my-app>`);

    await el.navigator.navigate("/opt/something");
    await el.updateComplete;

    expect(el._router.currentRoute.name).to.equal("opt");
    expect(el.navigator.params).to.deep.equal({ id: "something" });
  });

  test("/opt matches with empty id when the optional param is omitted", async () => {
    const el = await fixture(html`<my-app></my-app>`);

    await el.navigator.navigate("/opt");
    await el.updateComplete;

    expect(el._router.currentRoute.name).to.equal("opt");
    expect(el.navigator.params.id).to.be.empty;
  });
});
