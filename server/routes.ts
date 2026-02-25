import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMovieSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await storage.seedMovies();

  app.get("/api/movies", async (_req, res) => {
    try {
      const movies = await storage.getAllMovies();
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
      const movie = await storage.addMovie({ ...parsed, year });
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

      const movie = await storage.getMovieById(id);
      if (!movie) return res.status(404).json({ error: "Not found" });

      const ratingScores = await storage.getRatingsForMovie(id);
      const avgRating = ratingScores.length > 0
        ? Math.round((ratingScores.reduce((a, b) => a + b, 0) / ratingScores.length) * 10) / 10
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

      const movie = await storage.getMovieById(id);
      if (!movie) return res.status(404).json({ error: "Not found" });

      const result = await storage.addRating(id, score);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: "Failed to add rating" });
    }
  });

  return httpServer;
}
