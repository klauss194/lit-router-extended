import { expect } from "@open-wc/testing";
import { getTailGroup } from "../../src/util/getTailGroup.js";

suite("getTailGroup", () => {
  test("extracts the highest numeric key from groups", () => {
    const groups = { name: "page", 0: "tail-value" };
    expect(getTailGroup(groups)).to.equal("tail-value");
  });

  test("returns the highest numeric key when multiple exist", () => {
    const groups = { 0: "first", 1: "middle", 2: "last" };
    expect(getTailGroup(groups)).to.equal("last");
  });

  test("returns undefined when no numeric keys exist", () => {
    const groups = { name: "page", id: "42" };
    expect(getTailGroup(groups)).to.be.undefined;
  });

  test("returns undefined for empty object", () => {
    expect(getTailGroup({})).to.be.undefined;
  });

  test("returns value for single numeric key", () => {
    expect(getTailGroup({ 0: "wildcard-capture" })).to.equal("wildcard-capture");
  });

  test("numeric key order is consistent regardless of insertion order", () => {
    const groups = { 5: "five", 1: "one", 3: "three" };
    expect(getTailGroup(groups)).to.equal("five");
  });
});
