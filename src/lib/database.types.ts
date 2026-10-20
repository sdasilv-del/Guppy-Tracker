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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      breeding_group_members: {
        Row: {
          fish_id: string
          group_id: string
          user_id: string
        }
        Insert: {
          fish_id: string
          group_id: string
          user_id?: string
        }
        Update: {
          fish_id?: string
          group_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "breeding_group_members_fish_id_fkey"
            columns: ["fish_id"]
            isOneToOne: false
            referencedRelation: "fish"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breeding_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "breeding_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      breeding_group_traits: {
        Row: {
          group_id: string
          trait_id: string
          user_id: string
        }
        Insert: {
          group_id: string
          trait_id: string
          user_id?: string
        }
        Update: {
          group_id?: string
          trait_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "breeding_group_traits_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "breeding_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breeding_group_traits_trait_id_fkey"
            columns: ["trait_id"]
            isOneToOne: false
            referencedRelation: "traits"
            referencedColumns: ["id"]
          },
        ]
      }
      breeding_groups: {
        Row: {
          created_at: string
          ended_on: string | null
          goal: string | null
          group_code: string
          id: string
          name: string | null
          notes: string | null
          seq: number
          started_on: string
          tank_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ended_on?: string | null
          goal?: string | null
          group_code: string
          id?: string
          name?: string | null
          notes?: string | null
          seq: number
          started_on?: string
          tank_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          ended_on?: string | null
          goal?: string | null
          group_code?: string
          id?: string
          name?: string | null
          notes?: string | null
          seq?: number
          started_on?: string
          tank_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "breeding_groups_tank_id_fkey"
            columns: ["tank_id"]
            isOneToOne: false
            referencedRelation: "tanks"
            referencedColumns: ["id"]
          },
        ]
      }
      care_logs: {
        Row: {
          amount: string | null
          course_days: number | null
          created_at: string
          id: string
          item: string
          kind: string
          logged_on: string
          notes: string | null
          tank_id: string
          user_id: string
        }
        Insert: {
          amount?: string | null
          course_days?: number | null
          created_at?: string
          id?: string
          item: string
          kind: string
          logged_on?: string
          notes?: string | null
          tank_id: string
          user_id?: string
        }
        Update: {
          amount?: string | null
          course_days?: number | null
          created_at?: string
          id?: string
          item?: string
          kind?: string
          logged_on?: string
          notes?: string | null
          tank_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_logs_tank_id_fkey"
            columns: ["tank_id"]
            isOneToOne: false
            referencedRelation: "tanks"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_reminders: {
        Row: {
          created_at: string
          due_on: string
          fish_id: string | null
          id: string
          notes: string | null
          repeat_every_days: number | null
          tank_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          due_on: string
          fish_id?: string | null
          id?: string
          notes?: string | null
          repeat_every_days?: number | null
          tank_id?: string | null
          title: string
          user_id?: string
        }
        Update: {
          created_at?: string
          due_on?: string
          fish_id?: string | null
          id?: string
          notes?: string | null
          repeat_every_days?: number | null
          tank_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_reminders_fish_id_fkey"
            columns: ["fish_id"]
            isOneToOne: false
            referencedRelation: "fish"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_reminders_tank_id_fkey"
            columns: ["tank_id"]
            isOneToOne: false
            referencedRelation: "tanks"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          base_colour: number | null
          certificate_path: string | null
          cover_colours: number[]
          created_at: string
          evaluated_on: string
          event: string | null
          female_length_mm: number | null
          fish_id: string
          id: string
          judge: string | null
          kind: string
          locked_at: string | null
          male_id: string | null
          male_length_mm: number | null
          notes: string | null
          photo_path: string | null
          placement: string | null
          score_notes: Json
          score_reasons: Json
          scores: Json
          seal: string | null
          sex: string
          standard_year: number
          tail_standard: string | null
          total: number
          user_id: string
        }
        Insert: {
          base_colour?: number | null
          certificate_path?: string | null
          cover_colours?: number[]
          created_at?: string
          evaluated_on?: string
          event?: string | null
          female_length_mm?: number | null
          fish_id: string
          id?: string
          judge?: string | null
          kind: string
          locked_at?: string | null
          male_id?: string | null
          male_length_mm?: number | null
          notes?: string | null
          photo_path?: string | null
          placement?: string | null
          score_notes?: Json
          score_reasons?: Json
          scores?: Json
          seal?: string | null
          sex: string
          standard_year?: number
          tail_standard?: string | null
          total?: number
          user_id?: string
        }
        Update: {
          base_colour?: number | null
          certificate_path?: string | null
          cover_colours?: number[]
          created_at?: string
          evaluated_on?: string
          event?: string | null
          female_length_mm?: number | null
          fish_id?: string
          id?: string
          judge?: string | null
          kind?: string
          locked_at?: string | null
          male_id?: string | null
          male_length_mm?: number | null
          notes?: string | null
          photo_path?: string | null
          placement?: string | null
          score_notes?: Json
          score_reasons?: Json
          scores?: Json
          seal?: string | null
          sex?: string
          standard_year?: number
          tail_standard?: string | null
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_fish_id_fkey"
            columns: ["fish_id"]
            isOneToOne: false
            referencedRelation: "fish"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_male_id_fkey"
            columns: ["male_id"]
            isOneToOne: false
            referencedRelation: "fish"
            referencedColumns: ["id"]
          },
        ]
      }
      fish: {
        Row: {
          base_colour: number | null
          cover_colours: number[]
          created_at: string
          dam_id: string | null
          date_of_birth: string | null
          fish_code: string
          foundation: boolean
          generation: string | null
          id: string
          name: string | null
          notes: string | null
          origin: string
          original_breeder: string | null
          pick_reason: string | null
          previous_codes: string[]
          seq: number
          sex: string
          sire_id: string | null
          spawn_id: string | null
          status: string
          strain: string | null
          tail_standard: string
          tank_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          base_colour?: number | null
          cover_colours?: number[]
          created_at?: string
          dam_id?: string | null
          date_of_birth?: string | null
          fish_code: string
          foundation?: boolean
          generation?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          origin?: string
          original_breeder?: string | null
          pick_reason?: string | null
          previous_codes?: string[]
          seq: number
          sex?: string
          sire_id?: string | null
          spawn_id?: string | null
          status?: string
          strain?: string | null
          tail_standard: string
          tank_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          base_colour?: number | null
          cover_colours?: number[]
          created_at?: string
          dam_id?: string | null
          date_of_birth?: string | null
          fish_code?: string
          foundation?: boolean
          generation?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          origin?: string
          original_breeder?: string | null
          pick_reason?: string | null
          previous_codes?: string[]
          seq?: number
          sex?: string
          sire_id?: string | null
          spawn_id?: string | null
          status?: string
          strain?: string | null
          tail_standard?: string
          tank_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fish_dam_id_fkey"
            columns: ["dam_id"]
            isOneToOne: false
            referencedRelation: "fish"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fish_sire_id_fkey"
            columns: ["sire_id"]
            isOneToOne: false
            referencedRelation: "fish"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fish_spawn_id_fkey"
            columns: ["spawn_id"]
            isOneToOne: false
            referencedRelation: "spawns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fish_tank_id_fkey"
            columns: ["tank_id"]
            isOneToOne: false
            referencedRelation: "tanks"
            referencedColumns: ["id"]
          },
        ]
      }
      fish_genes: {
        Row: {
          copies: number
          fish_id: string
          gene_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          copies: number
          fish_id: string
          gene_id: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          copies?: number
          fish_id?: string
          gene_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fish_genes_fish_id_fkey"
            columns: ["fish_id"]
            isOneToOne: false
            referencedRelation: "fish"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fish_genes_gene_id_fkey"
            columns: ["gene_id"]
            isOneToOne: false
            referencedRelation: "genes"
            referencedColumns: ["id"]
          },
        ]
      }
      fish_moves: {
        Row: {
          fish_id: string
          from_tank_id: string | null
          id: string
          moved_at: string
          to_tank_id: string | null
          user_id: string
        }
        Insert: {
          fish_id: string
          from_tank_id?: string | null
          id?: string
          moved_at?: string
          to_tank_id?: string | null
          user_id?: string
        }
        Update: {
          fish_id?: string
          from_tank_id?: string | null
          id?: string
          moved_at?: string
          to_tank_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fish_moves_fish_id_fkey"
            columns: ["fish_id"]
            isOneToOne: false
            referencedRelation: "fish"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fish_moves_from_tank_id_fkey"
            columns: ["from_tank_id"]
            isOneToOne: false
            referencedRelation: "tanks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fish_moves_to_tank_id_fkey"
            columns: ["to_tank_id"]
            isOneToOne: false
            referencedRelation: "tanks"
            referencedColumns: ["id"]
          },
        ]
      }
      fish_photos: {
        Row: {
          created_at: string
          fish_id: string
          id: string
          storage_path: string
          taken_on: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fish_id: string
          id?: string
          storage_path: string
          taken_on?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          fish_id?: string
          id?: string
          storage_path?: string
          taken_on?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fish_photos_fish_id_fkey"
            columns: ["fish_id"]
            isOneToOne: false
            referencedRelation: "fish"
            referencedColumns: ["id"]
          },
        ]
      }
      fish_traits: {
        Row: {
          created_at: string
          fish_id: string
          id: string
          notes: string | null
          recorded_on: string
          score: number | null
          trait_id: string
          user_id: string
          value: string | null
        }
        Insert: {
          created_at?: string
          fish_id: string
          id?: string
          notes?: string | null
          recorded_on?: string
          score?: number | null
          trait_id: string
          user_id?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          fish_id?: string
          id?: string
          notes?: string | null
          recorded_on?: string
          score?: number | null
          trait_id?: string
          user_id?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fish_traits_fish_id_fkey"
            columns: ["fish_id"]
            isOneToOne: false
            referencedRelation: "fish"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fish_traits_trait_id_fkey"
            columns: ["trait_id"]
            isOneToOne: false
            referencedRelation: "traits"
            referencedColumns: ["id"]
          },
        ]
      }
      genes: {
        Row: {
          created_at: string
          id: string
          mode: string
          name: string
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mode: string
          name: string
          notes?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          mode?: string
          name?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      line_plans: {
        Row: {
          created_at: string
          dam_id: string | null
          id: string
          name: string
          notes: string | null
          sire_id: string | null
          steps: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dam_id?: string | null
          id?: string
          name: string
          notes?: string | null
          sire_id?: string | null
          steps?: Json
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          dam_id?: string | null
          id?: string
          name?: string
          notes?: string | null
          sire_id?: string | null
          steps?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "line_plans_dam_id_fkey"
            columns: ["dam_id"]
            isOneToOne: false
            referencedRelation: "fish"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "line_plans_sire_id_fkey"
            columns: ["sire_id"]
            isOneToOne: false
            referencedRelation: "fish"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          breeder_initials: string
          club: string | null
          country: string | null
          created_at: string
          crowded_per_gallon: number
          display_name: string
          id: string
          loss_min: number
          loss_percent: number
          temperature_unit: string
          test_every_days: number
        }
        Insert: {
          breeder_initials: string
          club?: string | null
          country?: string | null
          created_at?: string
          crowded_per_gallon?: number
          display_name?: string
          id: string
          loss_min?: number
          loss_percent?: number
          temperature_unit?: string
          test_every_days?: number
        }
        Update: {
          breeder_initials?: string
          club?: string | null
          country?: string | null
          created_at?: string
          crowded_per_gallon?: number
          display_name?: string
          id?: string
          loss_min?: number
          loss_percent?: number
          temperature_unit?: string
          test_every_days?: number
        }
        Relationships: []
      }
      reminder_snoozes: {
        Row: {
          reminder_key: string
          snoozed_until: string
          user_id: string
        }
        Insert: {
          reminder_key: string
          snoozed_until: string
          user_id?: string
        }
        Update: {
          reminder_key?: string
          snoozed_until?: string
          user_id?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          buyer: string | null
          created_at: string
          currency: string
          fish_id: string
          id: string
          notes: string | null
          price: number | null
          sold_on: string
          user_id: string
        }
        Insert: {
          buyer?: string | null
          created_at?: string
          currency?: string
          fish_id: string
          id?: string
          notes?: string | null
          price?: number | null
          sold_on?: string
          user_id?: string
        }
        Update: {
          buyer?: string | null
          created_at?: string
          currency?: string
          fish_id?: string
          id?: string
          notes?: string | null
          price?: number | null
          sold_on?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_fish_id_fkey"
            columns: ["fish_id"]
            isOneToOne: false
            referencedRelation: "fish"
            referencedColumns: ["id"]
          },
        ]
      }
      show_entries: {
        Row: {
          created_at: string
          evaluation_id: string | null
          fish_id: string
          id: string
          notes: string | null
          placement: string | null
          points: number | null
          show_class: string | null
          show_name: string
          shown_on: string
          user_id: string
        }
        Insert: {
          created_at?: string
          evaluation_id?: string | null
          fish_id: string
          id?: string
          notes?: string | null
          placement?: string | null
          points?: number | null
          show_class?: string | null
          show_name: string
          shown_on?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          evaluation_id?: string | null
          fish_id?: string
          id?: string
          notes?: string | null
          placement?: string | null
          points?: number | null
          show_class?: string | null
          show_name?: string
          shown_on?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "show_entries_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: true
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "show_entries_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: true
            referencedRelation: "fish_best_scores"
            referencedColumns: ["evaluation_id"]
          },
          {
            foreignKeyName: "show_entries_fish_id_fkey"
            columns: ["fish_id"]
            isOneToOne: false
            referencedRelation: "fish"
            referencedColumns: ["id"]
          },
        ]
      }
      spawn_events: {
        Row: {
          count: number | null
          created_at: string
          females: number | null
          for_sale: boolean
          happened_on: string
          id: string
          kind: string
          males: number | null
          notes: string | null
          reason: string | null
          sold_on: string | null
          spawn_id: string
          to_tank_id: string | null
          unknown: number | null
          user_id: string
        }
        Insert: {
          count?: number | null
          created_at?: string
          females?: number | null
          for_sale?: boolean
          happened_on?: string
          id?: string
          kind: string
          males?: number | null
          notes?: string | null
          reason?: string | null
          sold_on?: string | null
          spawn_id: string
          to_tank_id?: string | null
          unknown?: number | null
          user_id?: string
        }
        Update: {
          count?: number | null
          created_at?: string
          females?: number | null
          for_sale?: boolean
          happened_on?: string
          id?: string
          kind?: string
          males?: number | null
          notes?: string | null
          reason?: string | null
          sold_on?: string | null
          spawn_id?: string
          to_tank_id?: string | null
          unknown?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spawn_events_spawn_id_fkey"
            columns: ["spawn_id"]
            isOneToOne: false
            referencedRelation: "spawns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spawn_events_to_tank_id_fkey"
            columns: ["to_tank_id"]
            isOneToOne: false
            referencedRelation: "tanks"
            referencedColumns: ["id"]
          },
        ]
      }
      spawns: {
        Row: {
          born_on: string
          created_at: string
          dam_id: string | null
          fry_count: number
          generation: string | null
          group_id: string | null
          id: string
          notes: string | null
          seq: number
          sire_id: string | null
          spawn_code: string
          strain: string | null
          tank_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          born_on?: string
          created_at?: string
          dam_id?: string | null
          fry_count: number
          generation?: string | null
          group_id?: string | null
          id?: string
          notes?: string | null
          seq: number
          sire_id?: string | null
          spawn_code: string
          strain?: string | null
          tank_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          born_on?: string
          created_at?: string
          dam_id?: string | null
          fry_count?: number
          generation?: string | null
          group_id?: string | null
          id?: string
          notes?: string | null
          seq?: number
          sire_id?: string | null
          spawn_code?: string
          strain?: string | null
          tank_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spawns_dam_id_fkey"
            columns: ["dam_id"]
            isOneToOne: false
            referencedRelation: "fish"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spawns_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "breeding_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spawns_sire_id_fkey"
            columns: ["sire_id"]
            isOneToOne: false
            referencedRelation: "fish"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spawns_tank_id_fkey"
            columns: ["tank_id"]
            isOneToOne: false
            referencedRelation: "tanks"
            referencedColumns: ["id"]
          },
        ]
      }
      tanks: {
        Row: {
          created_at: string
          id: string
          name: string | null
          notes: string | null
          purpose: string
          seq: number
          size_gallons: number | null
          tank_code: string
          updated_at: string
          user_id: string
          water_change_every_days: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          notes?: string | null
          purpose: string
          seq: number
          size_gallons?: number | null
          tank_code: string
          updated_at?: string
          user_id?: string
          water_change_every_days?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          notes?: string | null
          purpose?: string
          seq?: number
          size_gallons?: number | null
          tank_code?: string
          updated_at?: string
          user_id?: string
          water_change_every_days?: number | null
        }
        Relationships: []
      }
      traits: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      water_changes: {
        Row: {
          changed_on: string
          created_at: string
          id: string
          notes: string | null
          percent: number | null
          tank_id: string
          user_id: string
        }
        Insert: {
          changed_on?: string
          created_at?: string
          id?: string
          notes?: string | null
          percent?: number | null
          tank_id: string
          user_id?: string
        }
        Update: {
          changed_on?: string
          created_at?: string
          id?: string
          notes?: string | null
          percent?: number | null
          tank_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "water_changes_tank_id_fkey"
            columns: ["tank_id"]
            isOneToOne: false
            referencedRelation: "tanks"
            referencedColumns: ["id"]
          },
        ]
      }
      water_tests: {
        Row: {
          ammonia: number | null
          created_at: string
          gh: number | null
          id: string
          kh: number | null
          nitrate: number | null
          nitrite: number | null
          notes: string | null
          ph: number | null
          tank_id: string
          temperature_c: number | null
          tested_on: string
          user_id: string
        }
        Insert: {
          ammonia?: number | null
          created_at?: string
          gh?: number | null
          id?: string
          kh?: number | null
          nitrate?: number | null
          nitrite?: number | null
          notes?: string | null
          ph?: number | null
          tank_id: string
          temperature_c?: number | null
          tested_on?: string
          user_id?: string
        }
        Update: {
          ammonia?: number | null
          created_at?: string
          gh?: number | null
          id?: string
          kh?: number | null
          nitrate?: number | null
          nitrite?: number | null
          notes?: string | null
          ph?: number | null
          tank_id?: string
          temperature_c?: number | null
          tested_on?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "water_tests_tank_id_fkey"
            columns: ["tank_id"]
            isOneToOne: false
            referencedRelation: "tanks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      fish_best_scores: {
        Row: {
          evaluated_on: string | null
          evaluation_id: string | null
          fish_id: string | null
          kind: string | null
          sex: string | null
          total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_fish_id_fkey"
            columns: ["fish_id"]
            isOneToOne: false
            referencedRelation: "fish"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      ihs_max_points: {
        Args: { category: string; sex: string }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
