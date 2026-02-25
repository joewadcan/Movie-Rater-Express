import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Star, Calendar, Tag } from "lucide-react";
import type { MovieDetail as MovieDetailType } from "@shared/schema";

function formatStars(score: number): string {
  const rounded = Math.round(score);
  return "★".repeat(rounded) + "☆".repeat(5 - rounded);
}

export default function MovieDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { toast } = useToast();
  const [hoveredStar, setHoveredStar] = useState(0);

  const { data: movie, isLoading } = useQuery<MovieDetailType>({
    queryKey: ["/api/movies", id],
  });

  const rateMutation = useMutation({
    mutationFn: async (score: number) => {
      const res = await apiRequest("POST", `/api/movies/${id}/rate`, { score });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/movies", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/movies"] });
      toast({ title: "Rating submitted", description: "Your rating has been recorded." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-32 mb-8" />
          <Skeleton className="h-10 w-3/4 mb-4" />
          <div className="flex gap-4 mb-8">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center border border-card-border bg-card max-w-sm">
          <h2 className="text-lg font-semibold mb-2 text-foreground">Movie not found</h2>
          <p className="text-sm text-muted-foreground mb-4">
            The movie you're looking for doesn't exist.
          </p>
          <Link href="/">
            <Button data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to list
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/">
          <Button variant="ghost" className="mb-6 -ml-2" data-testid="link-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to list
          </Button>
        </Link>

        <div className="mb-8">
          <h1
            className="text-3xl font-bold tracking-tight text-foreground mb-3"
            data-testid="text-movie-title"
          >
            {movie.title}
          </h1>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span className="text-sm" data-testid="text-movie-year">{movie.year}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Tag className="w-4 h-4" />
              <span className="text-sm" data-testid="text-movie-genre">{movie.genre}</span>
            </div>
          </div>
        </div>

        <Card className="p-6 border border-card-border bg-card mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Average Rating
              </h2>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold text-foreground" data-testid="text-detail-avg">
                  {movie.avgRating > 0 ? movie.avgRating.toFixed(1) : "—"}
                </span>
                <span
                  className="text-2xl text-amber-500 dark:text-amber-400 tracking-wider"
                  data-testid="text-detail-stars"
                >
                  {formatStars(movie.avgRating)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1" data-testid="text-detail-count">
                {movie.totalRatings} {movie.totalRatings === 1 ? "rating" : "ratings"}
              </p>
            </div>
          </div>

          <div className="border-t border-border pt-6">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
              Rate this movie
            </h3>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  data-testid={`button-star-${star}`}
                  onClick={() => rateMutation.mutate(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  disabled={rateMutation.isPending}
                  className="group relative w-12 h-12 flex items-center justify-center rounded-md transition-all duration-150 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Star
                    className={`w-7 h-7 transition-colors duration-150 ${
                      star <= hoveredStar
                        ? "fill-amber-400 text-amber-400"
                        : "fill-none text-muted-foreground/50 group-hover:text-amber-300"
                    }`}
                  />
                </button>
              ))}
            </div>
            {rateMutation.isPending && (
              <p className="text-sm text-muted-foreground mt-3">Submitting your rating...</p>
            )}
          </div>
        </Card>

        {movie.ratings && movie.ratings.length > 0 && (
          <Card className="p-6 border border-card-border bg-card">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
              Rating Distribution
            </h3>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((score) => {
                const count = movie.ratings.filter((r) => r === score).length;
                const percentage = movie.totalRatings > 0 ? (count / movie.totalRatings) * 100 : 0;
                return (
                  <div key={score} className="flex items-center gap-3" data-testid={`bar-rating-${score}`}>
                    <span className="text-sm text-muted-foreground w-3 text-right">{score}</span>
                    <Star className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 fill-amber-500 dark:fill-amber-400" />
                    <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 dark:bg-amber-400 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-6 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
