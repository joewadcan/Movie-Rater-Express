import express from "express";
import { createServer } from "http";
import type { Server } from "http";
import type { IStorage } from "../server/storage";
import type { Movie, MovieWithStats, InsertMovie } from "@shared/schema";

const mockMovies: Movie[] = [
  { id: 1, title: "The Godfather", year: 1972, genre: "Crime", createdAt: new Date() },
  { id: 2, title: "Pulp Fiction", year: 1994, genre: "Crime", createdAt: new Date() },
  { id: 3, title: "The Shawshank Redemption", year: 1994, genre: "Drama", createdAt: new Date() },
];

const mockMoviesWithStats: MovieWithStats[] = mockMovies.map((m) => ({
  ...m,
  avgRating: 4.5,
  totalRatings: 2,
}));

function createMockStorage(overrides: Partial<IStorage> = {}): IStorage {
  return {
    getAllMovies: jest.fn().mockResolvedValue(mockMoviesWithStats),
    getMovieById: jest.fn().mockImplementation(async (id: number) => {
      return mockMovies.find((m) => m.id === id) || undefined;
    }),
    getRatingsForMovie: jest.fn().mockResolvedValue([4, 5]),
    addMovie: jest.fn().mockImplementation(async (data: InsertMovie) => ({
      id: 99,
      ...data,
      createdAt: new Date(),
    })),
    addRating: jest.fn().mockResolvedValue({ avgRating: 4.3, totalRatings: 3 }),
    seedMovies: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

async function createTestApp(mockStorage: IStorage) {
  const app = express();
  app.use(express.json());

  const { insertMovieSchema } = await import("@shared/schema");
  const { z } = await import("zod");

  await mockStorage.seedMovies();

  app.get("/api/movies", async (_req, res) => {
    try {
      const movies = await mockStorage.getAllMovies();
      res.json(movies);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch movies" });
    }
  });

  app.post("/api/movies", async (req, res) => {
    try {
      const parsed = insertMovieSchema.parse(req.body);
      const year = Number(parsed.year);
      if (!Number.isInteger(year) || year < 1888 || year > new Date().getFullYear()) {
        return res.status(400).json({ error: "Invalid year" });
      }
      const movie = await mockStorage.addMovie({ ...parsed, year });
      res.status(201).json(movie);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid fields" });
      }
      res.status(500).json({ error: "Failed to add movie" });
    }
  });

  app.get("/api/movies/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

      const movie = await mockStorage.getMovieById(id);
      if (!movie) return res.status(404).json({ error: "Not found" });

      const ratingScores = await mockStorage.getRatingsForMovie(id);
      const avgRating =
        ratingScores.length > 0
          ? Math.round((ratingScores.reduce((a: number, b: number) => a + b, 0) / ratingScores.length) * 10) / 10
          : 0;

      res.json({
        ...movie,
        avgRating,
        totalRatings: ratingScores.length,
        ratings: ratingScores,
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch movie" });
    }
  });

  app.post("/api/movies/:id/rate", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const score = Number(req.body.score);

      if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
      if (!Number.isInteger(score) || score < 1 || score > 5) {
        return res.status(400).json({ error: "Invalid rating" });
      }

      const movie = await mockStorage.getMovieById(id);
      if (!movie) return res.status(404).json({ error: "Not found" });

      const result = await mockStorage.addRating(id, score);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: "Failed to add rating" });
    }
  });

  return app;
}

function request(app: express.Express, method: string, url: string, body?: any): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        server.close();
        return reject(new Error("Could not get server address"));
      }
      const port = addr.port;
      const options: RequestInit = {
        method: method.toUpperCase(),
        headers: body ? { "Content-Type": "application/json" } : {},
        body: body ? JSON.stringify(body) : undefined,
      };

      fetch(`http://127.0.0.1:${port}${url}`, options)
        .then(async (res) => {
          const json = await res.json().catch(() => null);
          server.close();
          resolve({ status: res.status, body: json });
        })
        .catch((err) => {
          server.close();
          reject(err);
        });
    });
  });
}

describe("GET /api/movies", () => {
  it("returns list of movies with stats", async () => {
    const storage = createMockStorage();
    const app = await createTestApp(storage);
    const res = await request(app, "GET", "/api/movies");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(3);
    expect(res.body[0]).toHaveProperty("title");
    expect(res.body[0]).toHaveProperty("avgRating");
    expect(res.body[0]).toHaveProperty("totalRatings");
  });

  it("returns empty array when no movies", async () => {
    const storage = createMockStorage({ getAllMovies: jest.fn().mockResolvedValue([]) });
    const app = await createTestApp(storage);
    const res = await request(app, "GET", "/api/movies");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns 500 when storage throws", async () => {
    const storage = createMockStorage({
      getAllMovies: jest.fn().mockRejectedValue(new Error("DB error")),
    });
    const app = await createTestApp(storage);
    const res = await request(app, "GET", "/api/movies");

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Failed to fetch movies");
  });
});

describe("POST /api/movies", () => {
  it("creates a movie with valid data", async () => {
    const storage = createMockStorage();
    const app = await createTestApp(storage);
    const res = await request(app, "POST", "/api/movies", {
      title: "Casablanca",
      year: 1942,
      genre: "Drama",
    });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe("Casablanca");
    expect(res.body.year).toBe(1942);
    expect(res.body.genre).toBe("Drama");
    expect(storage.addMovie).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Casablanca", year: 1942, genre: "Drama" })
    );
  });

  it("rejects missing title", async () => {
    const storage = createMockStorage();
    const app = await createTestApp(storage);
    const res = await request(app, "POST", "/api/movies", {
      year: 1942,
      genre: "Drama",
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid fields");
    expect(storage.addMovie).not.toHaveBeenCalled();
  });

  it("rejects empty title", async () => {
    const storage = createMockStorage();
    const app = await createTestApp(storage);
    const res = await request(app, "POST", "/api/movies", {
      title: "",
      year: 1942,
      genre: "Drama",
    });

    expect(res.status).toBe(400);
    expect(storage.addMovie).not.toHaveBeenCalled();
  });

  it("rejects missing year", async () => {
    const storage = createMockStorage();
    const app = await createTestApp(storage);
    const res = await request(app, "POST", "/api/movies", {
      title: "Casablanca",
      genre: "Drama",
    });

    expect(res.status).toBe(400);
    expect(storage.addMovie).not.toHaveBeenCalled();
  });

  it("rejects missing genre", async () => {
    const storage = createMockStorage();
    const app = await createTestApp(storage);
    const res = await request(app, "POST", "/api/movies", {
      title: "Casablanca",
      year: 1942,
    });

    expect(res.status).toBe(400);
    expect(storage.addMovie).not.toHaveBeenCalled();
  });

  it("rejects empty genre", async () => {
    const storage = createMockStorage();
    const app = await createTestApp(storage);
    const res = await request(app, "POST", "/api/movies", {
      title: "Casablanca",
      year: 1942,
      genre: "",
    });

    expect(res.status).toBe(400);
    expect(storage.addMovie).not.toHaveBeenCalled();
  });

  it("rejects empty body", async () => {
    const storage = createMockStorage();
    const app = await createTestApp(storage);
    const res = await request(app, "POST", "/api/movies", {});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid fields");
  });

  it("rejects year before 1888", async () => {
    const storage = createMockStorage();
    const app = await createTestApp(storage);
    const res = await request(app, "POST", "/api/movies", {
      title: "Early Film",
      year: 1887,
      genre: "Drama",
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid year");
    expect(storage.addMovie).not.toHaveBeenCalled();
  });

  it("rejects year in the future", async () => {
    const storage = createMockStorage();
    const app = await createTestApp(storage);
    const res = await request(app, "POST", "/api/movies", {
      title: "Future Film",
      year: new Date().getFullYear() + 1,
      genre: "Sci-Fi",
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid year");
    expect(storage.addMovie).not.toHaveBeenCalled();
  });

  it("accepts year 1888 (first known film)", async () => {
    const storage = createMockStorage();
    const app = await createTestApp(storage);
    const res = await request(app, "POST", "/api/movies", {
      title: "Roundhay Garden Scene",
      year: 1888,
      genre: "Short",
    });

    expect(res.status).toBe(201);
    expect(storage.addMovie).toHaveBeenCalled();
  });

  it("accepts current year", async () => {
    const storage = createMockStorage();
    const app = await createTestApp(storage);
    const res = await request(app, "POST", "/api/movies", {
      title: "New Film",
      year: new Date().getFullYear(),
      genre: "Drama",
    });

    expect(res.status).toBe(201);
    expect(storage.addMovie).toHaveBeenCalled();
  });

  it("rejects non-integer year (decimal)", async () => {
    const storage = createMockStorage();
    const app = await createTestApp(storage);
    const res = await request(app, "POST", "/api/movies", {
      title: "Decimal Year",
      year: 1999.5,
      genre: "Drama",
    });

    expect(res.status).toBe(400);
    expect(storage.addMovie).not.toHaveBeenCalled();
  });

  it("returns 500 when storage.addMovie throws", async () => {
    const storage = createMockStorage({
      addMovie: jest.fn().mockRejectedValue(new Error("DB error")),
    });
    const app = await createTestApp(storage);
    const res = await request(app, "POST", "/api/movies", {
      title: "Some Movie",
      year: 2000,
      genre: "Action",
    });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Failed to add movie");
  });
});

describe("GET /api/movies/:id", () => {
  it("returns movie with ratings for valid id", async () => {
    const storage = createMockStorage();
    const app = await createTestApp(storage);
    const res = await request(app, "GET", "/api/movies/1");

    expect(res.status).toBe(200);
    expect(res.body.title).toBe("The Godfather");
    expect(res.body.avgRating).toBe(4.5);
    expect(res.body.totalRatings).toBe(2);
    expect(res.body.ratings).toEqual([4, 5]);
  });

  it("returns 404 for non-existent movie", async () => {
    const storage = createMockStorage();
    const app = await createTestApp(storage);
    const res = await request(app, "GET", "/api/movies/999");

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Not found");
  });

  it("returns 400 for non-numeric id", async () => {
    const storage = createMockStorage();
    const app = await createTestApp(storage);
    const res = await request(app, "GET", "/api/movies/abc");

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid ID");
  });

  it("returns avgRating 0 for movie with no ratings", async () => {
    const storage = createMockStorage({
      getRatingsForMovie: jest.fn().mockResolvedValue([]),
    });
    const app = await createTestApp(storage);
    const res = await request(app, "GET", "/api/movies/1");

    expect(res.status).toBe(200);
    expect(res.body.avgRating).toBe(0);
    expect(res.body.totalRatings).toBe(0);
    expect(res.body.ratings).toEqual([]);
  });

  it("correctly computes average from rating scores", async () => {
    const storage = createMockStorage({
      getRatingsForMovie: jest.fn().mockResolvedValue([5, 4, 3, 2, 1]),
    });
    const app = await createTestApp(storage);
    const res = await request(app, "GET", "/api/movies/1");

    expect(res.status).toBe(200);
    expect(res.body.avgRating).toBe(3);
    expect(res.body.totalRatings).toBe(5);
  });

  it("rounds average to 1 decimal place", async () => {
    const storage = createMockStorage({
      getRatingsForMovie: jest.fn().mockResolvedValue([5, 4, 4]),
    });
    const app = await createTestApp(storage);
    const res = await request(app, "GET", "/api/movies/1");

    expect(res.status).toBe(200);
    expect(res.body.avgRating).toBe(4.3);
  });

  it("returns 500 when storage throws", async () => {
    const storage = createMockStorage({
      getMovieById: jest.fn().mockRejectedValue(new Error("DB error")),
    });
    const app = await createTestApp(storage);
    const res = await request(app, "GET", "/api/movies/1");

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Failed to fetch movie");
  });
});

describe("POST /api/movies/:id/rate", () => {
  it("accepts valid rating (score 1)", async () => {
    const storage = createMockStorage();
    const app = await createTestApp(storage);
    const res = await request(app, "POST", "/api/movies/1/rate", { score: 1 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("avgRating");
    expect(res.body).toHaveProperty("totalRatings");
    expect(storage.addRating).toHaveBeenCalledWith(1, 1);
  });

  it("accepts valid rating (score 5)", async () => {
    const storage = createMockStorage();
    const app = await createTestApp(storage);
    const res = await request(app, "POST", "/api/movies/1/rate", { score: 5 });

    expect(res.status).toBe(200);
    expect(storage.addRating).toHaveBeenCalledWith(1, 5);
  });

  it("accepts valid rating (score 3)", async () => {
    const storage = createMockStorage();
    const app = await createTestApp(storage);
    const res = await request(app, "POST", "/api/movies/2/rate", { score: 3 });

    expect(res.status).toBe(200);
    expect(storage.addRating).toHaveBeenCalledWith(2, 3);
  });

  it("rejects score 0", async () => {
    const storage = createMockStorage();
    const app = await createTestApp(storage);
    const res = await request(app, "POST", "/api/movies/1/rate", { score: 0 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid rating");
    expect(storage.addRating).not.toHaveBeenCalled();
  });

  it("rejects score 6", async () => {
    const storage = createMockStorage();
    const app = await createTestApp(storage);
    const res = await request(app, "POST", "/api/movies/1/rate", { score: 6 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid rating");
    expect(storage.addRating).not.toHaveBeenCalled();
  });

  it("rejects negative score", async () => {
    const storage = createMockStorage();
    const app = await createTestApp(storage);
    const res = await request(app, "POST", "/api/movies/1/rate", { score: -1 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid rating");
  });

  it("rejects decimal score", async () => {
    const storage = createMockStorage();
    const app = await createTestApp(storage);
    const res = await request(app, "POST", "/api/movies/1/rate", { score: 3.5 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid rating");
    expect(storage.addRating).not.toHaveBeenCalled();
  });

  it("rejects missing score", async () => {
    const storage = createMockStorage();
    const app = await createTestApp(storage);
    const res = await request(app, "POST", "/api/movies/1/rate", {});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid rating");
  });

  it("rejects non-numeric score", async () => {
    const storage = createMockStorage();
    const app = await createTestApp(storage);
    const res = await request(app, "POST", "/api/movies/1/rate", { score: "great" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid rating");
  });

  it("rejects null score", async () => {
    const storage = createMockStorage();
    const app = await createTestApp(storage);
    const res = await request(app, "POST", "/api/movies/1/rate", { score: null });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid rating");
  });

  it("returns 404 for non-existent movie", async () => {
    const storage = createMockStorage();
    const app = await createTestApp(storage);
    const res = await request(app, "POST", "/api/movies/999/rate", { score: 4 });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Not found");
    expect(storage.addRating).not.toHaveBeenCalled();
  });

  it("returns 400 for non-numeric movie id", async () => {
    const storage = createMockStorage();
    const app = await createTestApp(storage);
    const res = await request(app, "POST", "/api/movies/abc/rate", { score: 4 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid ID");
  });

  it("returns 500 when storage.addRating throws", async () => {
    const storage = createMockStorage({
      addRating: jest.fn().mockRejectedValue(new Error("DB error")),
    });
    const app = await createTestApp(storage);
    const res = await request(app, "POST", "/api/movies/1/rate", { score: 4 });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Failed to add rating");
  });
});

describe("seed behavior", () => {
  it("calls seedMovies on app creation", async () => {
    const storage = createMockStorage();
    await createTestApp(storage);
    expect(storage.seedMovies).toHaveBeenCalledTimes(1);
  });
});
