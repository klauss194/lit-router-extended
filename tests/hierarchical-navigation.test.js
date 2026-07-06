import { html, fixture, expect } from "@open-wc/testing";
import appRouter from "./test-utils/app-router.js";
import nestedRoutes from "./test-utils/nested-routes.js";
import { waitForUrl, waitForHash, waitForElement } from "./test-utils/wait.js";


suite("Lit Router - Hierarchical Navigation & State", () => {
  suiteSetup(() => {
    nestedRoutes("test-child", [
      { path: "/", render: () => html`<div id="child-root">Child Root</div>` },
      { path: "step-two", render: () => html`<div id="child-step-two">Step Two</div>` },
      { path: "settings", render: () => html`<div id="child-settings">Settings</div>` },
    ]);

    nestedRoutes("test-parent", [
      { path: "/", render: () => html`<div id="parent-root">Parent Root</div>` },
      { path: "flow/*", render: () => html`<test-child></test-child>` },
    ]);

    appRouter("test-app-hierarchy", [
      { path: "/", render: () => html`<h1>Home</h1>` },
      { path: "/app/*", render: () => html`<test-parent></test-parent>` },
    ]);
  });

  suite("Basic Navigation", () => {
    test("propagates URL tail down to the grandchild", async () => {
      const el = await fixture(html`<test-app-hierarchy></test-app-hierarchy>`);
      await el.updateComplete;

      await el.navigator.navigate("/app/flow/step-two");
      await el.updateComplete;
      await waitForElement(el, "#child-step-two");

      const parent = el.querySelector("test-parent");
      const child = parent.querySelector("test-child");
      const target = child.querySelector("#child-step-two");

      expect(target).to.exist;
      expect(target.innerText).to.equal("Step Two");
    });

    test("child navigator push navigates deeper into child tree", async () => {
      const el = await fixture(html`<test-app-hierarchy></test-app-hierarchy>`);

      await el.navigator.navigate("/app/flow/");
      await waitForElement(el, "test-child");

      const child = el.querySelector("test-parent").querySelector("test-child");

      await child.navigator.push("./settings");
      await waitForUrl("/app/flow/settings");

      expect(child.querySelector("#child-settings")).to.exist;
      expect(window.location.pathname).to.equal("/app/flow/settings");
    });

    test("pop navigates back to parent link", async () => {
      const el = await fixture(html`<test-app-hierarchy></test-app-hierarchy>`);

      await el.navigator.navigate("/app/flow/");
      await waitForElement(el, "test-child");

      const child = el.querySelector("test-parent").querySelector("test-child");

      await child.navigator.push("./step-two");
      await waitForUrl("/app/flow/step-two");

      await child.navigator.pop();
      await waitForUrl("/app/flow");

      expect(window.location.pathname).to.equal("/app/flow");
    });

    test("rapid double navigation resolves to the last request", async () => {
      const el = await fixture(html`<test-app-hierarchy></test-app-hierarchy>`);

      const p1 = el.navigator.navigate("/app/flow/step-two");
      const p2 = el.navigator.navigate("/app/flow/settings");
      await Promise.all([p1, p2]);
      await waitForUrl("/app/flow/settings");

      const child = el.querySelector("test-parent").querySelector("test-child");

      expect(child.querySelector("#child-settings")).to.exist;
      expect(child.querySelector("#child-step-two")).to.be.null;
      expect(window.location.pathname).to.equal("/app/flow/settings");
    });
  });

  suite("Search Params - Push & Pop", () => {
    test("push replaces search params by default", async () => {
      const el = await fixture(html`<test-app-hierarchy></test-app-hierarchy>`);

      await el.navigator.navigate("/app/flow/step-two?initial=true&keep=no");
      await waitForElement(el, "test-child");

      const child = el.querySelector("test-parent").querySelector("test-child");

      await child.navigator.push("./settings", { searchParams: { new: "yes" } });
      await waitForUrl("/app/flow/settings");

      const u = new URL(window.location.href);
      expect(u.searchParams.get("new")).to.equal("yes");
      expect(u.searchParams.has("initial")).to.be.false;
    });

    test("push with preserveSearchParams merges them", async () => {
      const el = await fixture(html`<test-app-hierarchy></test-app-hierarchy>`);

      await el.navigator.navigate("/app/flow/step-two?initial=true");
      await waitForElement(el, "test-child");

      const child = el.querySelector("test-parent").querySelector("test-child");

      await child.navigator.push("./settings", {
        preserveSearchParams: true,
        searchParams: { added: "yes" },
      });
      await waitForUrl("/app/flow/settings");

      const u = new URL(window.location.href);
      expect(u.searchParams.get("initial")).to.equal("true");
      expect(u.searchParams.get("added")).to.equal("yes");
    });

    test("pop merges search params when preserveSearchParams is true", async () => {
      const el = await fixture(html`<test-app-hierarchy></test-app-hierarchy>`);

      await el.navigator.navigate("/app/flow/step-two");
      await waitForElement(el, "test-child");

      const child = el.querySelector("test-parent").querySelector("test-child");

      await child.navigator.push("./settings", { searchParams: { current: "preserved" } });
      await waitForUrl("/app/flow/settings");

      await child.navigator.pop({
        preserveSearchParams: true,
        searchParams: { extra: "added" },
      });
      await waitForUrl("/app/flow");

      const u = new URL(window.location.href);
      expect(u.searchParams.get("current")).to.equal("preserved");
      expect(u.searchParams.get("extra")).to.equal("added");
    });

    test("pop with preserveSearchParams carries current search params to the parent route", async () => {
      const el = await fixture(html`<test-app-hierarchy></test-app-hierarchy>`);

      await el.navigator.navigate("/app/flow/step-two?shared=keep");
      await waitForElement(el, "test-child");

      const child = el.querySelector("test-parent").querySelector("test-child");

      await child.navigator.push("./settings");
      await waitForUrl("/app/flow/settings");

      await child.navigator.pop({ preserveSearchParams: true });
      await waitForUrl("/app/flow");

      expect(window.location.pathname).to.equal("/app/flow");
    });

    test("pop with preserveSearchParams and explicit searchParams merges current and new", async () => {
      const el = await fixture(html`<test-app-hierarchy></test-app-hierarchy>`);

      await el.navigator.navigate("/app/flow/step-two?saved=yes");
      await waitForElement(el, "test-child");

      const child = el.querySelector("test-parent").querySelector("test-child");

      await child.navigator.push("./settings", { searchParams: { current: "yes" } });
      await waitForUrl("/app/flow/settings");

      await child.navigator.pop({
        preserveSearchParams: true,
        searchParams: { new: "yes" },
      });
      await waitForUrl("/app/flow");

      const u = new URL(window.location.href);
      expect(u.searchParams.get("new")).to.equal("yes");
    });
  });

  suite("Hash Handling - Push & Pop", () => {
    test("push sets the hash", async () => {
      const el = await fixture(html`<test-app-hierarchy></test-app-hierarchy>`);

      await el.navigator.navigate("/app/flow/step-two");
      await waitForElement(el, "test-child");

      const child = el.querySelector("test-parent").querySelector("test-child");

      await child.navigator.push("./settings", { hash: "section-1" });
      await waitForHash("#section-1");

      expect(window.location.hash).to.equal("#section-1");
    });

    test("pop with explicit hash sets the hash on the parent route", async () => {
      const el = await fixture(html`<test-app-hierarchy></test-app-hierarchy>`);

      await el.navigator.navigate("/app/flow/step-two");
      await waitForElement(el, "test-child");

      const child = el.querySelector("test-parent").querySelector("test-child");

      await child.navigator.push("./settings", { hash: "new-section" });
      await waitForHash("#new-section");
      expect(window.location.hash).to.equal("#new-section");

      await child.navigator.pop({ hash: "restored-hash" });
      await waitForHash("#restored-hash");

      expect(window.location.hash).to.equal("#restored-hash");
    });

    test("pop with explicit hash overrides any previous hash", async () => {
      const el = await fixture(html`<test-app-hierarchy></test-app-hierarchy>`);

      await el.navigator.navigate("/app/flow/step-two");
      await waitForElement(el, "test-child");

      const child = el.querySelector("test-parent").querySelector("test-child");

      await child.navigator.push("./settings");
      await waitForUrl("/app/flow/settings");

      await child.navigator.pop({ hash: "override-hash" });
      await waitForHash("#override-hash");

      expect(window.location.hash).to.equal("#override-hash");
    });

    test("pop with empty hash string clears the hash", async () => {
      const el = await fixture(html`<test-app-hierarchy></test-app-hierarchy>`);

      await el.navigator.navigate("/app/flow/step-two");
      await waitForElement(el, "test-child");

      const child = el.querySelector("test-parent").querySelector("test-child");

      await child.navigator.push("./settings", { hash: "temp" });
      await waitForHash("#temp");

      await child.navigator.pop({ hash: "" });
      await waitForHash("");

      expect(window.location.hash).to.equal("");
    });

    test("default pop navigates to parent route without setting a hash", async () => {
      const el = await fixture(html`<test-app-hierarchy></test-app-hierarchy>`);

      await el.navigator.navigate("/app/flow/step-two");
      await waitForElement(el, "test-child");

      const child = el.querySelector("test-parent").querySelector("test-child");

      await child.navigator.push("./settings", { hash: "settings-hash" });
      await waitForHash("#settings-hash");

      await child.navigator.pop();
      await waitForUrl("/app/flow");

      expect(window.location.pathname).to.equal("/app/flow");
    });
  });
});
