import { insertMovieSchema, insertRatingSchema } from "@shared/schema";

describe("insertMovieSchema", () => {
  it("accepts valid movie data", () => {
    const result = insertMovieSchema.safeParse({
      title: "Casablanca",
      year: 1942,
      genre: "Drama",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing title", () => {
    const result = insertMovieSchema.safeParse({
      year: 1942,
      genre: "Drama",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty string title", () => {
    const result = insertMovieSchema.safeParse({
      title: "",
      year: 1942,
      genre: "Drama",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing year", () => {
    const result = insertMovieSchema.safeParse({
      title: "Casablanca",
      genre: "Drama",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing genre", () => {
    const result = insertMovieSchema.safeParse({
      title: "Casablanca",
      year: 1942,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty string genre", () => {
    const result = insertMovieSchema.safeParse({
      title: "Casablanca",
      year: 1942,
      genre: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects null title", () => {
    const result = insertMovieSchema.safeParse({
      title: null,
      year: 1942,
      genre: "Drama",
    });
    expect(result.success).toBe(false);
  });

  it("rejects null year", () => {
    const result = insertMovieSchema.safeParse({
      title: "Casablanca",
      year: null,
      genre: "Drama",
    });
    expect(result.success).toBe(false);
  });

  it("rejects null genre", () => {
    const result = insertMovieSchema.safeParse({
      title: "Casablanca",
      year: 1942,
      genre: null,
    });
    expect(result.success).toBe(false);
  });

  it("rejects completely empty object", () => {
    const result = insertMovieSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects undefined input", () => {
    const result = insertMovieSchema.safeParse(undefined);
    expect(result.success).toBe(false);
  });

  it("rejects non-numeric year", () => {
    const result = insertMovieSchema.safeParse({
      title: "Casablanca",
      year: "not a year",
      genre: "Drama",
    });
    expect(result.success).toBe(false);
  });

  it("ignores extra fields", () => {
    const result = insertMovieSchema.safeParse({
      title: "Casablanca",
      year: 1942,
      genre: "Drama",
      director: "Michael Curtiz",
    });
    expect(result.success).toBe(true);
  });

  it("strips id if provided", () => {
    const result = insertMovieSchema.safeParse({
      id: 999,
      title: "Casablanca",
      year: 1942,
      genre: "Drama",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).id).toBeUndefined();
    }
  });
});

describe("insertRatingSchema", () => {
  it("accepts valid rating data", () => {
    const result = insertRatingSchema.safeParse({
      movieId: 1,
      score: 4,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing movieId", () => {
    const result = insertRatingSchema.safeParse({
      score: 4,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing score", () => {
    const result = insertRatingSchema.safeParse({
      movieId: 1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects null score", () => {
    const result = insertRatingSchema.safeParse({
      movieId: 1,
      score: null,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty object", () => {
    const result = insertRatingSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects non-numeric movieId", () => {
    const result = insertRatingSchema.safeParse({
      movieId: "abc",
      score: 4,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-numeric score", () => {
    const result = insertRatingSchema.safeParse({
      movieId: 1,
      score: "great",
    });
    expect(result.success).toBe(false);
  });
});
