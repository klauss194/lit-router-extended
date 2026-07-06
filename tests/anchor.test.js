import { expect, fixture, html } from "@open-wc/testing";
import appRouter from "./test-utils/app-router.js";

const nextTick = () => new Promise((r) => setTimeout(r, 0));

suite("Lit Router - Listen anchor navigation", () => {
  suiteSetup(() => {
    appRouter("my-app-named", [
      {
        name: "home",
        path: "/",
        render: () => html`<h1>home</h1><a href="/route1">Go to route1</a>`,
      },
      { name: "route1", path: "/route1", render: () => html`<h1>route1</h1>` },
      {
        name: "route2",
        path: "/route2/:param",
        render: ({ params }) => html`<h1>route2</h1><pre>${JSON.stringify(params)}</pre>`,
      },
    ]);
  });

  test("clicking a same-origin <a> navigates and renders the target route", async () => {
    const el = await fixture(html`<my-app-named></my-app-named>`);
    await el.updateComplete;
    await el.navigator.navigate("/");
    await el.updateComplete;

    expect(el._router.currentRoute.name).to.equal("home");

    el.querySelector("a").click();
    await nextTick();
    await el.updateComplete;

    expect(el._router.currentRoute.name).to.equal("route1");
    expect(el.querySelector("h1").innerText).to.equal("route1");
  });

  test("<a download> does not trigger router navigation", async () => {
    const el = await fixture(html`<my-app-named></my-app-named>`);
    await el.updateComplete;
    await el.navigator.navigate("/");
    await el.updateComplete;

    let navigateCalls = 0;
    const originalNavigate = el._router.navigate.bind(el._router);
    el._router.navigate = async (...args) => {
      navigateCalls += 1;
      return originalNavigate(...args);
    };

    const anchor = document.createElement("a");
    anchor.setAttribute("href", "/route1");
    anchor.setAttribute("download", "file.txt");
    anchor.textContent = "download link";
    anchor.addEventListener("click", (e) => e.preventDefault());
    el.appendChild(anchor);
    anchor.click();
    await el.updateComplete;

    expect(navigateCalls).to.equal(0);
    expect(el._router.currentRoute.name).to.equal("home");
  });

  test("<a router-ignore> does not trigger router navigation", async () => {
    const el = await fixture(html`<my-app-named></my-app-named>`);
    await el.updateComplete;
    await el.navigator.navigate("/");
    await el.updateComplete;

    let navigateCalls = 0;
    const originalNavigate = el._router.navigate.bind(el._router);
    el._router.navigate = async (...args) => {
      navigateCalls += 1;
      return originalNavigate(...args);
    };

    const anchor = document.createElement("a");
    anchor.setAttribute("href", "/route1");
    anchor.setAttribute("router-ignore", "");
    anchor.textContent = "ignored link";
    anchor.addEventListener("click", (e) => e.preventDefault());
    el.appendChild(anchor);
    anchor.click();
    await el.updateComplete;

    expect(navigateCalls).to.equal(0);
    expect(el._router.currentRoute.name).to.equal("home");
  });

  test('<a target="_blank"> does not trigger router navigation', async () => {
    const el = await fixture(html`<my-app-named></my-app-named>`);
    await el.updateComplete;
    await el.navigator.navigate("/");
    await el.updateComplete;

    let navigateCalls = 0;
    const originalNavigate = el._router.navigate.bind(el._router);
    el._router.navigate = async (...args) => {
      navigateCalls += 1;
      return originalNavigate(...args);
    };

    const anchor = document.createElement("a");
    anchor.setAttribute("href", "/route1");
    anchor.setAttribute("target", "_blank");
    anchor.textContent = "blank link";
    anchor.addEventListener("click", (e) => e.preventDefault());
    el.appendChild(anchor);
    anchor.click();
    await el.updateComplete;

    expect(navigateCalls).to.equal(0);
    expect(el._router.currentRoute.name).to.equal("home");
  });
});
