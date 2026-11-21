export type ShowStatus = "watching" | "watchlist" | "stopped";
export type MovieStatus = "watchlist" | "watched";

export type ShowRow = {
  user_id: string;
  tmdb_id: number;
  status: ShowStatus;
  title: string;
  year: string | null;
  poster_url: string | null;
  genres: string[];
  rating: number | null;
  imdb_id?: string | null;
  created_at: string;
  updated_at: string;
};

export type EpisodeWatchRow = {
  user_id: string;
  show_tmdb_id: number;
  season_number: number;
  episode_number: number;
  name: string;
  runtime_minutes: number | null;
  rating: number | null;
  note: string | null;
  imdb_id?: string | null;
  watched_at: string;
};

export type MovieRow = {
  user_id: string;
  tmdb_id: number;
  status: MovieStatus;
  title: string;
  year: string | null;
  poster_url: string | null;
  genres: string[];
  runtime_minutes: number | null;
  watched_on: string | null;
  rating: number | null;
  note: string | null;
  imdb_id?: string | null;
  created_at: string;
  updated_at: string;
};

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      tracked_shows: Table<
        ShowRow,
        {
          user_id: string;
          tmdb_id: number;
          status: ShowStatus;
          title: string;
          year?: string | null;
          poster_url?: string | null;
          genres?: string[];
          rating?: number | null;
          imdb_id?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        {
          status?: ShowStatus;
          title?: string;
          year?: string | null;
          poster_url?: string | null;
          genres?: string[];
          rating?: number | null;
          imdb_id?: string | null;
          updated_at?: string;
        }
      >;
      episode_watches: Table<
        EpisodeWatchRow,
        {
          user_id: string;
          show_tmdb_id: number;
          season_number: number;
          episode_number: number;
          name: string;
          runtime_minutes?: number | null;
          rating?: number | null;
          note?: string | null;
          imdb_id?: string | null;
          watched_at?: string;
        },
        {
          name?: string;
          runtime_minutes?: number | null;
          rating?: number | null;
          note?: string | null;
          imdb_id?: string | null;
        }
      >;
      tracked_movies: Table<
        MovieRow,
        {
          user_id: string;
          tmdb_id: number;
          status: MovieStatus;
          title: string;
          year?: string | null;
          poster_url?: string | null;
          genres?: string[];
          runtime_minutes?: number | null;
          watched_on?: string | null;
          rating?: number | null;
          note?: string | null;
          imdb_id?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        {
          status?: MovieStatus;
          title?: string;
          year?: string | null;
          poster_url?: string | null;
          genres?: string[];
          runtime_minutes?: number | null;
          watched_on?: string | null;
          rating?: number | null;
          note?: string | null;
          imdb_id?: string | null;
          updated_at?: string;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
