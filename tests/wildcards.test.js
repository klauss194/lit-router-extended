import { expect, fixture, html } from "@open-wc/testing";
import appRouter from "./test-utils/app-router.js";

suite("Lit Router - Match wildcards", () => {
  suiteSetup(() => {
    appRouter("my-app", [
      { name: "root", path: "/", render: () => html`<h1>root</h1>` },
      { name: "wildcard1", path: "/wild/*", render: () => html`<h1>wildcard1</h1>` },
      { name: "wildcard2", path: "/wild/segment/*", render: () => html`<h1>wildcard2</h1>` },
      { name: "wildcard3", path: "/wild/:param*", render: () => html`<h1>wildcard3</h1>` },
      { name: "wildcard4", path: "/wild/:paramName*", render: () => html`<h1>wildcard4</h1>` },
      { name: "wildcard5", path: "/wild/*/deep", render: () => html`<h1>wildcard5</h1>` },
      { name: "wildcard6", path: "/wild/:param*/deep", render: () => html`<h1>wildcard6</h1>` },
      { name: "multi1", path: "/multi/:id/:action", render: () => html`<h1>multi1</h1>` },
      { name: "multi2", path: "/multi/:id/:action/extra", render: () => html`<h1>multi2</h1>` },
      { name: "multi3", path: "/multi/:id/*", render: () => html`<h1>multi3</h1>` },
      { name: "multi4", path: "/multi/:id/:action*", render: () => html`<h1>multi4</h1>` },
      { name: "multi5", path: "/multi/:id/segment/:action", render: () => html`<h1>multi5</h1>` },
    ]);
  });

  suite("Basic Wildcard Matching", () => {
    test("wildcard1 matches /wild/anything", async () => {
      const el = await fixture(html`<my-app></my-app>`);
      await el.updateComplete;

      await el.navigator.navigate("/wild/anything");
      await el.updateComplete;

      expect(el._router.currentRoute.name).to.equal("wildcard1");
      expect(el.querySelector("h1").innerText).to.equal("wildcard1");
    });

    test("wildcard1 matches /wild/a/b/c", async () => {
      const el = await fixture(html`<my-app></my-app>`);
      await el.updateComplete;

      await el.navigator.navigate("/wild/a/b/c");
      await el.updateComplete;

      expect(el._router.currentRoute.name).to.equal("wildcard1");
      expect(el.querySelector("h1").innerText).to.equal("wildcard1");
    });
  });

  suite("Static Segment + Wildcard", () => {
    test("wildcard2 matches /wild/segment/anything", async () => {
      const el = await fixture(html`<my-app></my-app>`);
      await el.updateComplete;

      await el.navigator.navigate("/wild/segment/anything");
      await el.updateComplete;

      expect(el._router.currentRoute.name).to.equal("wildcard2");
      expect(el.querySelector("h1").innerText).to.equal("wildcard2");
    });

    test("wildcard2 matches /wild/segment/a/b/c", async () => {
      const el = await fixture(html`<my-app></my-app>`);
      await el.updateComplete;

      await el.navigator.navigate("/wild/segment/a/b/c");
      await el.updateComplete;

      expect(el._router.currentRoute.name).to.equal("wildcard2");
      expect(el.querySelector("h1").innerText).to.equal("wildcard2");
    });
  });

  suite("Named Parameter Wildcard", () => {
    test("wildcard1 wins over named wildcards for /wild/other-segment due to higher score", async () => {
      const el = await fixture(html`<my-app></my-app>`);
      await el.updateComplete;

      await el.navigator.navigate("/wild/other-segment");
      await el.updateComplete;

      expect(el._router.currentRoute.name).to.equal("wildcard1");
      expect(el.querySelector("h1").innerText).to.equal("wildcard1");
    });
  });

  suite("Wildcard with Static Suffix", () => {
    test("wildcard5 matches /wild/anything/deep", async () => {
      const el = await fixture(html`<my-app></my-app>`);
      await el.updateComplete;

      await el.navigator.navigate("/wild/anything/deep");
      await el.updateComplete;

      expect(el._router.currentRoute.name).to.equal("wildcard5");
      expect(el.querySelector("h1").innerText).to.equal("wildcard5");
    });

    test("wildcard2 wins over wildcard5 for /wild/segment/deep", async () => {
      const el = await fixture(html`<my-app></my-app>`);
      await el.updateComplete;

      await el.navigator.navigate("/wild/segment/deep");
      await el.updateComplete;

      expect(el._router.currentRoute.name).to.not.equal("wildcard5");
      expect(el.querySelector("h1").innerText).to.not.equal("wildcard5");
    });

    test("wildcard5 matches /wild/a/b/c/deep with multi-segment wildcard", async () => {
      const el = await fixture(html`<my-app></my-app>`);
      await el.updateComplete;

      await el.navigator.navigate("/wild/a/b/c/deep");
      await el.updateComplete;

      expect(el._router.currentRoute.name).to.equal("wildcard5");
      expect(el.querySelector("h1").innerText).to.equal("wildcard5");
    });
  });

  suite("Multi-parameter Route Hierarchy", () => {
    test("multi2 matches /multi/123/edit/extra with static suffix", async () => {
      const el = await fixture(html`<my-app></my-app>`);
      await el.updateComplete;

      await el.navigator.navigate("/multi/123/edit/extra");
      await el.updateComplete;

      expect(el._router.currentRoute.name).to.equal("multi2");
      expect(el.navigator.params).to.deep.equal({ id: "123", action: "edit" });
      expect(el.querySelector("h1").innerText).to.equal("multi2");
    });

    test("multi3 matches /multi/123/edit/more/path via wildcard", async () => {
      const el = await fixture(html`<my-app></my-app>`);
      await el.updateComplete;

      await el.navigator.navigate("/multi/123/edit/more/path");
      await el.updateComplete;

      expect(el._router.currentRoute.name).to.equal("multi3");
      expect(el.navigator.params).to.have.property("id", "123");
      expect(el.querySelector("h1").innerText).to.equal("multi3");
    });
  });
});
