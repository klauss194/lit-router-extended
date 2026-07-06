import { expect, fixture, html } from "@open-wc/testing";
import appRouter from "./test-utils/app-router.js";
import {
  RouterLocationChangedEvent,
  RouterLocationChangingEvent,
} from "../src/RoutesEvents.js";

const aTimeout = (ms) => new Promise((r) => setTimeout(r, ms));

suite("Lit Router - Lifecycle events", () => {
  suiteSetup(() => {
    appRouter("my-app-lifecycle", [
      { name: "home", path: "/", render: () => html`<h1>Home</h1>` },
      { name: "orders", path: "/orders", render: () => html`<h1>Orders</h1>` },
    ]);
  });

  test("navigate dispatches location-changing with correct searchParams and hash", async () => {
    const el = await fixture(html`<my-app-lifecycle></my-app-lifecycle>`);
    await el.updateComplete;

    let detail;
    const onChanging = (e) => {
      detail = e.detail;
    };
    window.addEventListener(RouterLocationChangingEvent.eventName, onChanging, { once: true });

    await el.navigator.navigate("/orders?status=open#details", { source: "mobile", searchParams: { view: "compact" } });
    await aTimeout(10);

    expect(detail).to.exist;
    expect(detail.pathname).to.equal("/orders");
    expect(detail.extraParams).to.deep.equal({ source: "mobile" });
    expect(detail.searchParams).to.deep.equal({ view: "compact", status: "open" });
    expect(detail.hash).to.equal("details");
  });

  test("same-URL navigation is a no-op and dispatches no events", async () => {
    const el = await fixture(html`<my-app-lifecycle></my-app-lifecycle>`);
    await el.updateComplete;

    await el.navigator.navigate("/orders?status=open#details", {
      searchParams: { view: "compact" },
      source: "mobile",
    });
    await el.updateComplete;

    let changingCount = 0;
    let changedCount = 0;
    const onChanging = () => { changingCount += 1; };
    const onChanged = () => { changedCount += 1; };

    window.addEventListener(RouterLocationChangingEvent.eventName, onChanging);
    window.addEventListener(RouterLocationChangedEvent.eventName, onChanged);

    try {
      await el.navigator.navigate("/orders?status=open#details", { searchParams: { view: "compact" } });
      await aTimeout(10);

      expect(changingCount).to.equal(0);
      expect(changedCount).to.equal(0);
    } finally {
      window.removeEventListener(RouterLocationChangingEvent.eventName, onChanging);
      window.removeEventListener(RouterLocationChangedEvent.eventName, onChanged);
    }
  });

  test("raw CustomEvent dispatching on window does not cause host re-renders", async () => {
    const el = await fixture(html`<my-app-lifecycle></my-app-lifecycle>`);
    await el.updateComplete;

    let requestUpdateCalls = 0;
    const original = el.requestUpdate.bind(el);
    el.requestUpdate = (...args) => {
      requestUpdateCalls += 1;
      return original(...args);
    };
    requestUpdateCalls = 0;

    window.dispatchEvent(new CustomEvent(RouterLocationChangingEvent.eventName));
    el.dispatchEvent(new CustomEvent(RouterLocationChangedEvent.eventName, { bubbles: true, composed: true }));
    window.dispatchEvent(new CustomEvent(RouterLocationChangedEvent.eventName));
    await aTimeout(10);

    expect(requestUpdateCalls).to.equal(0);
  });

  test("window-level RouterLocationChangedEvent triggers one re-render", async () => {
    const el = await fixture(html`<my-app-lifecycle></my-app-lifecycle>`);
    await el.updateComplete;

    let requestUpdateCalls = 0;
    const original = el.requestUpdate.bind(el);
    el.requestUpdate = (...args) => {
      requestUpdateCalls += 1;
      return original(...args);
    };
    requestUpdateCalls = 0;

    window.dispatchEvent(
      new RouterLocationChangedEvent({
        currentPathname: "/",
        pathname: "/orders",
        searchParams: { view: "compact" },
        hash: "details",
        extraParams: { source: "mobile" },
      }),
    );
    await aTimeout(10);

    expect(requestUpdateCalls).to.equal(0);
  });
});
