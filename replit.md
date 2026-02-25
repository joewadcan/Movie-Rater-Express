# Movie Rater

A web app for rating and discovering classic films. Users can browse a collection of movies, view details, and submit star ratings.

## Architecture

- **Frontend:** React 18 with Vite, TypeScript, Tailwind CSS, shadcn/ui components
- **Backend:** Express API (TypeScript)
- **Database:** PostgreSQL via Drizzle ORM
- **Routing:** wouter (client-side)
- **Data fetching:** TanStack React Query

## Structure

```
shared/schema.ts        — Drizzle schema: movies + ratings tables, types
server/
  index.ts              — Express server entry point
  routes.ts             — API routes: /api/movies, /api/movies/:id, /api/movies/:id/rate
  storage.ts            — DatabaseStorage class with all CRUD operations + seeding
client/src/
  App.tsx               — Router setup (/ and /movies/:id)
  pages/
    MovieList.tsx        — Movie list view with add movie form
    MovieDetail.tsx      — Movie detail with star rating + distribution chart
  lib/queryClient.ts    — TanStack Query client + apiRequest helper
```

## Database Tables

- **movies:** id (serial), title, year, genre, created_at
- **ratings:** id (serial), movie_id (FK → movies), score (1-5), created_at

## Key Features

- List view with movie table showing title, year, genre, avg rating, total ratings
- Detail view with large star rating display and rating distribution bars
- Interactive 5-star rating system
- Add movie form with validation
- 10 seeded classic films with sample ratings
