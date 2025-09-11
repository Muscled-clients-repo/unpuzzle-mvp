export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      ai_interactions: {
        Row: {
          concepts_discussed: string[] | null
          course_id: string | null
          created_at: string | null
          helpful: boolean | null
          id: string
          interaction_type: string | null
          prompt: string
          response: string
          user_id: string
          user_rating: number | null
          video_id: string | null
          video_timestamp_seconds: number | null
        }
        Insert: {
          concepts_discussed?: string[] | null
          course_id?: string | null
          created_at?: string | null
          helpful?: boolean | null
          id?: string
          interaction_type?: string | null
          prompt: string
          response: string
          user_id: string
          user_rating?: number | null
          video_id?: string | null
          video_timestamp_seconds?: number | null
        }
        Update: {
          concepts_discussed?: string[] | null
          course_id?: string | null
          created_at?: string | null
          helpful?: boolean | null
          id?: string
          interaction_type?: string | null
          prompt?: string
          response?: string
          user_id?: string
          user_rating?: number | null
          video_id?: string | null
          video_timestamp_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_interactions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_interactions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "instructor_courses_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_interactions_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      course_chapters: {
        Row: {
          course_id: string
          created_at: string | null
          description: string | null
          id: string
          is_preview: boolean | null
          is_published: boolean | null
          order: number
          title: string
          updated_at: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          description?: string | null
          id: string
          is_preview?: boolean | null
          is_published?: boolean | null
          order?: number
          title: string
          updated_at?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_preview?: boolean | null
          is_published?: boolean | null
          order?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_chapters_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_chapters_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "instructor_courses_view"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category: string | null
          completion_rate: number | null
          created_at: string | null
          description: string | null
          difficulty: string | null
          id: string
          instructor_id: string
          is_free: boolean | null
          level: string | null
          pending_confusions: number | null
          price: number | null
          rating: number | null
          revenue: number | null
          status: string
          students: number | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          total_duration_minutes: number | null
          total_videos: number | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          completion_rate?: number | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          id?: string
          instructor_id: string
          is_free?: boolean | null
          level?: string | null
          pending_confusions?: number | null
          price?: number | null
          rating?: number | null
          revenue?: number | null
          status?: string
          students?: number | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          total_duration_minutes?: number | null
          total_videos?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          completion_rate?: number | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          id?: string
          instructor_id?: string
          is_free?: boolean | null
          level?: string | null
          pending_confusions?: number | null
          price?: number | null
          rating?: number | null
          revenue?: number | null
          status?: string
          students?: number | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          total_duration_minutes?: number | null
          total_videos?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          ai_interactions_count: number | null
          completed_at: string | null
          completed_videos: number | null
          course_id: string | null
          current_lesson_title: string | null
          current_video_id: string | null
          enrolled_at: string | null
          estimated_time_remaining_formatted: string | null
          id: string
          last_accessed_at: string | null
          progress_percent: number | null
          total_videos: number | null
          user_id: string
        }
        Insert: {
          ai_interactions_count?: number | null
          completed_at?: string | null
          completed_videos?: number | null
          course_id?: string | null
          current_lesson_title?: string | null
          current_video_id?: string | null
          enrolled_at?: string | null
          estimated_time_remaining_formatted?: string | null
          id?: string
          last_accessed_at?: string | null
          progress_percent?: number | null
          total_videos?: number | null
          user_id: string
        }
        Update: {
          ai_interactions_count?: number | null
          completed_at?: string | null
          completed_videos?: number | null
          course_id?: string | null
          current_lesson_title?: string | null
          current_video_id?: string | null
          enrolled_at?: string | null
          estimated_time_remaining_formatted?: string | null
          id?: string
          last_accessed_at?: string | null
          progress_percent?: number | null
          total_videos?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "instructor_courses_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_current_video_id_fkey"
            columns: ["current_video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_milestones: {
        Row: {
          achieved_at: string | null
          course_id: string | null
          created_at: string | null
          current_value: number | null
          description: string | null
          id: string
          is_achieved: boolean | null
          milestone_type: string | null
          prerequisite_milestone_id: string | null
          progress_percent: number | null
          sequence_order: number | null
          target_value: number | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          achieved_at?: string | null
          course_id?: string | null
          created_at?: string | null
          current_value?: number | null
          description?: string | null
          id?: string
          is_achieved?: boolean | null
          milestone_type?: string | null
          prerequisite_milestone_id?: string | null
          progress_percent?: number | null
          sequence_order?: number | null
          target_value?: number | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          achieved_at?: string | null
          course_id?: string | null
          created_at?: string | null
          current_value?: number | null
          description?: string | null
          id?: string
          is_achieved?: boolean | null
          milestone_type?: string | null
          prerequisite_milestone_id?: string | null
          progress_percent?: number | null
          sequence_order?: number | null
          target_value?: number | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_milestones_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_milestones_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "instructor_courses_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_milestones_prerequisite_milestone_id_fkey"
            columns: ["prerequisite_milestone_id"]
            isOneToOne: false
            referencedRelation: "learning_milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_struggles: {
        Row: {
          concept_name: string
          course_id: string | null
          difficulty_level: number | null
          evidence_data: Json | null
          evidence_type: string | null
          id: string
          identified_at: string | null
          resolution_strategy: string | null
          resolved_at: string | null
          status: string | null
          updated_at: string | null
          user_id: string
          video_id: string | null
        }
        Insert: {
          concept_name: string
          course_id?: string | null
          difficulty_level?: number | null
          evidence_data?: Json | null
          evidence_type?: string | null
          id?: string
          identified_at?: string | null
          resolution_strategy?: string | null
          resolved_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
          video_id?: string | null
        }
        Update: {
          concept_name?: string
          course_id?: string | null
          difficulty_level?: number | null
          evidence_data?: Json | null
          evidence_type?: string | null
          id?: string
          identified_at?: string | null
          resolution_strategy?: string | null
          resolved_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_struggles_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_struggles_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "instructor_courses_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_struggles_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      media_file_history: {
        Row: {
          action: string
          created_at: string
          description: string
          id: string
          media_file_id: string
          metadata: Json | null
          performed_by: string
        }
        Insert: {
          action: string
          created_at?: string
          description: string
          id?: string
          media_file_id: string
          metadata?: Json | null
          performed_by: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string
          id?: string
          media_file_id?: string
          metadata?: Json | null
          performed_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_file_history_media_file_id_fkey"
            columns: ["media_file_id"]
            isOneToOne: false
            referencedRelation: "media_files"
            referencedColumns: ["id"]
          },
        ]
      }
      media_files: {
        Row: {
          backblaze_file_id: string | null
          backblaze_url: string | null
          category: string | null
          cdn_url: string | null
          created_at: string
          description: string | null
          duration_seconds: number | null
          file_size: number
          file_type: string
          id: string
          is_public: boolean | null
          last_used_at: string | null
          mime_type: string
          name: string
          original_name: string
          status: string | null
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string
          uploaded_by: string
          usage_count: number | null
        }
        Insert: {
          backblaze_file_id?: string | null
          backblaze_url?: string | null
          category?: string | null
          cdn_url?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          file_size: number
          file_type: string
          id?: string
          is_public?: boolean | null
          last_used_at?: string | null
          mime_type: string
          name: string
          original_name: string
          status?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
          uploaded_by: string
          usage_count?: number | null
        }
        Update: {
          backblaze_file_id?: string | null
          backblaze_url?: string | null
          category?: string | null
          cdn_url?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          file_size?: number
          file_type?: string
          id?: string
          is_public?: boolean | null
          last_used_at?: string | null
          mime_type?: string
          name?: string
          original_name?: string
          status?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
          uploaded_by?: string
          usage_count?: number | null
        }
        Relationships: []
      }
      media_usage: {
        Row: {
          course_id: string
          created_at: string
          id: string
          media_file_id: string
          resource_id: string
          resource_type: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          media_file_id: string
          resource_id: string
          resource_type: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          media_file_id?: string
          resource_id?: string
          resource_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_usage_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_usage_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "instructor_courses_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_usage_media_file_id_fkey"
            columns: ["media_file_id"]
            isOneToOne: false
            referencedRelation: "media_files"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          attempt_number: number | null
          completed_at: string | null
          correct_answers: number | null
          course_id: string | null
          id: string
          passed: boolean | null
          questions_count: number | null
          quiz_type: string | null
          score_percent: number | null
          started_at: string | null
          time_spent_seconds: number | null
          user_id: string
          video_id: string | null
        }
        Insert: {
          attempt_number?: number | null
          completed_at?: string | null
          correct_answers?: number | null
          course_id?: string | null
          id?: string
          passed?: boolean | null
          questions_count?: number | null
          quiz_type?: string | null
          score_percent?: number | null
          started_at?: string | null
          time_spent_seconds?: number | null
          user_id: string
          video_id?: string | null
        }
        Update: {
          attempt_number?: number | null
          completed_at?: string | null
          correct_answers?: number | null
          course_id?: string | null
          id?: string
          passed?: boolean | null
          questions_count?: number | null
          quiz_type?: string | null
          score_percent?: number | null
          started_at?: string | null
          time_spent_seconds?: number | null
          user_id?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "instructor_courses_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      reflections: {
        Row: {
          course_id: string | null
          created_at: string | null
          id: string
          instructor_responded_at: string | null
          instructor_response: string | null
          reflection_prompt: string | null
          reflection_text: string
          reflection_type: string | null
          updated_at: string | null
          user_id: string
          video_id: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          id?: string
          instructor_responded_at?: string | null
          instructor_response?: string | null
          reflection_prompt?: string | null
          reflection_text: string
          reflection_type?: string | null
          updated_at?: string | null
          user_id: string
          video_id?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          id?: string
          instructor_responded_at?: string | null
          instructor_response?: string | null
          reflection_prompt?: string | null
          reflection_text?: string
          reflection_type?: string | null
          updated_at?: string | null
          user_id?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reflections_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reflections_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "instructor_courses_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reflections_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan: Database["public"]["Enums"]["subscription_plan"] | null
          status: Database["public"]["Enums"]["subscription_status"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"] | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"] | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_learning_stats: {
        Row: {
          active_courses_count: number | null
          average_completion_rate: number | null
          completed_courses_count: number | null
          last_calculated_at: string | null
          total_ai_interactions: number | null
          total_courses_enrolled: number | null
          total_videos_completed: number | null
          total_watch_time_formatted: string | null
          total_watch_time_minutes: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active_courses_count?: number | null
          average_completion_rate?: number | null
          completed_courses_count?: number | null
          last_calculated_at?: string | null
          total_ai_interactions?: number | null
          total_courses_enrolled?: number | null
          total_videos_completed?: number | null
          total_watch_time_formatted?: string | null
          total_watch_time_minutes?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active_courses_count?: number | null
          average_completion_rate?: number | null
          completed_courses_count?: number | null
          last_calculated_at?: string | null
          total_ai_interactions?: number | null
          total_courses_enrolled?: number | null
          total_videos_completed?: number | null
          total_watch_time_formatted?: string | null
          total_watch_time_minutes?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      video_progress: {
        Row: {
          completed_at: string | null
          course_id: string | null
          first_started_at: string | null
          id: string
          last_position_seconds: number | null
          max_position_reached_seconds: number | null
          pause_count: number | null
          playback_speed: number | null
          progress_percent: number | null
          rewind_count: number | null
          total_watch_time_seconds: number | null
          updated_at: string | null
          user_id: string
          video_id: string | null
        }
        Insert: {
          completed_at?: string | null
          course_id?: string | null
          first_started_at?: string | null
          id?: string
          last_position_seconds?: number | null
          max_position_reached_seconds?: number | null
          pause_count?: number | null
          playback_speed?: number | null
          progress_percent?: number | null
          rewind_count?: number | null
          total_watch_time_seconds?: number | null
          updated_at?: string | null
          user_id: string
          video_id?: string | null
        }
        Update: {
          completed_at?: string | null
          course_id?: string | null
          first_started_at?: string | null
          id?: string
          last_position_seconds?: number | null
          max_position_reached_seconds?: number | null
          pause_count?: number | null
          playback_speed?: number | null
          progress_percent?: number | null
          rewind_count?: number | null
          total_watch_time_seconds?: number | null
          updated_at?: string | null
          user_id?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "instructor_courses_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_progress_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          backblaze_file_id: string | null
          backblaze_url: string | null
          bunny_url: string | null
          chapter_id: string
          course_id: string
          created_at: string | null
          description: string | null
          duration: string | null
          duration_seconds: number | null
          file_size: number
          filename: string
          id: string
          media_file_id: string | null
          order: number | null
          progress: number | null
          status: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          video_format: string | null
          video_quality: string | null
          video_url: string | null
        }
        Insert: {
          backblaze_file_id?: string | null
          backblaze_url?: string | null
          bunny_url?: string | null
          chapter_id: string
          course_id: string
          created_at?: string | null
          description?: string | null
          duration?: string | null
          duration_seconds?: number | null
          file_size: number
          filename: string
          id?: string
          media_file_id?: string | null
          order?: number | null
          progress?: number | null
          status?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          video_format?: string | null
          video_quality?: string | null
          video_url?: string | null
        }
        Update: {
          backblaze_file_id?: string | null
          backblaze_url?: string | null
          bunny_url?: string | null
          chapter_id?: string
          course_id?: string
          created_at?: string | null
          description?: string | null
          duration?: string | null
          duration_seconds?: number | null
          file_size?: number
          filename?: string
          id?: string
          media_file_id?: string | null
          order?: number | null
          progress?: number | null
          status?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          video_format?: string | null
          video_quality?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "instructor_courses_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_media_file_id_fkey"
            columns: ["media_file_id"]
            isOneToOne: false
            referencedRelation: "media_files"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      instructor_courses_view: {
        Row: {
          completionRate: number | null
          created_at: string | null
          id: string | null
          instructor_id: string | null
          lastUpdated: string | null
          pendingConfusions: number | null
          revenue: number | null
          status: string | null
          students: number | null
          thumbnail: string | null
          title: string | null
          totalDuration: string | null
          totalVideos: number | null
          updated_at: string | null
        }
        Insert: {
          completionRate?: number | null
          created_at?: string | null
          id?: string | null
          instructor_id?: string | null
          lastUpdated?: never
          pendingConfusions?: number | null
          revenue?: number | null
          status?: string | null
          students?: number | null
          thumbnail?: string | null
          title?: string | null
          totalDuration?: never
          totalVideos?: number | null
          updated_at?: string | null
        }
        Update: {
          completionRate?: number | null
          created_at?: string | null
          id?: string | null
          instructor_id?: string | null
          lastUpdated?: never
          pendingConfusions?: number | null
          revenue?: number | null
          status?: string | null
          students?: number | null
          thumbnail?: string | null
          title?: string | null
          totalDuration?: never
          totalVideos?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_media_file_history: {
        Args: {
          p_action: string
          p_description: string
          p_media_file_id: string
          p_metadata?: Json
        }
        Returns: string
      }
      format_duration: {
        Args: { minutes: number }
        Returns: string
      }
      format_last_updated: {
        Args: { updated_at: string }
        Returns: string
      }
      increment_media_usage: {
        Args: { media_id: string }
        Returns: undefined
      }
      link_multiple_media_to_chapter: {
        Args: {
          p_chapter_id: string
          p_course_id: string
          p_media_ids: string[]
        }
        Returns: {
          backblaze_file_id: string | null
          backblaze_url: string | null
          bunny_url: string | null
          chapter_id: string
          course_id: string
          created_at: string | null
          description: string | null
          duration: string | null
          duration_seconds: number | null
          file_size: number
          filename: string
          id: string
          media_file_id: string | null
          order: number | null
          progress: number | null
          status: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          video_format: string | null
          video_quality: string | null
          video_url: string | null
        }[]
      }
    }
    Enums: {
      subscription_plan: "free" | "pro" | "premium"
      subscription_status: "active" | "inactive" | "cancelled"
      user_role: "student" | "instructor" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      subscription_plan: ["free", "pro", "premium"],
      subscription_status: ["active", "inactive", "cancelled"],
      user_role: ["student", "instructor", "admin"],
    },
  },
} as const
