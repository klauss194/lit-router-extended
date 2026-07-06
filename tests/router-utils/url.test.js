import { expect } from "@open-wc/testing";
import {
  canonicalizePath,
  parseUrl,
  resolveUrl,
  buildHref,
  locationToHref,
  isSameLocation,
  joinPaths,
} from "../../src/util/url.js";

suite("url utilities", () => {
  suite("canonicalizePath", () => {
    test("strips trailing slash from non-root path", () => {
      expect(canonicalizePath("/articles/")).to.equal("/articles");
    });

    test("preserves root /", () => {
      expect(canonicalizePath("/")).to.equal("/");
    });

    test("is idempotent on already-clean paths", () => {
      expect(canonicalizePath("/articles")).to.equal("/articles");
      expect(canonicalizePath("/deep/path")).to.equal("/deep/path");
    });

    test("preserves empty string", () => {
      expect(canonicalizePath("")).to.equal("");
    });
  });

  suite("parseUrl", () => {
    test("parses path, search, and hash from a full URL", () => {
      const r = parseUrl("http://localhost/articles?page=1&sort=desc#comments");
      expect(r.pathname).to.equal("/articles");
      expect(r.searchParams).to.deep.equal({ page: "1", sort: "desc" });
      expect(r.hash).to.equal("comments");
    });

    test("parses bare path with query and hash", () => {
      const r = parseUrl("/search?q=lit&lang=en#results");
      expect(r.pathname).to.equal("/search");
      expect(r.searchParams).to.deep.equal({ q: "lit", lang: "en" });
      expect(r.hash).to.equal("results");
    });

    test("parses bare path with no query or hash", () => {
      const r = parseUrl("/home");
      expect(r.pathname).to.equal("/home");
      expect(r.searchParams).to.deep.equal({});
      expect(r.hash).to.equal("");
    });

    test("canonicalizes trailing slash", () => {
      const r = parseUrl("/articles/");
      expect(r.pathname).to.equal("/articles");
    });

    test("handles empty search and hash placeholders", () => {
      const r = parseUrl("/path?");
      expect(r.pathname).to.equal("/path");
      expect(r.searchParams).to.deep.equal({});
      expect(r.hash).to.equal("");
    });
  });

  suite("resolveUrl", () => {
    test("resolves absolute target against base", () => {
      const r = resolveUrl("/app/flow", "/settings");
      expect(r.pathname).to.equal("/settings");
      expect(r.searchParams).to.deep.equal({});
      expect(r.hash).to.equal("");
    });

    test("resolves relative ./ path against base", () => {
      const r = resolveUrl("/app/flow", "./step-two");
      expect(r.pathname).to.equal("/app/flow/step-two");
    });

    test("resolves relative ../ path against base", () => {
      const r = resolveUrl("/app/flow/step-two", "../");
      expect(r.pathname).to.equal("/app/flow");
    });

    test("extracts search params and hash from target", () => {
      const r = resolveUrl("/base", "/target?filter=on&page=2#section");
      expect(r.pathname).to.equal("/target");
      expect(r.searchParams).to.deep.equal({ filter: "on", page: "2" });
      expect(r.hash).to.equal("section");
    });

    test("resolves relative path with query and hash", () => {
      const r = resolveUrl("/admin", "./users?role=admin");
      expect(r.pathname).to.equal("/admin/users");
      expect(r.searchParams).to.deep.equal({ role: "admin" });
    });
  });

  suite("buildHref", () => {
    test("builds from pathname only", () => {
      expect(buildHref("/articles")).to.equal("/articles");
    });

    test("builds with search params", () => {
      expect(buildHref("/search", { q: "lit", page: "2" })).to.equal("/search?q=lit&page=2");
    });

    test("builds with hash", () => {
      expect(buildHref("/docs", {}, "lifecycle")).to.equal("/docs#lifecycle");
    });

    test("builds full href with all parts", () => {
      expect(buildHref("/orders", { status: "open" }, "details")).to.equal("/orders?status=open#details");
    });

    test("handles empty pathname", () => {
      expect(buildHref("")).to.equal("/");
    });

    test("handles URLSearchParams input", () => {
      const sp = new URLSearchParams({ a: "1", b: "2" });
      expect(buildHref("/list", sp)).to.equal("/list?a=1&b=2");
    });
  });

  suite("locationToHref", () => {
    test("builds href from pathname-only object", () => {
      expect(locationToHref({ pathname: "/home" })).to.equal("/home");
    });

    test("builds full href from pathname, search, and hash", () => {
      expect(
        locationToHref({ pathname: "/search", search: "?q=lit", hash: "#results" }),
      ).to.equal("/search?q=lit#results");
    });

    test("canonicalizes trailing slash in pathname", () => {
      expect(locationToHref({ pathname: "/articles/" })).to.equal("/articles");
    });

    test("defaults to / for missing pathname", () => {
      expect(locationToHref({})).to.equal("/");
    });
  });

  suite("isSameLocation", () => {
    test("returns true for identical URLs", () => {
      expect(isSameLocation("http://localhost/app/flow", "/app/flow")).to.be.true;
    });

    test("returns false for different pathnames", () => {
      expect(isSameLocation("http://localhost/app/flow", "/app/other")).to.be.false;
    });

    test("returns true when search params match in different order", () => {
      expect(isSameLocation("http://localhost/search?a=1&b=2", "/search", { b: "2", a: "1" }))
        .to.be.true;
    });

    test("returns false for different search params", () => {
      expect(isSameLocation("http://localhost/search?q=lit", "/search", { q: "other" })).to.be
        .false;
    });

    test("returns true when hash matches", () => {
      expect(isSameLocation("http://localhost/about#team", "/about", {}, "team")).to.be.true;
    });

    test("returns false when hash differs", () => {
      expect(isSameLocation("http://localhost/about#team", "/about", {}, "contact")).to.be.false;
    });
  });

  suite("joinPaths", () => {
    test("joins base and path segments", () => {
      expect(joinPaths("/app", "settings")).to.equal("/app/settings");
    });

    test("strips leading slash from path", () => {
      expect(joinPaths("/app", "/settings")).to.equal("/app/settings");
    });

    test("returns / when both args are empty", () => {
      expect(joinPaths()).to.equal("/");
      expect(joinPaths("", "")).to.equal("/");
    });

    test("returns base as-is when path is missing", () => {
      expect(joinPaths("/app/flow")).to.equal("/app/flow");
    });

    test("deduplicates overlapping boundary segments", () => {
      expect(joinPaths("/app/flow", "flow/settings")).to.equal("/app/flow/settings");
    });

    test("handles root-only base", () => {
      expect(joinPaths("/", "admin")).to.equal("/admin");
    });

    test("handles nested base", () => {
      expect(joinPaths("/app/flow/step", "edit")).to.equal("/app/flow/step/edit");
    });
  });
});
