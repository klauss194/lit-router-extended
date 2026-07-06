import { expect } from "@open-wc/testing";
import { diff, exportTrace, clearTrace, isTracing } from "../../src/util/log.js";

suite("log utilities", () => {
  suite("diff", () => {
    test("returns null when both values are identical", () => {
      expect(diff({ a: 1 }, { a: 1 })).to.be.null;
    });

    test("returns null when both inputs are null", () => {
      expect(diff(null, null)).to.be.null;
    });

    test("detects changed values", () => {
      const result = diff({ a: 1, b: 2 }, { a: 1, b: 3 });
      expect(result).to.be.a("string");
      expect(result).to.include("b:3↞2");
    });

    test("detects new keys", () => {
      const result = diff({ a: 1 }, { a: 1, b: 2 });
      expect(result).to.include("b:2↞∅");
    });

    test("detects removed keys", () => {
      const result = diff({ a: 1, b: 2 }, { a: 1 });
      expect(result).to.include("b:∅↞2");
    });

    test("handles null prev", () => {
      const result = diff(null, { a: 1 });
      expect(result).to.include("a:1↞∅");
    });

    test("handles undefined prev", () => {
      const result = diff(undefined, { a: 1 });
      expect(result).to.include("a:1↞∅");
    });

    test("handles null next", () => {
      const result = diff({ a: 1 }, null);
      expect(result).to.include("a:∅↞1");
    });

    test("handles array values", () => {
      expect(diff({ items: [1, 2] }, { items: [1, 2] })).to.be.null;
    });

    test("detects array content changes", () => {
      const result = diff({ items: [1, 2] }, { items: [1, 3] });
      expect(result).to.be.a("string");
    });

    test("returns null when nothing changed", () => {
      expect(diff({}, {})).to.be.null;
    });
  });

  suite("trace helpers", () => {
    test("exportTrace returns a string", () => {
      const trace = exportTrace();
      expect(trace).to.be.a("string");
    });

    test("clearTrace clears the buffer", () => {
      clearTrace();
      expect(exportTrace()).to.equal("");
    });

    test("exportTrace is exposed on window.__routerTrace", () => {
      expect(window.__routerTrace).to.be.a("function");
      expect(window.__routerTrace()).to.be.a("string");
    });

    test("clearTrace is exposed on window.__routerTraceClear", () => {
      expect(window.__routerTraceClear).to.be.a("function");
    });
  });

  suite("isTracing", () => {
    test("isTracing returns a boolean", () => {
      expect(isTracing()).to.be.a("boolean");
    });
  });
});
