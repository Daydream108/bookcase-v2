export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          display_name: string | null
          avatar_url: string | null
          bio: string | null
          website: string | null
          location: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          website?: string | null
          location?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          username?: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          website?: string | null
          location?: string | null
          updated_at?: string
        }
      }
      books: {
        Row: {
          id: string
          title: string
          subtitle: string | null
          isbn: string | null
          cover_url: string | null
          description: string | null
          published_year: number | null
          page_count: number | null
          language: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          subtitle?: string | null
          isbn?: string | null
          cover_url?: string | null
          description?: string | null
          published_year?: number | null
          page_count?: number | null
          language?: string
          created_at?: string
        }
        Update: {
          title?: string
          subtitle?: string | null
          isbn?: string | null
          cover_url?: string | null
          description?: string | null
          published_year?: number | null
          page_count?: number | null
          language?: string
        }
      }
      authors: {
        Row: {
          id: string
          name: string
          bio: string | null
          photo_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          bio?: string | null
          photo_url?: string | null
          created_at?: string
        }
        Update: {
          name?: string
          bio?: string | null
          photo_url?: string | null
        }
      }
      book_authors: {
        Row: {
          book_id: string
          author_id: string
          role: string
        }
        Insert: {
          book_id: string
          author_id: string
          role?: string
        }
        Update: {
          role?: string
        }
      }
      genres: {
        Row: {
          id: string
          name: string
          slug: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
        }
        Update: {
          name?: string
          slug?: string
        }
      }
      book_genres: {
        Row: {
          book_id: string
          genre_id: string
        }
        Insert: {
          book_id: string
          genre_id: string
        }
        Update: Record<string, never>
      }
      user_books: {
        Row: {
          id: string
          user_id: string
          book_id: string
          status: ReadingStatus
          rating: number | null
          started_at: string | null
          finished_at: string | null
          is_reread: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          book_id: string
          status: ReadingStatus
          rating?: number | null
          started_at?: string | null
          finished_at?: string | null
          is_reread?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          status?: ReadingStatus
          rating?: number | null
          started_at?: string | null
          finished_at?: string | null
          is_reread?: boolean
          updated_at?: string
        }
      }
      reviews: {
        Row: {
          id: string
          user_id: string
          book_id: string
          user_book_id: string | null
          body: string
          rating: number | null
          contains_spoiler: boolean
          liked_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          book_id: string
          user_book_id?: string | null
          body: string
          rating?: number | null
          contains_spoiler?: boolean
          liked_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          body?: string
          rating?: number | null
          contains_spoiler?: boolean
          updated_at?: string
        }
      }
      lists: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          description?: string | null
          is_public?: boolean
          updated_at?: string
        }
      }
      list_items: {
        Row: {
          id: string
          list_id: string
          book_id: string
          position: number
          note: string | null
          added_at: string
        }
        Insert: {
          id?: string
          list_id: string
          book_id: string
          position?: number
          note?: string | null
          added_at?: string
        }
        Update: {
          position?: number
          note?: string | null
        }
      }
      follows: {
        Row: {
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: Record<string, never>
      }
      likes: {
        Row: {
          id: string
          user_id: string
          review_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          review_id: string
          created_at?: string
        }
        Update: Record<string, never>
      }
      activity_events: {
        Row: {
          id: string
          user_id: string
          event_type: ActivityEventType
          book_id: string | null
          review_id: string | null
          list_id: string | null
          user_book_id: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_type: ActivityEventType
          book_id?: string | null
          review_id?: string | null
          list_id?: string | null
          user_book_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: Record<string, never>
      }
      clubs: {
        Row: {
          id: string
          owner_id: string
          name: string
          description: string | null
          cover_url: string | null
          is_public: boolean
          current_book_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          description?: string | null
          cover_url?: string | null
          is_public?: boolean
          current_book_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          description?: string | null
          cover_url?: string | null
          is_public?: boolean
          current_book_id?: string | null
          updated_at?: string
        }
      }
      club_members: {
        Row: {
          club_id: string
          user_id: string
          role: 'owner' | 'moderator' | 'member'
          joined_at: string
        }
        Insert: {
          club_id: string
          user_id: string
          role?: 'owner' | 'moderator' | 'member'
          joined_at?: string
        }
        Update: {
          role?: 'owner' | 'moderator' | 'member'
        }
      }
      club_posts: {
        Row: {
          id: string
          club_id: string
          user_id: string
          book_id: string | null
          title: string
          body: string
          is_pinned: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          club_id: string
          user_id: string
          book_id?: string | null
          title: string
          body: string
          is_pinned?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          body?: string
          is_pinned?: boolean
          updated_at?: string
        }
      }
      club_comments: {
        Row: {
          id: string
          post_id: string
          user_id: string
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          body: string
          created_at?: string
        }
        Update: {
          body?: string
        }
      }
      reading_sessions: {
        Row: {
          id: string
          user_id: string
          book_id: string | null
          pages_read: number | null
          minutes_read: number | null
          session_date: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          book_id?: string | null
          pages_read?: number | null
          minutes_read?: number | null
          session_date?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          pages_read?: number | null
          minutes_read?: number | null
          notes?: string | null
        }
      }
      reading_stats: {
        Row: {
          user_id: string
          total_pages_read: number
          total_minutes_read: number
          total_sessions: number
          active_days: number
          pages_this_week: number
          minutes_this_week: number
          pages_this_month: number
          minutes_this_month: number
          books_completed_this_year: number
          updated_at: string
        }
        Insert: {
          user_id: string
          total_pages_read?: number
          total_minutes_read?: number
          total_sessions?: number
          active_days?: number
          pages_this_week?: number
          minutes_this_week?: number
          pages_this_month?: number
          minutes_this_month?: number
          books_completed_this_year?: number
          updated_at?: string
        }
        Update: {
          total_pages_read?: number
          total_minutes_read?: number
          total_sessions?: number
          active_days?: number
          pages_this_week?: number
          minutes_this_week?: number
          pages_this_month?: number
          minutes_this_month?: number
          books_completed_this_year?: number
          updated_at?: string
        }
      }
      streaks: {
        Row: {
          user_id: string
          current_streak: number
          longest_streak: number
          last_activity_date: string | null
          current_milestone: string | null
          updated_at: string
        }
        Insert: {
          user_id: string
          current_streak?: number
          longest_streak?: number
          last_activity_date?: string | null
          current_milestone?: string | null
          updated_at?: string
        }
        Update: {
          current_streak?: number
          longest_streak?: number
          last_activity_date?: string | null
          current_milestone?: string | null
          updated_at?: string
        }
      }
      reading_goals: {
        Row: {
          user_id: string
          year: number
          book_goal: number
          page_goal: number
          minute_goal: number
          books_completed: number
          pages_completed: number
          minutes_completed: number
          completed_at: string | null
          updated_at: string
        }
        Insert: {
          user_id: string
          year: number
          book_goal?: number
          page_goal?: number
          minute_goal?: number
          books_completed?: number
          pages_completed?: number
          minutes_completed?: number
          completed_at?: string | null
          updated_at?: string
        }
        Update: {
          book_goal?: number
          page_goal?: number
          minute_goal?: number
          books_completed?: number
          pages_completed?: number
          minutes_completed?: number
          completed_at?: string | null
          updated_at?: string
        }
      }
      badges: {
        Row: {
          id: string
          user_id: string
          badge_key: string
          title: string
          description: string | null
          icon: string
          metadata: Json
          unlocked_at: string
        }
        Insert: {
          id?: string
          user_id: string
          badge_key: string
          title: string
          description?: string | null
          icon?: string
          metadata?: Json
          unlocked_at?: string
        }
        Update: {
          title?: string
          description?: string | null
          icon?: string
          metadata?: Json
          unlocked_at?: string
        }
      }
      book_posts: {
        Row: {
          id: string
          book_id: string
          user_id: string
          title: string
          body: string | null
          post_type: 'discussion' | 'question' | 'recommendation' | 'spoiler'
          contains_spoiler: boolean
          upvotes: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          book_id: string
          user_id: string
          title: string
          body?: string | null
          post_type?: 'discussion' | 'question' | 'recommendation' | 'spoiler'
          contains_spoiler?: boolean
          upvotes?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          body?: string | null
          post_type?: 'discussion' | 'question' | 'recommendation' | 'spoiler'
          contains_spoiler?: boolean
          upvotes?: number
          updated_at?: string
        }
      }
      book_post_comments: {
        Row: {
          id: string
          post_id: string
          user_id: string
          parent_id: string | null
          body: string
          contains_spoiler: boolean
          upvotes: number
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          parent_id?: string | null
          body: string
          contains_spoiler?: boolean
          upvotes?: number
          created_at?: string
        }
        Update: {
          body?: string
          contains_spoiler?: boolean
          upvotes?: number
        }
      }
      book_post_upvotes: {
        Row: {
          user_id: string
          post_id: string
          vote_value: number
          created_at: string
        }
        Insert: {
          user_id: string
          post_id: string
          vote_value?: number
          created_at?: string
        }
        Update: {
          vote_value?: number
        }
      }
      favorite_books: {
        Row: {
          id: string
          user_id: string
          book_id: string
          position: number
          added_at: string
        }
        Insert: {
          id?: string
          user_id: string
          book_id: string
          position?: number
          added_at?: string
        }
        Update: {
          book_id?: string
          position?: number
        }
      }
      blocked_users: {
        Row: {
          user_id: string
          blocked_user_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          blocked_user_id: string
          created_at?: string
        }
        Update: Record<string, never>
      }
      blocked_authors: {
        Row: {
          user_id: string
          author_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          author_id: string
          created_at?: string
        }
        Update: Record<string, never>
      }
      blocked_tags: {
        Row: {
          user_id: string
          tag_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          tag_id: string
          created_at?: string
        }
        Update: Record<string, never>
      }
      review_saves: {
        Row: {
          user_id: string
          review_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          review_id: string
          created_at?: string
        }
        Update: Record<string, never>
      }
      tags: {
        Row: {
          id: string
          name: string
          slug: string
          category: 'theme' | 'mood' | 'setting' | 'style' | 'topic'
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          category?: 'theme' | 'mood' | 'setting' | 'style' | 'topic'
          created_at?: string
        }
        Update: {
          name?: string
          slug?: string
          category?: 'theme' | 'mood' | 'setting' | 'style' | 'topic'
        }
      }
      book_tags: {
        Row: {
          book_id: string
          tag_id: string
        }
        Insert: {
          book_id: string
          tag_id: string
        }
        Update: Record<string, never>
      }
      roadmap_features: {
        Row: {
          id: string
          title: string
          description: string | null
          status: 'planned' | 'in_progress' | 'completed' | 'considering'
          category: 'feature' | 'improvement' | 'bug_fix' | 'design'
          vote_count: number
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          status?: 'planned' | 'in_progress' | 'completed' | 'considering'
          category?: 'feature' | 'improvement' | 'bug_fix' | 'design'
          vote_count?: number
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          description?: string | null
          status?: 'planned' | 'in_progress' | 'completed' | 'considering'
          category?: 'feature' | 'improvement' | 'bug_fix' | 'design'
          updated_at?: string
        }
      }
      roadmap_votes: {
        Row: {
          user_id: string
          feature_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          feature_id: string
          created_at?: string
        }
        Update: Record<string, never>
      }
      roadmap_comments: {
        Row: {
          id: string
          feature_id: string
          user_id: string
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          feature_id: string
          user_id: string
          body: string
          created_at?: string
        }
        Update: {
          body?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          actor_id: string | null
          type: 'follow' | 'like' | 'comment' | 'review_on_book' | 'list_mention' | 'club_invite' | 'roadmap_status' | 'upvote'
          entity_type: string | null
          entity_id: string | null
          message: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          actor_id?: string | null
          type: 'follow' | 'like' | 'comment' | 'review_on_book' | 'list_mention' | 'club_invite' | 'roadmap_status' | 'upvote'
          entity_type?: string | null
          entity_id?: string | null
          message: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          is_read?: boolean
        }
      }
    }
    Views: {
      book_stats: {
        Row: {
          book_id: string
          avg_rating: number | null
          rating_count: number
          read_count: number
          review_count: number
        }
      }
      profile_stats: {
        Row: {
          id: string
          username: string
          follower_count: number
          following_count: number
          books_read: number
        }
      }
    }
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

export type ReadingStatus = 'to_read' | 'reading' | 'read' | 'dnf'
export type ActivityEventType =
  | 'book_logged'
  | 'book_reviewed'
  | 'list_created'
  | 'list_book_added'
  | 'started_reading'
  | 'finished_reading'
  | 'followed_user'
  | 'badge_unlocked'

// Convenience type aliases
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Book = Database['public']['Tables']['books']['Row']
export type Author = Database['public']['Tables']['authors']['Row']
export type Genre = Database['public']['Tables']['genres']['Row']
export type UserBook = Database['public']['Tables']['user_books']['Row']
export type Review = Database['public']['Tables']['reviews']['Row']
export type List = Database['public']['Tables']['lists']['Row']
export type ListItem = Database['public']['Tables']['list_items']['Row']
export type Follow = Database['public']['Tables']['follows']['Row']
export type Like = Database['public']['Tables']['likes']['Row']
export type ActivityEvent = Database['public']['Tables']['activity_events']['Row']
export type BookStats = Database['public']['Views']['book_stats']['Row']
export type Club = Database['public']['Tables']['clubs']['Row']
export type ClubMember = Database['public']['Tables']['club_members']['Row']
export type ClubPost = Database['public']['Tables']['club_posts']['Row']
export type ClubComment = Database['public']['Tables']['club_comments']['Row']
export type ReadingSession = Database['public']['Tables']['reading_sessions']['Row']
export type ReadingStats = Database['public']['Tables']['reading_stats']['Row']
export type Streak = Database['public']['Tables']['streaks']['Row']
export type ReadingGoal = Database['public']['Tables']['reading_goals']['Row']
export type BadgeRecord = Database['public']['Tables']['badges']['Row']
export type BookPost = Database['public']['Tables']['book_posts']['Row']
export type BookPostComment = Database['public']['Tables']['book_post_comments']['Row']
export type BookPostUpvote = Database['public']['Tables']['book_post_upvotes']['Row']
export type FavoriteBook = Database['public']['Tables']['favorite_books']['Row']
export type BlockedUser = Database['public']['Tables']['blocked_users']['Row']
export type BlockedAuthor = Database['public']['Tables']['blocked_authors']['Row']
export type BlockedTag = Database['public']['Tables']['blocked_tags']['Row']
export type ReviewSave = Database['public']['Tables']['review_saves']['Row']
export type Tag = Database['public']['Tables']['tags']['Row']
export type TagCategory = Tag['category']
export type RoadmapFeature = Database['public']['Tables']['roadmap_features']['Row']
export type RoadmapVote = Database['public']['Tables']['roadmap_votes']['Row']
export type RoadmapComment = Database['public']['Tables']['roadmap_comments']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type NotificationType = Notification['type']

// Extended types with joins
export type BookWithAuthors = Book & {
  authors: Author[]
  genres: Genre[]
  tags?: Tag[]
  stats?: BookStats
}

export type ReviewWithDetails = Review & {
  profile: Profile
  book: Book & { authors: Author[] }
}

export type UserBookWithDetails = UserBook & {
  book: Book & { authors: Author[] }
  review?: Review | null
}

export type ListWithItems = List & {
  profile: Profile
  items: (ListItem & { book: Book })[]
  item_count: number
}

export type ActivityEventWithDetails = ActivityEvent & {
  profile: Profile
  book?: Book & { authors: Author[] }
  review?: Review
  list?: List
  user_book?: UserBook
}

export type ProfileWithStats = Profile & {
  follower_count: number
  following_count: number
  books_read: number
  is_following?: boolean
}
