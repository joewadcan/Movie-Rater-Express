import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Film, Plus, Star, X, ChevronRight } from "lucide-react";
import type { MovieWithStats } from "@shared/schema";

function formatStars(score: number): string {
  const rounded = Math.round(score);
  return "★".repeat(rounded) + "☆".repeat(5 - rounded);
}

function GenreBadge({ genre }: { genre: string }) {
  const colorMap: Record<string, string> = {
    Crime: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    Drama: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    "Sci-Fi": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    Thriller: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    Musical: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  };
  const colors = colorMap[genre] || "bg-muted text-muted-foreground";
  return (
    <span
      data-testid={`badge-genre-${genre.toLowerCase()}`}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${colors}`}
    >
      {genre}
    </span>
  );
}

function RatingDisplay({ avgRating, totalRatings }: { avgRating: number; totalRatings: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-amber-500 dark:text-amber-400 text-sm tracking-wide" data-testid="text-stars">
        {formatStars(avgRating)}
      </span>
      <span className="text-sm font-medium text-foreground" data-testid="text-avg-rating">
        {avgRating > 0 ? avgRating.toFixed(1) : "—"}
      </span>
      <span className="text-xs text-muted-foreground" data-testid="text-total-ratings">
        ({totalRatings})
      </span>
    </div>
  );
}

export default function MovieList() {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [year, setYear] = useState("");
  const [genre, setGenre] = useState("");
  const { toast } = useToast();

  const { data: movies, isLoading } = useQuery<MovieWithStats[]>({
    queryKey: ["/api/movies"],
  });

  const addMovieMutation = useMutation({
    mutationFn: async (data: { title: string; year: number; genre: string }) => {
      const res = await apiRequest("POST", "/api/movies", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/movies"] });
      setShowForm(false);
      setTitle("");
      setYear("");
      setGenre("");
      toast({ title: "Movie added", description: "The movie has been added to the list." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !year.trim() || !genre.trim()) return;
    addMovieMutation.mutate({ title: title.trim(), year: Number(year), genre: genre.trim() });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
              <Film className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground" data-testid="text-page-title">
                Movie Rater
              </h1>
              <p className="text-sm text-muted-foreground">Rate and discover classic films</p>
            </div>
          </div>
          <Button
            data-testid="button-add-movie"
            onClick={() => setShowForm(!showForm)}
            variant={showForm ? "secondary" : "default"}
          >
            {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            {showForm ? "Cancel" : "Add Movie"}
          </Button>
        </div>

        {showForm && (
          <Card className="mb-6 p-6 border border-card-border bg-card">
            <h2 className="text-lg font-semibold mb-4 text-foreground">Add a New Movie</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  data-testid="input-title"
                  placeholder="e.g. Casablanca"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  data-testid="input-year"
                  type="number"
                  placeholder="e.g. 1942"
                  min={1888}
                  max={new Date().getFullYear()}
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="genre">Genre</Label>
                <Input
                  id="genre"
                  data-testid="input-genre"
                  placeholder="e.g. Drama"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  required
                />
              </div>
              <div className="sm:col-span-3 flex justify-end">
                <Button
                  type="submit"
                  data-testid="button-submit-movie"
                  disabled={addMovieMutation.isPending}
                >
                  {addMovieMutation.isPending ? "Adding..." : "Add Movie"}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="p-4 border border-card-border bg-card">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-5 w-12" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-32 ml-auto" />
                </div>
              </Card>
            ))}
          </div>
        ) : movies && movies.length > 0 ? (
          <div className="space-y-2">
            <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <div className="col-span-5">Title</div>
              <div className="col-span-1 text-center">Year</div>
              <div className="col-span-2 text-center">Genre</div>
              <div className="col-span-3 text-center">Rating</div>
              <div className="col-span-1"></div>
            </div>
            {movies.map((movie) => (
              <Link key={movie.id} href={`/movies/${movie.id}`}>
                <Card
                  data-testid={`card-movie-${movie.id}`}
                  className="p-4 border border-card-border bg-card hover-elevate cursor-pointer transition-colors"
                >
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-12 sm:col-span-5">
                      <span className="font-medium text-foreground" data-testid={`text-title-${movie.id}`}>
                        {movie.title}
                      </span>
                    </div>
                    <div className="col-span-4 sm:col-span-1 text-center">
                      <span className="text-sm text-muted-foreground" data-testid={`text-year-${movie.id}`}>
                        {movie.year}
                      </span>
                    </div>
                    <div className="col-span-4 sm:col-span-2 text-center">
                      <GenreBadge genre={movie.genre} />
                    </div>
                    <div className="col-span-3 sm:col-span-3 flex justify-center">
                      <RatingDisplay avgRating={movie.avgRating} totalRatings={movie.totalRatings} />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center border border-card-border bg-card">
            <Film className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium text-foreground mb-2">No movies yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Get started by adding your first movie to rate.
            </p>
            <Button data-testid="button-add-first-movie" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Movie
            </Button>
          </Card>
        )}

        {movies && movies.length > 0 && (
          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              {movies.length} {movies.length === 1 ? "movie" : "movies"} in collection
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
