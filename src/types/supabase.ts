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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      conversation_attachments: {
        Row: {
          backblaze_file_id: string | null
          cdn_url: string | null
          created_at: string | null
          file_size: number
          filename: string
          id: string
          message_id: string
          mime_type: string
          original_filename: string
          storage_path: string
          updated_at: string | null
          upload_status: string | null
        }
        Insert: {
          backblaze_file_id?: string | null
          cdn_url?: string | null
          created_at?: string | null
          file_size: number
          filename: string
          id?: string
          message_id: string
          mime_type: string
          original_filename: string
          storage_path: string
          updated_at?: string | null
          upload_status?: string | null
        }
        Update: {
          backblaze_file_id?: string | null
          cdn_url?: string | null
          created_at?: string | null
          file_size?: number
          filename?: string
          id?: string
          message_id?: string
          mime_type?: string
          original_filename?: string
          storage_path?: string
          updated_at?: string | null
          upload_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "conversation_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "conversation_timeline"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          draft_content: string | null
          id: string
          is_draft: boolean
          message_type: string
          metadata: Json | null
          reply_to_id: string | null
          sender_id: string
          target_date: string | null
          updated_at: string | null
          visibility: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          draft_content?: string | null
          id?: string
          is_draft?: boolean
          message_type: string
          metadata?: Json | null
          reply_to_id?: string | null
          sender_id: string
          target_date?: string | null
          updated_at?: string | null
          visibility?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          draft_content?: string | null
          id?: string
          is_draft?: boolean
          message_type?: string
          metadata?: Json | null
          reply_to_id?: string | null
          sender_id?: string
          target_date?: string | null
          updated_at?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "active_goal_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "goal_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "instructor_review_queue"
            referencedColumns: ["conversation_id"]
          },
          {
            foreignKeyName: "conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "instructor_track_history"
            referencedColumns: ["conversation_id"]
          },
          {
            foreignKeyName: "conversation_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "conversation_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "conversation_timeline"
            referencedColumns: ["id"]
          },
        ]
      }
      course_chapter_media: {
        Row: {
          chapter_id: string
          created_at: string | null
          id: string
          media_file_id: string
          order_in_chapter: number
          title: string | null
          transcript_file_path: string | null
          transcript_segments: Json | null
          transcript_status: string | null
          transcript_text: string | null
          transcript_uploaded_at: string | null
          updated_at: string | null
        }
        Insert: {
          chapter_id: string
          created_at?: string | null
          id?: string
          media_file_id: string
          order_in_chapter: number
          title?: string | null
          transcript_file_path?: string | null
          transcript_segments?: Json | null
          transcript_status?: string | null
          transcript_text?: string | null
          transcript_uploaded_at?: string | null
          updated_at?: string | null
        }
        Update: {
          chapter_id?: string
          created_at?: string | null
          id?: string
          media_file_id?: string
          order_in_chapter?: number
          title?: string | null
          transcript_file_path?: string | null
          transcript_segments?: Json | null
          transcript_status?: string | null
          transcript_text?: string | null
          transcript_uploaded_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_chapter_media_media_file_id_fkey"
            columns: ["media_file_id"]
            isOneToOne: false
            referencedRelation: "media_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_course_chapter_media_chapter_id"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "course_chapters"
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
          order_position: number
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
          order_position?: number
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
          order_position?: number
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
            referencedRelation: "courses_with_assignments"
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
      course_goal_assignments: {
        Row: {
          course_id: string
          created_at: string | null
          goal_id: string
          id: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          goal_id: string
          id?: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          goal_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_goal_assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_goal_assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses_with_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_goal_assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "instructor_courses_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_goal_assignments_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "instructor_track_history"
            referencedColumns: ["goal_id"]
          },
          {
            foreignKeyName: "course_goal_assignments_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "track_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          instructor_id: string
          is_free: boolean | null
          price: number | null
          published_at: string | null
          rating: number | null
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
          created_at?: string | null
          description?: string | null
          id?: string
          instructor_id: string
          is_free?: boolean | null
          price?: number | null
          published_at?: string | null
          rating?: number | null
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
          created_at?: string | null
          description?: string | null
          id?: string
          instructor_id?: string
          is_free?: boolean | null
          price?: number | null
          published_at?: string | null
          rating?: number | null
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
        Relationships: []
      }
      feedback_drafts: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          title: string | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          title?: string | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          title?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      goal_conversations: {
        Row: {
          created_at: string | null
          end_reason: string | null
          ended_at: string | null
          goal_id: string | null
          id: string
          instructor_id: string | null
          status: string | null
          student_id: string
          track_id: string | null
          transition_to_track_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_reason?: string | null
          ended_at?: string | null
          goal_id?: string | null
          id?: string
          instructor_id?: string | null
          status?: string | null
          student_id: string
          track_id?: string | null
          transition_to_track_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_reason?: string | null
          ended_at?: string | null
          goal_id?: string | null
          id?: string
          instructor_id?: string | null
          status?: string | null
          student_id?: string
          track_id?: string | null
          transition_to_track_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goal_conversations_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "instructor_track_history"
            referencedColumns: ["goal_id"]
          },
          {
            foreignKeyName: "goal_conversations_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "track_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_conversations_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "instructor_track_history"
            referencedColumns: ["track_id"]
          },
          {
            foreignKeyName: "goal_conversations_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "instructor_track_history"
            referencedColumns: ["transition_to_track_id"]
          },
          {
            foreignKeyName: "goal_conversations_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_conversations_transition_to_track_id_fkey"
            columns: ["transition_to_track_id"]
            isOneToOne: false
            referencedRelation: "instructor_track_history"
            referencedColumns: ["track_id"]
          },
          {
            foreignKeyName: "goal_conversations_transition_to_track_id_fkey"
            columns: ["transition_to_track_id"]
            isOneToOne: false
            referencedRelation: "instructor_track_history"
            referencedColumns: ["transition_to_track_id"]
          },
          {
            foreignKeyName: "goal_conversations_transition_to_track_id_fkey"
            columns: ["transition_to_track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      instructor_goal_responses: {
        Row: {
          created_at: string | null
          daily_note_id: string | null
          id: string
          instructor_id: string
          message: string
          metadata: Json | null
          response_type: string | null
          student_id: string
          target_date: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          daily_note_id?: string | null
          id?: string
          instructor_id: string
          message: string
          metadata?: Json | null
          response_type?: string | null
          student_id: string
          target_date: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          daily_note_id?: string | null
          id?: string
          instructor_id?: string
          message?: string
          metadata?: Json | null
          response_type?: string | null
          student_id?: string
          target_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instructor_goal_responses_daily_note_id_fkey"
            columns: ["daily_note_id"]
            isOneToOne: false
            referencedRelation: "user_daily_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_activities: {
        Row: {
          activity_subtype: string | null
          activity_type: string
          completed_at: string | null
          content: Json | null
          course_id: string
          created_at: string | null
          id: string
          state: string
          title: string
          triggered_at_timestamp: number | null
          updated_at: string | null
          user_id: string
          video_id: string | null
        }
        Insert: {
          activity_subtype?: string | null
          activity_type: string
          completed_at?: string | null
          content?: Json | null
          course_id: string
          created_at?: string | null
          id?: string
          state?: string
          title: string
          triggered_at_timestamp?: number | null
          updated_at?: string | null
          user_id: string
          video_id?: string | null
        }
        Update: {
          activity_subtype?: string | null
          activity_type?: string
          completed_at?: string | null
          content?: Json | null
          course_id?: string
          created_at?: string | null
          id?: string
          state?: string
          title?: string
          triggered_at_timestamp?: number | null
          updated_at?: string | null
          user_id?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_activities_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_activities_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses_with_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_activities_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "instructor_courses_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            referencedRelation: "courses_with_assignments"
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
          current_goal_id: string | null
          current_track_id: string | null
          email: string
          full_name: string | null
          goal_assigned_at: string | null
          goal_current_amount: string | null
          goal_progress: number | null
          goal_start_date: string | null
          goal_status: string | null
          goal_target_amount: string | null
          goal_target_date: string | null
          goal_title: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"] | null
          track_assigned_at: string | null
          track_assignment_count: number | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          current_goal_id?: string | null
          current_track_id?: string | null
          email: string
          full_name?: string | null
          goal_assigned_at?: string | null
          goal_current_amount?: string | null
          goal_progress?: number | null
          goal_start_date?: string | null
          goal_status?: string | null
          goal_target_amount?: string | null
          goal_target_date?: string | null
          goal_title?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"] | null
          track_assigned_at?: string | null
          track_assignment_count?: number | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          current_goal_id?: string | null
          current_track_id?: string | null
          email?: string
          full_name?: string | null
          goal_assigned_at?: string | null
          goal_current_amount?: string | null
          goal_progress?: number | null
          goal_start_date?: string | null
          goal_status?: string | null
          goal_target_amount?: string | null
          goal_target_date?: string | null
          goal_title?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          track_assigned_at?: string | null
          track_assignment_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_goal_id_fkey"
            columns: ["current_goal_id"]
            isOneToOne: false
            referencedRelation: "instructor_track_history"
            referencedColumns: ["goal_id"]
          },
          {
            foreignKeyName: "profiles_current_goal_id_fkey"
            columns: ["current_goal_id"]
            isOneToOne: false
            referencedRelation: "track_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_current_track_id_fkey"
            columns: ["current_track_id"]
            isOneToOne: false
            referencedRelation: "instructor_track_history"
            referencedColumns: ["track_id"]
          },
          {
            foreignKeyName: "profiles_current_track_id_fkey"
            columns: ["current_track_id"]
            isOneToOne: false
            referencedRelation: "instructor_track_history"
            referencedColumns: ["transition_to_track_id"]
          },
          {
            foreignKeyName: "profiles_current_track_id_fkey"
            columns: ["current_track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          course_id: string
          created_at: string | null
          id: string
          percentage: number
          questions: Json
          quiz_duration_seconds: number | null
          score: number
          total_questions: number
          updated_at: string | null
          user_answers: Json
          user_id: string | null
          video_id: string
          video_timestamp: number
        }
        Insert: {
          course_id: string
          created_at?: string | null
          id?: string
          percentage: number
          questions: Json
          quiz_duration_seconds?: number | null
          score: number
          total_questions: number
          updated_at?: string | null
          user_answers: Json
          user_id?: string | null
          video_id: string
          video_timestamp: number
        }
        Update: {
          course_id?: string
          created_at?: string | null
          id?: string
          percentage?: number
          questions?: Json
          quiz_duration_seconds?: number | null
          score?: number
          total_questions?: number
          updated_at?: string | null
          user_answers?: Json
          user_id?: string | null
          video_id?: string
          video_timestamp?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_quiz_attempts_course_id"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_quiz_attempts_course_id"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses_with_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_quiz_attempts_course_id"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "instructor_courses_view"
            referencedColumns: ["id"]
          },
        ]
      }
      reflections: {
        Row: {
          activity_id: string | null
          course_id: string
          created_at: string | null
          duration_frames: number | null
          duration_seconds: number | null
          file_url: string | null
          id: string
          instructor_responded_at: string | null
          instructor_response: string | null
          reflection_prompt: string | null
          reflection_text: string
          reflection_type: string | null
          updated_at: string | null
          user_id: string
          video_id: string
          video_timestamp_frames: number | null
          video_timestamp_seconds: number | null
        }
        Insert: {
          activity_id?: string | null
          course_id: string
          created_at?: string | null
          duration_frames?: number | null
          duration_seconds?: number | null
          file_url?: string | null
          id?: string
          instructor_responded_at?: string | null
          instructor_response?: string | null
          reflection_prompt?: string | null
          reflection_text: string
          reflection_type?: string | null
          updated_at?: string | null
          user_id: string
          video_id: string
          video_timestamp_frames?: number | null
          video_timestamp_seconds?: number | null
        }
        Update: {
          activity_id?: string | null
          course_id?: string
          created_at?: string | null
          duration_frames?: number | null
          duration_seconds?: number | null
          file_url?: string | null
          id?: string
          instructor_responded_at?: string | null
          instructor_response?: string | null
          reflection_prompt?: string | null
          reflection_text?: string
          reflection_type?: string | null
          updated_at?: string | null
          user_id?: string
          video_id?: string
          video_timestamp_frames?: number | null
          video_timestamp_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reflections_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "learning_activities"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "courses_with_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reflections_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "instructor_courses_view"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string
          id: string
          metadata: Json | null
          priority: string
          request_type: string
          resolved_at: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          priority?: string
          request_type: string
          resolved_at?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          priority?: string
          request_type?: string
          resolved_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_preferences: {
        Row: {
          approach_preference: string | null
          completed_questionnaire: boolean | null
          content_format_preferences: Json | null
          created_at: string | null
          difficulty_preference: string | null
          goal_priorities: Json | null
          id: string
          learning_pace: string | null
          monthly_income_goal: number | null
          notification_preferences: Json | null
          questionnaire_completed_at: string | null
          questionnaire_data: Json | null
          questionnaire_track_id: string | null
          questionnaire_version: string | null
          skill_level: string | null
          student_id: string
          time_commitment_hours: number | null
          updated_at: string | null
        }
        Insert: {
          approach_preference?: string | null
          completed_questionnaire?: boolean | null
          content_format_preferences?: Json | null
          created_at?: string | null
          difficulty_preference?: string | null
          goal_priorities?: Json | null
          id?: string
          learning_pace?: string | null
          monthly_income_goal?: number | null
          notification_preferences?: Json | null
          questionnaire_completed_at?: string | null
          questionnaire_data?: Json | null
          questionnaire_track_id?: string | null
          questionnaire_version?: string | null
          skill_level?: string | null
          student_id: string
          time_commitment_hours?: number | null
          updated_at?: string | null
        }
        Update: {
          approach_preference?: string | null
          completed_questionnaire?: boolean | null
          content_format_preferences?: Json | null
          created_at?: string | null
          difficulty_preference?: string | null
          goal_priorities?: Json | null
          id?: string
          learning_pace?: string | null
          monthly_income_goal?: number | null
          notification_preferences?: Json | null
          questionnaire_completed_at?: string | null
          questionnaire_data?: Json | null
          questionnaire_track_id?: string | null
          questionnaire_version?: string | null
          skill_level?: string | null
          student_id?: string
          time_commitment_hours?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_preferences_questionnaire_track_id_fkey"
            columns: ["questionnaire_track_id"]
            isOneToOne: false
            referencedRelation: "instructor_track_history"
            referencedColumns: ["track_id"]
          },
          {
            foreignKeyName: "student_preferences_questionnaire_track_id_fkey"
            columns: ["questionnaire_track_id"]
            isOneToOne: false
            referencedRelation: "instructor_track_history"
            referencedColumns: ["transition_to_track_id"]
          },
          {
            foreignKeyName: "student_preferences_questionnaire_track_id_fkey"
            columns: ["questionnaire_track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_preferences_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_track_assignments: {
        Row: {
          assigned_at: string | null
          created_at: string | null
          goal_id: string | null
          id: string
          status: string | null
          student_id: string
          track_id: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          created_at?: string | null
          goal_id?: string | null
          id?: string
          status?: string | null
          student_id: string
          track_id?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          created_at?: string | null
          goal_id?: string | null
          id?: string
          status?: string | null
          student_id?: string
          track_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_track_assignments_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "instructor_track_history"
            referencedColumns: ["goal_id"]
          },
          {
            foreignKeyName: "user_track_assignments_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "track_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_track_assignments_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "instructor_track_history"
            referencedColumns: ["track_id"]
          },
          {
            foreignKeyName: "user_track_assignments_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "instructor_track_history"
            referencedColumns: ["transition_to_track_id"]
          },
          {
            foreignKeyName: "user_track_assignments_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_track_assignments_user_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      track_goals: {
        Row: {
          created_at: string | null
          currency: string | null
          description: string | null
          goal_type: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          sort_order: number | null
          target_amount: number | null
          track_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          description?: string | null
          goal_type?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          sort_order?: number | null
          target_amount?: number | null
          track_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          description?: string | null
          goal_type?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          sort_order?: number | null
          target_amount?: number | null
          track_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "track_goals_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "instructor_track_history"
            referencedColumns: ["track_id"]
          },
          {
            foreignKeyName: "track_goals_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "instructor_track_history"
            referencedColumns: ["transition_to_track_id"]
          },
          {
            foreignKeyName: "track_goals_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      tracks: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_daily_notes: {
        Row: {
          created_at: string | null
          goal_id: string | null
          id: string
          note: string
          note_date: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          goal_id?: string | null
          id?: string
          note: string
          note_date?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          goal_id?: string | null
          id?: string
          note?: string
          note_date?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_daily_notes_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "instructor_track_history"
            referencedColumns: ["goal_id"]
          },
          {
            foreignKeyName: "user_daily_notes_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "track_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_daily_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      active_goal_conversations: {
        Row: {
          created_at: string | null
          end_reason: string | null
          ended_at: string | null
          goal_id: string | null
          goal_name: string | null
          id: string | null
          instructor_id: string | null
          status: string | null
          student_email: string | null
          student_id: string | null
          student_name: string | null
          track_id: string | null
          track_name: string | null
          transition_to_track_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goal_conversations_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "instructor_track_history"
            referencedColumns: ["goal_id"]
          },
          {
            foreignKeyName: "goal_conversations_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "track_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_conversations_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "instructor_track_history"
            referencedColumns: ["track_id"]
          },
          {
            foreignKeyName: "goal_conversations_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "instructor_track_history"
            referencedColumns: ["transition_to_track_id"]
          },
          {
            foreignKeyName: "goal_conversations_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_conversations_transition_to_track_id_fkey"
            columns: ["transition_to_track_id"]
            isOneToOne: false
            referencedRelation: "instructor_track_history"
            referencedColumns: ["track_id"]
          },
          {
            foreignKeyName: "goal_conversations_transition_to_track_id_fkey"
            columns: ["transition_to_track_id"]
            isOneToOne: false
            referencedRelation: "instructor_track_history"
            referencedColumns: ["transition_to_track_id"]
          },
          {
            foreignKeyName: "goal_conversations_transition_to_track_id_fkey"
            columns: ["transition_to_track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_timeline: {
        Row: {
          attachments: Json | null
          content: string | null
          conversation_id: string | null
          created_at: string | null
          draft_content: string | null
          id: string | null
          instructor_id: string | null
          is_draft: boolean | null
          message_type: string | null
          metadata: Json | null
          reply_to_id: string | null
          sender_avatar: string | null
          sender_id: string | null
          sender_name: string | null
          sender_role: Database["public"]["Enums"]["user_role"] | null
          student_id: string | null
          target_date: string | null
          updated_at: string | null
          visibility: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "active_goal_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "goal_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "instructor_review_queue"
            referencedColumns: ["conversation_id"]
          },
          {
            foreignKeyName: "conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "instructor_track_history"
            referencedColumns: ["conversation_id"]
          },
          {
            foreignKeyName: "conversation_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "conversation_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "conversation_timeline"
            referencedColumns: ["id"]
          },
        ]
      }
      courses_with_assignments: {
        Row: {
          assignment_count: number | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string | null
          instructor_id: string | null
          is_free: boolean | null
          price: number | null
          published_at: string | null
          rating: number | null
          status: string | null
          students: number | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string | null
          total_duration_minutes: number | null
          total_videos: number | null
          updated_at: string | null
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
      instructor_courses_view: {
        Row: {
          active_students: number | null
          assignment_count: number | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string | null
          instructor_id: string | null
          is_free: boolean | null
          price: number | null
          published_at: string | null
          rating: number | null
          status: string | null
          students: number | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string | null
          total_duration_minutes: number | null
          total_videos: number | null
          updated_at: string | null
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
      instructor_review_queue: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          goal_name: string | null
          instructor_id: string | null
          message_count: number | null
          status: string | null
          student_email: string | null
          student_id: string | null
          student_name: string | null
          track_name: string | null
        }
        Relationships: []
      }
      instructor_track_history: {
        Row: {
          assignment_status: string | null
          conversation_duration_days: number | null
          conversation_id: string | null
          conversation_status: string | null
          created_at: string | null
          end_reason: string | null
          ended_at: string | null
          goal_assigned_at: string | null
          goal_description: string | null
          goal_id: string | null
          goal_name: string | null
          instructor_id: string | null
          progress_status: string | null
          student_email: string | null
          student_id: string | null
          student_name: string | null
          track_id: string | null
          track_name: string | null
          transition_to_track_id: string | null
          transition_to_track_name: string | null
        }
        Relationships: []
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
      add_video_to_chapter: {
        Args: {
          p_chapter_id: string
          p_media_file_id: string
          p_title?: string
        }
        Returns: Json
      }
      backup_old_conversation_data: {
        Args: Record<PropertyKey, never>
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
      get_chapter_video_by_position: {
        Args: { p_chapter_id: string; p_position: number }
        Returns: {
          duration_seconds: number
          media_file_id: string
          media_file_name: string
          media_file_url: string
          order_num: number
          title: string
        }[]
      }
      get_transcription_job_status: {
        Args: { job_uuid: string }
        Returns: {
          completed_videos: number
          created_at: string
          error_message: string
          job_id: string
          processing_completed_at: string
          processing_started_at: string
          progress_percent: number
          status: string
          total_videos: number
        }[]
      }
      get_user_courses: {
        Args: { user_id: string }
        Returns: {
          description: string
          id: string
          is_free: boolean
          price: number
          rating: number
          status: string
          students: number
          thumbnail_url: string
          title: string
          total_duration_minutes: number
          total_videos: number
        }[]
      }
      increment_media_usage: {
        Args: { media_id: string }
        Returns: undefined
      }
      migrate_to_unified_conversations: {
        Args: Record<PropertyKey, never>
        Returns: {
          count_migrated: number
          operation: string
          status: string
        }[]
      }
      remove_video_from_chapter: {
        Args: { p_chapter_id: string; p_media_file_id: string }
        Returns: boolean
      }
      reorder_chapter_videos: {
        Args: { p_chapter_id: string; p_video_orders: Json }
        Returns: boolean
      }
      sync_user_profile_on_inactive: {
        Args: { excluded_assignment_id: string; target_user_id: string }
        Returns: undefined
      }
      validate_conversation_migration: {
        Args: Record<PropertyKey, never>
        Returns: {
          check_name: string
          new_count: number
          old_count: number
          status: string
        }[]
      }
      validate_profile_goal_sync: {
        Args: Record<PropertyKey, never>
        Returns: {
          assignment_goal_id: string
          profile_goal_id: string
          sync_status: string
          user_id: string
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      subscription_plan: ["free", "pro", "premium"],
      subscription_status: ["active", "inactive", "cancelled"],
      user_role: ["student", "instructor", "admin"],
    },
  },
} as const
