import { expect, fixture, html } from "@open-wc/testing";
import appRouter from "./test-utils/app-router.js";
import { RouterLocationChangingEvent } from "../src/RoutesEvents.js";
import { waitForUrl } from "./test-utils/wait.js";

suite("Lit Router - Navigation Events", () => {
  suiteSetup(() => {
    appRouter("event-app", [
      { path: "/", render: () => html`<div id="root"></div>` },
      { path: "/next", render: () => html`<div id="next"></div>` },
    ]);
  });

  test("popstate navigation emits location-changing on window, not on host", async () => {
    const el = await fixture(html`<event-app></event-app>`);
    await el.updateComplete;

    await el.navigator.navigate("/");
    await el.navigator.navigate("/next");

    let windowReceived = false;
    let hostReceived = false;
    const windowHandler = () => { windowReceived = true; };
    const hostHandler = () => { hostReceived = true; };

    window.addEventListener(RouterLocationChangingEvent.eventName, windowHandler, { once: true });
    el.addEventListener(RouterLocationChangingEvent.eventName, hostHandler, { once: true });

    history.back();
    await waitForUrl("/");

    expect(windowReceived).to.be.true;
    expect(hostReceived).to.be.false;
  });
});
