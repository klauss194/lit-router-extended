import { expect } from "@open-wc/testing";
import { getPattern, patternCache } from "../../src/util/getPattern.js";

suite("getPattern", () => {
  const makeRoute = (path) => ({ path, name: "test", render: () => {} });

  test("compiles a static path and returns a testable pattern", () => {
    const route = makeRoute("/about");
    const pattern = getPattern(route);

    expect(pattern).to.have.property("test");
    expect(pattern).to.have.property("exec");
    expect(pattern).to.have.property("score");
    expect(pattern).to.have.property("specificity");

    expect(pattern.test({ pathname: "/about" })).to.be.true;
    expect(pattern.test({ pathname: "/other" })).to.be.false;
  });

  test("test() accepts both string and object input", () => {
    const pattern = getPattern(makeRoute("/home"));

    expect(pattern.test("/home")).to.be.true;
    expect(pattern.test({ pathname: "/home" })).to.be.true;
    expect(pattern.test("/other")).to.be.false;
  });

  test("exec() returns match data with params", () => {
    const pattern = getPattern(makeRoute("/user/:id"));
    const result = pattern.exec("/user/42");

    expect(result).to.exist;
    expect(result.pathname.groups).to.deep.equal({ id: "42" });
  });

  test("exec() returns null for non-matching paths", () => {
    const pattern = getPattern(makeRoute("/user/:id"));
    expect(pattern.exec("/about")).to.be.null;
  });

  test("dynamic segments have higher score than wildcards", () => {
    const staticPattern = getPattern(makeRoute("/user/list"));
    const dynamicPattern = getPattern(makeRoute("/user/:id"));
    const wildcardPattern = getPattern(makeRoute("/*"));

    expect(staticPattern.score).to.be.greaterThan(dynamicPattern.score);
    expect(dynamicPattern.score).to.be.greaterThan(wildcardPattern.score);
  });

  test("caches compiled patterns via WeakMap", () => {
    const route = makeRoute("/cached");
    const a = getPattern(route);
    const b = getPattern(route);

    expect(a).to.equal(b);
    expect(patternCache.has(route)).to.be.true;
  });

  test("different routes get different patterns", () => {
    const a = getPattern(makeRoute("/a"));
    const b = getPattern(makeRoute("/b"));

    expect(a.test("/a")).to.be.true;
    expect(b.test("/b")).to.be.true;
    expect(a.test("/b")).to.be.false;
  });

  test("root path / has a valid pattern with high score", () => {
    const pattern = getPattern(makeRoute("/"));
    expect(pattern.test("/")).to.be.true;
    expect(pattern.score).to.be.greaterThan(0);
  });

  test("wildcard * matches any path", () => {
    const pattern = getPattern(makeRoute("*"));
    expect(pattern.test("/anything")).to.be.true;
    expect(pattern.test("/deep/nested/path")).to.be.true;
  });

  test("named wildcard :param* captures the tail", () => {
    const pattern = getPattern(makeRoute("/files/:path*"));
    const result = pattern.exec("/files/docs/readme.md");
    expect(result.pathname.groups).to.have.property("path", "docs/readme.md");
  });

  test("optional param :param? matches with and without value", () => {
    const pattern = getPattern(makeRoute("/search/:query?"));
    expect(pattern.test("/search")).to.be.true;
    expect(pattern.test("/search/term")).to.be.true;
  });

  test("leading slash is optional for child routes", () => {
    const pattern = getPattern(makeRoute("settings"));
    expect(pattern.test("settings")).to.be.true;
    expect(pattern.test("/settings")).to.be.true;
  });
});
