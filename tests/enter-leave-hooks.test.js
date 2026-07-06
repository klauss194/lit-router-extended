import { expect, fixture, html } from "@open-wc/testing";
import appRouter from "./test-utils/app-router.js";

suite("Lit Router - Enter & Leave hooks", () => {
  const sleep = (ms = 10) => new Promise((r) => setTimeout(r, ms));

  let capturedContext = null;

  suiteSetup(() => {
    appRouter("my-app", [
      { name: "root", path: "/", render: () => html`<h1>root</h1>` },
      {
        name: "enter-true", path: "/loader",
        enter: async () => { await sleep(); },
        render: () => html`<h1>enter-true</h1>`,
      },
      {
        name: "enter-false", path: "/guarded",
        enter: async () => false,
        render: () => html`<h1>enter-false</h1>`,
      },
      {
        name: "leave-true", path: "/auto-save",
        leave: async () => { await sleep(); },
        render: () => html`<h1>leave-true</h1>`,
      },
      {
        name: "leave-false", path: "/incompleted-task",
        leave: () => false,
        render: () => html`<h1>leave-false</h1>`,
      },
      {
        name: "texteditor", path: "/texteditor",
        enter: async () => { await sleep(); },
        leave: async () => { await sleep(); },
        render: () => html`<h1>texteditor</h1>`,
      },
      {
        name: "context-check", path: "/context-check",
        enter: (ctx) => { capturedContext = ctx; return true; },
        render: () => html`<h1>context-check</h1>`,
      },
      {
        name: "params-check", path: "/params-check/:id",
        enter: (ctx) => { capturedContext = ctx; return true; },
        render: () => html`<h1>params-check</h1>`,
      },
      {
        name: "leave-params-check", path: "/leave-params/:id",
        leave: (ctx) => { capturedContext = ctx; return true; },
        render: () => html`<h1>leave-params-check</h1>`,
      },
      { name: "fallback", path: "/*", render: () => html`<h1>fallback</h1>` },
    ]);
  });

  test("enter returning false cancels navigation and keeps current route", async () => {
    const el = await fixture(html`<my-app></my-app>`);
    await el.updateComplete;

    await el.navigator.navigate("/guarded");
    await el.updateComplete;

    expect(el.querySelector("h1").innerText).to.equal("root");
  });

  test("enter resolving successfully activates the new route", async () => {
    const el = await fixture(html`<my-app></my-app>`);
    await el.updateComplete;

    await el.navigator.navigate("/loader");
    await el.updateComplete;

    expect(el.querySelector("h1").innerText).to.equal("enter-true");
  });

  test("both enter and leave resolve correctly together", async () => {
    const el = await fixture(html`<my-app></my-app>`);
    await el.updateComplete;

    await el.navigator.navigate("/texteditor");
    await el.updateComplete;
    expect(el.querySelector("h1").innerText).to.equal("texteditor");

    await el.navigator.navigate("/");
    await el.updateComplete;
    expect(el.querySelector("h1").innerText).to.equal("root");
  });

  test("leave resolving successfully allows navigation away", async () => {
    const el = await fixture(html`<my-app></my-app>`);
    await el.updateComplete;

    await el.navigator.navigate("/auto-save");
    await el.updateComplete;
    expect(el.querySelector("h1").innerText).to.equal("leave-true");

    await el.navigator.navigate("/");
    await el.updateComplete;
    expect(el.querySelector("h1").innerText).to.equal("root");
  });

  test("enter hook receives searchParams from the URL query string", async () => {
    const el = await fixture(html`<my-app></my-app>`);
    capturedContext = null;

    await el.navigator.navigate("/context-check?filter=active&sort=desc");
    await el.updateComplete;

    expect(capturedContext.searchParams.filter).to.equal("active");
    expect(capturedContext.searchParams.sort).to.equal("desc");
  });

  test("enter hook receives params, searchParams, and extraParams", async () => {
    const el = await fixture(html`<my-app></my-app>`);
    capturedContext = null;

    await el.navigator.navigate("/params-check/123?sort=asc", { foo: "bar" });
    await el.updateComplete;

    expect(capturedContext.params.id).to.equal("123");
    expect(capturedContext.searchParams.sort).to.equal("asc");
    expect(capturedContext.extraParams.foo).to.equal("bar");
  });

  test("leave hook receives params, searchParams, and extraParams from the departing route", async () => {
    const el = await fixture(html`<my-app></my-app>`);

    await el.navigator.navigate("/leave-params/456?filter=out", { original: "data" });
    await el.updateComplete;
    capturedContext = null;

    await el.navigator.navigate("/");
    await el.updateComplete;

    expect(capturedContext.params.id).to.equal("456");
    expect(capturedContext.searchParams.filter).to.equal("out");
    expect(capturedContext.extraParams.original).to.equal("data");
  });

  test("leave returning false prevents navigating away", async () => {
    const el = await fixture(html`<my-app></my-app>`);
    await el.updateComplete;

    await el.navigator.navigate("/incompleted-task");
    await el.updateComplete;
    expect(el.querySelector("h1").innerText).to.equal("leave-false");

    await el.navigator.navigate("/");
    await el.updateComplete;
    expect(el.querySelector("h1").innerText).to.equal("leave-false");
  });
});
