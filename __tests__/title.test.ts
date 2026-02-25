import { readFileSync } from "fs";
import { resolve } from "path";

describe("App title", () => {
  it("has the correct title in index.html", () => {
    const html = readFileSync(resolve(__dirname, "../client/index.html"), "utf-8");
    expect(html).toContain("<title>Movie Rater - Rate and Discover Classic Films</title>");
  });
});
