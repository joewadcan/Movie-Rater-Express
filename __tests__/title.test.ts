import { readFileSync } from "fs";
import { resolve } from "path";

describe("App title", () => {
  it("has the correct H1 content in MovieList.tsx", () => {
    const source = readFileSync(
      resolve(__dirname, "../client/src/pages/MovieList.tsx"),
      "utf-8",
    );
    expect(source).toContain("Movie Ratings");
  });
});

describe("Author", () => {
  it("Joe's name is on the homepage", () => {
    const source = readFileSync(
      resolve(__dirname, "../client/src/pages/MovieList.tsx"),
      "utf-8",
    );
    expect(source).toContain("Joe");
  });
});
