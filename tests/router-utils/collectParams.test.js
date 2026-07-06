import { expect } from "@open-wc/testing";
import { collectParams } from "../../src/util/collectParams.js";

suite("collectParams", () => {
  const makeInstance = (overrides = {}) => ({
    state: {
      pathname: "/",
      params: {},
      extraParams: {},
      searchParams: {},
      hash: "",
      ...overrides,
    },
    _children: new Set(),
  });

  test("collects params from a single instance", () => {
    const instance = makeInstance({
      params: { id: "42" },
      extraParams: { draft: true },
      searchParams: { tab: "info" },
    });

    const result = collectParams(instance);
    expect(result.params).to.deep.equal({ id: "42" });
    expect(result.extraParams).to.deep.equal({ draft: true });
    expect(result.searchParams).to.deep.equal({ tab: "info" });
  });

  test("merges params from instance tree recursively", () => {
    const parent = makeInstance({
      params: { org: "acme" },
      extraParams: { a: 1 },
      searchParams: { s: "x" },
    });

    const child = makeInstance({
      params: { repo: "router" },
      extraParams: { b: 2 },
      searchParams: { t: "y" },
    });

    parent._children.add(child);

    const result = collectParams(parent);
    expect(result.params).to.deep.equal({ org: "acme", repo: "router" });
    expect(result.extraParams).to.deep.equal({ a: 1, b: 2 });
    expect(result.searchParams).to.deep.equal({ s: "x", t: "y" });
  });

  test("params keys with string-numeric values are NOT filtered (only typeof 'number' keys are)", () => {
    const instance = makeInstance({
      params: { name: "page", 0: "tail", 1: "extra" },
    });

    const result = collectParams(instance);
    expect(result.params).to.have.property("name", "page");
    expect(result.params).to.have.property("0", "tail");
    expect(result.params).to.have.property("1", "extra");
  });

  test("stops traversal at stopInstance", () => {
    const grandparent = makeInstance({ params: { a: "1" }, extraParams: { x: 10 } });
    const parent = makeInstance({ params: { b: "2" }, extraParams: { y: 20 } });
    const child = makeInstance({ params: { c: "3" }, extraParams: { z: 30 } });

    grandparent._children.add(parent);
    parent._children.add(child);

    const result = collectParams(grandparent, parent);
    expect(result.params).to.deep.equal({ a: "1", b: "2" });
    expect(result.extraParams).to.deep.equal({ x: 10, y: 20 });
    expect(result.params).to.not.have.property("c");
  });

  test("returns empty stores for null/undefined instance", () => {
    const result = collectParams(null);
    expect(result.params).to.deep.equal({});
    expect(result.extraParams).to.deep.equal({});
    expect(result.searchParams).to.deep.equal({});
  });

  test("legacy fallback: reads _currentParams when state is unavailable", () => {
    const legacyInstance = {
      _currentParams: { old: "legacy" },
      _currentExtraParams: { oldExtra: true },
      _currentSearchParams: { oldSearch: "q" },
      _children: new Set(),
    };

    const result = collectParams(legacyInstance);
    expect(result.params).to.deep.equal({ old: "legacy" });
    expect(result.extraParams).to.deep.equal({ oldExtra: true });
    expect(result.searchParams).to.deep.equal({ oldSearch: "q" });
  });

  test("legacy fallback: supports _childRoutes array", () => {
    const parent = {
      _currentParams: { p: "1" },
      _currentExtraParams: {},
      _currentSearchParams: {},
      _childRoutes: [
        {
          ref: {
            state: { params: { c: "2" }, extraParams: {}, searchParams: {} },
            _children: new Set(),
          },
        },
      ],
    };

    const result = collectParams(parent);
    expect(result.params).to.deep.equal({ p: "1", c: "2" });
  });

  test("handles empty defaults with nullish state fields", () => {
    const instance = {
      state: {
        pathname: "/",
        params: null,
        extraParams: undefined,
        searchParams: null,
      },
      _children: new Set(),
    };

    const result = collectParams(instance);
    expect(result.params).to.deep.equal({});
    expect(result.extraParams).to.deep.equal({});
    expect(result.searchParams).to.deep.equal({});
  });

  test("deep tree merges searchParams correctly", () => {
    const root = makeInstance({ searchParams: { theme: "dark" } });
    const level1 = makeInstance({ searchParams: { view: "list" } });
    const level2 = makeInstance({ searchParams: { page: "1" } });

    root._children.add(level1);
    level1._children.add(level2);

    const result = collectParams(root);
    expect(result.searchParams).to.deep.equal({ theme: "dark", view: "list", page: "1" });
  });
});
