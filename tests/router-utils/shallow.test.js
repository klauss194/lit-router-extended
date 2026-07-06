import { expect } from "@open-wc/testing";
import { shallowEqual, shallowDiff } from "../../src/util/shallow.js";

suite("shallow utilities", () => {
  suite("shallowEqual", () => {
    test("returns true for identical objects", () => {
      expect(shallowEqual({ a: 1, b: "x" }, { a: 1, b: "x" })).to.be.true;
    });

    test("returns false when value differs at same key", () => {
      expect(shallowEqual({ a: 1 }, { a: 2 })).to.be.false;
    });

    test("returns false when keys differ", () => {
      expect(shallowEqual({ a: 1 }, { b: 1 })).to.be.false;
      expect(shallowEqual({ a: 1, b: 2 }, { a: 1 })).to.be.false;
    });

    test("returns false for null or non-object inputs", () => {
      expect(shallowEqual(null, { a: 1 })).to.be.false;
      expect(shallowEqual({ a: 1 }, null)).to.be.false;
      expect(shallowEqual("string", "string")).to.be.false;
      expect(shallowEqual(42, 42)).to.be.false;
    });

    test("compares arrays by content, not reference", () => {
      expect(shallowEqual({ items: [1, 2, 3] }, { items: [1, 2, 3] })).to.be.true;
    });

    test("returns false for arrays with different length", () => {
      expect(shallowEqual({ items: [1, 2] }, { items: [1, 2, 3] })).to.be.false;
    });

    test("returns false for arrays with different content", () => {
      expect(shallowEqual({ items: [1, 2] }, { items: [1, 3] })).to.be.false;
    });

    test("handles empty objects", () => {
      expect(shallowEqual({}, {})).to.be.true;
    });

    test("handles null/nan/undefined values", () => {
      expect(shallowEqual({ a: null }, { a: null })).to.be.true;
      expect(shallowEqual({ a: undefined }, { a: undefined })).to.be.true;
      expect(shallowEqual({ a: null }, { a: undefined })).to.be.false;
    });
  });

  suite("shallowDiff", () => {
    test("returns empty array for identical objects", () => {
      expect(shallowDiff({ a: 1 }, { a: 1 })).to.deep.equal([]);
    });

    test("returns the differing keys", () => {
      expect(shallowDiff({ a: 1, b: 2 }, { a: 1, b: 3 })).to.deep.equal(["b"]);
    });

    test("returns keys of second object when lengths differ", () => {
      expect(shallowDiff({ a: 1 }, { a: 1, b: 2 })).to.deep.equal(["a", "b"]);
    });

    test("returns empty array for non-object inputs", () => {
      expect(shallowDiff(null, { a: 1 })).to.deep.equal([]);
      expect(shallowDiff({ a: 1 }, null)).to.deep.equal([]);
    });

    test("detects array content changes", () => {
      expect(shallowDiff({ items: [1, 2] }, { items: [1, 3] })).to.deep.equal(["items"]);
    });

    test("returns empty array for identical arrays", () => {
      expect(shallowDiff({ items: [1, 2] }, { items: [1, 2] })).to.deep.equal([]);
    });

    test("returns multiple changed keys", () => {
      expect(shallowDiff({ a: 1, b: 2, c: 3 }, { a: 9, b: 2, c: 8 })).to.deep.equal(["a", "c"]);
    });

    test("detects keys only present in first object", () => {
      expect(shallowDiff({ a: 1, b: 2 }, { a: 1 })).to.deep.equal(["a"]);
    });

    test("returns all keys of B when objects are identically referenced", () => {
      const obj = { a: 1, b: 2 };
      expect(shallowDiff(obj, obj)).to.deep.equal(["a", "b"]);
    });
  });
});
