import { expect, fixture, html } from "@open-wc/testing";
import appRouter from "./test-utils/app-router.js";

suite("Lit Router - Match static & dynamic paths", () => {
  const routesDefinition = [
    { name: "root", path: "/", render: () => html`<h1>root</h1>` },
    { name: "home", path: "/home", render: () => html`<h1>home</h1>` },
    { name: "about", path: "/about", render: () => html`<h1>about</h1>` },
    { name: "contact", path: "/contact/", render: () => html`<h1>contact</h1>` },
    { name: "dashboard", path: "/dashboard", render: () => html`<h1>dashboard</h1>` },
    { name: "settings", path: "/settings", render: () => html`<h1>settings</h1>` },
    { name: "profile", path: "/profile/", render: () => html`<h1>profile</h1>` },
    { name: "logout", path: "logout", render: () => html`<h1>logout</h1>` },
    { name: "user", path: "/user/:id", render: () => html`<h1>user</h1>` },
    { name: "userFixed", path: "/user/fixed", render: () => html`<h1>userFixed</h1>` },
    { name: "post", path: "/post/:postId", render: () => html`<h1>post</h1>` },
    { name: "category", path: "/category/:categoryId", render: () => html`<h1>category</h1>` },
    { name: "search", path: "/search/:query", render: () => html`<h1>search</h1>` },
    { name: "order", path: "/order/:orderId", render: () => html`<h1>order</h1>` },
    { name: "invoice", path: "/invoice/:invoiceId", render: () => html`<h1>invoice</h1>` },
    { name: "specialist", path: "/specialist/:specialistId", render: () => html`<h1>specialist</h1>` },
    { name: "client", path: "/client/:clientId", render: () => html`<h1>client</h1>` },
    { name: "task", path: "/task/:taskId", render: () => html`<h1>task</h1>` },
    { name: "faq", path: "/faq/:faqId", render: () => html`<h1>faq</h1>` },
    { name: "multi1", path: "/multi/:id/:action", render: () => html`<h1>multi1</h1>` },
    { name: "multi2", path: "/multi/:id/:action/:extra", render: () => html`<h1>multi2</h1>` },
    { name: "multi4", path: "/multi/:id/:action/literal", render: () => html`<h1>multi4</h1>` },
    { name: "multi5", path: "/multi/:id/segment/:action", render: () => html`<h1>multi5</h1>` },
    { name: "fallback", path: "/*", render: () => html`<h1>fallback</h1>` },
  ];

  suiteSetup(() => {
    appRouter("my-app", routesDefinition);
  });

  routesDefinition.forEach((route) => {
    const paramMatches = route.path.match(/:([a-zA-Z0-9_]+)/g);
    const params = {};
    let testPath = route.path;
    if (paramMatches) {
      paramMatches.forEach((param, idx) => {
        testPath = testPath.replace(param, `test-param${idx}`);
        params[param.slice(1)] = `test-param${idx}`;
      });
    }

    test(`navigates to ${testPath} and matches route ${route.path}`, async () => {
      const el = await fixture(html`<my-app></my-app>`);
      await el.updateComplete;

      await el.navigator.navigate(testPath);
      await el.updateComplete;

      expect(el._router.currentRoute.path).to.equal(route.path);
      expect(el.navigator.params).to.deep.equal(params);
      expect(el.querySelector("h1").innerText).to.equal(route.name);
    });
  });
});
