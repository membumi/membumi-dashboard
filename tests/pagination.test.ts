import { describe, it, expect } from "vitest";
import { buildListHref, parsePage } from "@/lib/pagination";

describe("pagination — parsePage", () => {
  it("parses a valid page", () => {
    expect(parsePage("3")).toBe(3);
  });
  it("falls back to 1 for missing, zero, negative and non-numeric input", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("")).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-3")).toBe(1);
    expect(parsePage("abc")).toBe(1);
  });
});

describe("pagination — buildListHref", () => {
  it("drops empty values", () => {
    expect(buildListHref("/users", { status: undefined, q: "", page: 2 })).toBe("/users?page=2");
  });
  it("omits page=1 so the first page is the canonical URL", () => {
    expect(buildListHref("/users", { page: 1 })).toBe("/users");
    expect(buildListHref("/users", { status: "PENDING", page: 1 })).toBe("/users?status=PENDING");
  });
  it("returns the bare base when nothing is set", () => {
    expect(buildListHref("/merchants", {})).toBe("/merchants");
  });
  it("keeps every active filter alongside the page", () => {
    expect(buildListHref("/merchants", { status: "VERIFIED", content: "empty", page: 4 })).toBe(
      "/merchants?status=VERIFIED&content=empty&page=4"
    );
  });
});
