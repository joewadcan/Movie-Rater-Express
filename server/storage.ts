import { movies, ratings, type InsertMovie, type Movie, type MovieWithStats, type MovieDetail } from "@shared/schema";
import { eq, sql, desc, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

export interface IStorage {
  getAllMovies(): Promise<MovieWithStats[]>;
  getMovieById(id: number): Promise<Movie | undefined>;
  getRatingsForMovie(movieId: number): Promise<number[]>;
  addMovie(data: InsertMovie): Promise<Movie>;
  addRating(movieId: number, score: number): Promise<{ avgRating: number; totalRatings: number }>;
  seedMovies(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getAllMovies(): Promise<MovieWithStats[]> {
    const result = await db
      .select({
        id: movies.id,
        title: movies.title,
        year: movies.year,
        genre: movies.genre,
        createdAt: movies.createdAt,
        avgRating: sql<number>`COALESCE(ROUND(AVG(${ratings.score})::numeric, 1), 0)`.as("avg_rating"),
        totalRatings: sql<number>`COUNT(${ratings.id})::int`.as("total_ratings"),
      })
      .from(movies)
      .leftJoin(ratings, eq(ratings.movieId, movies.id))
      .groupBy(movies.id)
      .orderBy(asc(movies.title));

    return result.map(r => ({
      ...r,
      avgRating: Number(r.avgRating),
      totalRatings: Number(r.totalRatings),
    }));
  }

  async getMovieById(id: number): Promise<Movie | undefined> {
    const result = await db.select().from(movies).where(eq(movies.id, id));
    return result[0] || undefined;
  }

  async getRatingsForMovie(movieId: number): Promise<number[]> {
    const result = await db
      .select({ score: ratings.score })
      .from(ratings)
      .where(eq(ratings.movieId, movieId))
      .orderBy(desc(ratings.createdAt));
    return result.map(r => r.score);
  }

  async addMovie(data: InsertMovie): Promise<Movie> {
    const result = await db.insert(movies).values(data).returning();
    return result[0];
  }

  async addRating(movieId: number, score: number): Promise<{ avgRating: number; totalRatings: number }> {
    await db.insert(ratings).values({ movieId, score });

    const result = await db
      .select({
        avgRating: sql<number>`ROUND(AVG(${ratings.score})::numeric, 1)`,
        totalRatings: sql<number>`COUNT(${ratings.id})::int`,
      })
      .from(ratings)
      .where(eq(ratings.movieId, movieId));

    return {
      avgRating: Number(result[0].avgRating),
      totalRatings: Number(result[0].totalRatings),
    };
  }

  async seedMovies(): Promise<void> {
    const existing = await db.select({ id: movies.id }).from(movies).limit(1);
    if (existing.length > 0) return;

    const seedData: InsertMovie[] = [
      { title: "The Godfather", year: 1972, genre: "Crime" },
      { title: "Pulp Fiction", year: 1994, genre: "Crime" },
      { title: "The Shawshank Redemption", year: 1994, genre: "Drama" },
      { title: "Schindler's List", year: 1993, genre: "Drama" },
      { title: "2001: A Space Odyssey", year: 1968, genre: "Sci-Fi" },
      { title: "Blade Runner", year: 1982, genre: "Sci-Fi" },
      { title: "Chinatown", year: 1974, genre: "Thriller" },
      { title: "Mulholland Drive", year: 2001, genre: "Thriller" },
      { title: "Singin' in the Rain", year: 1952, genre: "Musical" },
      { title: "Sunset Boulevard", year: 1950, genre: "Drama" },
    ];

    await db.insert(movies).values(seedData);

    const allMovies = await db.select().from(movies);
    const sampleRatings = [
      { movieId: allMovies[0].id, score: 5 },
      { movieId: allMovies[0].id, score: 5 },
      { movieId: allMovies[0].id, score: 4 },
      { movieId: allMovies[1].id, score: 4 },
      { movieId: allMovies[1].id, score: 5 },
      { movieId: allMovies[2].id, score: 5 },
      { movieId: allMovies[2].id, score: 5 },
      { movieId: allMovies[2].id, score: 5 },
      { movieId: allMovies[3].id, score: 5 },
      { movieId: allMovies[3].id, score: 4 },
      { movieId: allMovies[4].id, score: 4 },
      { movieId: allMovies[4].id, score: 3 },
      { movieId: allMovies[5].id, score: 4 },
      { movieId: allMovies[5].id, score: 4 },
      { movieId: allMovies[5].id, score: 5 },
      { movieId: allMovies[6].id, score: 3 },
      { movieId: allMovies[7].id, score: 4 },
      { movieId: allMovies[7].id, score: 3 },
      { movieId: allMovies[8].id, score: 5 },
      { movieId: allMovies[8].id, score: 4 },
      { movieId: allMovies[8].id, score: 5 },
      { movieId: allMovies[9].id, score: 4 },
      { movieId: allMovies[9].id, score: 3 },
    ];

    await db.insert(ratings).values(sampleRatings);
  }
}

export const storage = new DatabaseStorage();
