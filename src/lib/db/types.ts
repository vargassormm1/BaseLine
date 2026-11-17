
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "auth_rate_limits": {
                  Row: {
                    "bucket": string,"hits": number,"user_id": string,"window_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bucket": string,"hits": number,"user_id": string,"window_start": string
                  }
                  Update: {
                    "bucket"?: string,"hits"?: number,"user_id"?: string,"window_start"?: string
                  }
                  Relationships: [
                    
                  ]
                },"challenges": {
                  Row: {
                    "challenger": string,"closed_at": string | null,"created_at": string,"expires_at": string,"format": number,"id": string,"message": string | null,"opponent": string,"proposed_for": string | null,"responded_at": string | null,"status": Database["public"]['Enums']["challenge_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "challenger": string,"closed_at"?: string | null,"created_at"?: string,"expires_at"?: string,"format": number,"id"?: string,"message"?: string | null,"opponent": string,"proposed_for"?: string | null,"responded_at"?: string | null,"status"?: Database["public"]['Enums']["challenge_status"]
                  }
                  Update: {
                    "challenger"?: string,"closed_at"?: string | null,"created_at"?: string,"expires_at"?: string,"format"?: number,"id"?: string,"message"?: string | null,"opponent"?: string,"proposed_for"?: string | null,"responded_at"?: string | null,"status"?: Database["public"]['Enums']["challenge_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "challenges_challenger_fkey"
      columns: ["challenger"]
isOneToOne: false
      referencedRelation: "players"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "challenges_opponent_fkey"
      columns: ["opponent"]
isOneToOne: false
      referencedRelation: "players"
      referencedColumns: ["id"]
    }
                  ]
                },"invites": {
                  Row: {
                    "code_hash": string,"created_at": string,"created_by": string,"expires_at": string,"used_at": string | null,"used_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "code_hash": string,"created_at"?: string,"created_by": string,"expires_at"?: string,"used_at"?: string | null,"used_by"?: string | null
                  }
                  Update: {
                    "code_hash"?: string,"created_at"?: string,"created_by"?: string,"expires_at"?: string,"used_at"?: string | null,"used_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "invites_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "players"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invites_used_by_fkey"
      columns: ["used_by"]
isOneToOne: true
      referencedRelation: "players"
      referencedColumns: ["id"]
    }
                  ]
                },"match_sets": {
                  Row: {
                    "is_match_tiebreak": boolean,"match_id": string,"p1_games": number,"p1_tiebreak": number | null,"p2_games": number,"p2_tiebreak": number | null,"set_number": number
                  }
                  ComputedFields: never
                  Insert: {
                    "is_match_tiebreak"?: boolean,"match_id": string,"p1_games": number,"p1_tiebreak"?: number | null,"p2_games": number,"p2_tiebreak"?: number | null,"set_number": number
                  }
                  Update: {
                    "is_match_tiebreak"?: boolean,"match_id"?: string,"p1_games"?: number,"p1_tiebreak"?: number | null,"p2_games"?: number,"p2_tiebreak"?: number | null,"set_number"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "match_sets_match_id_fkey"
      columns: ["match_id"]
isOneToOne: false
      referencedRelation: "matches"
      referencedColumns: ["id"]
    }
                  ]
                },"matches": {
                  Row: {
                    "challenge_id": string | null,"client_key": string | null,"confirmed_at": string | null,"created_at": string,"deciding_set": string,"format": number,"id": string,"legacy_match_id": number | null,"note": string | null,"played_on": string,"player_one": string,"player_two": string,"points_awarded": number,"responded_at": string | null,"status": Database["public"]['Enums']["match_status"],"void_reason": string | null,"voided_at": string | null,"voided_by": string | null,"winner_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "challenge_id"?: string | null,"client_key"?: string | null,"confirmed_at"?: string | null,"created_at"?: string,"deciding_set"?: string,"format": number,"id"?: string,"legacy_match_id"?: number | null,"note"?: string | null,"played_on": string,"player_one": string,"player_two": string,"points_awarded": number,"responded_at"?: string | null,"status"?: Database["public"]['Enums']["match_status"],"void_reason"?: string | null,"voided_at"?: string | null,"voided_by"?: string | null,"winner_id": string
                  }
                  Update: {
                    "challenge_id"?: string | null,"client_key"?: string | null,"confirmed_at"?: string | null,"created_at"?: string,"deciding_set"?: string,"format"?: number,"id"?: string,"legacy_match_id"?: number | null,"note"?: string | null,"played_on"?: string,"player_one"?: string,"player_two"?: string,"points_awarded"?: number,"responded_at"?: string | null,"status"?: Database["public"]['Enums']["match_status"],"void_reason"?: string | null,"voided_at"?: string | null,"voided_by"?: string | null,"winner_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "matches_challenge_id_fkey"
      columns: ["challenge_id"]
isOneToOne: false
      referencedRelation: "challenges"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matches_player_one_fkey"
      columns: ["player_one"]
isOneToOne: false
      referencedRelation: "players"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matches_player_two_fkey"
      columns: ["player_two"]
isOneToOne: false
      referencedRelation: "players"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matches_voided_by_fkey"
      columns: ["voided_by"]
isOneToOne: false
      referencedRelation: "players"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matches_winner_id_fkey"
      columns: ["winner_id"]
isOneToOne: false
      referencedRelation: "players"
      referencedColumns: ["id"]
    }
                  ]
                },"player_private": {
                  Row: {
                    "email": string | null,"player_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "email"?: string | null,"player_id": string
                  }
                  Update: {
                    "email"?: string | null,"player_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "player_private_player_id_fkey"
      columns: ["player_id"]
isOneToOne: true
      referencedRelation: "players"
      referencedColumns: ["id"]
    }
                  ]
                },"players": {
                  Row: {
                    "auth_user_id": string | null,"avatar_path": string | null,"avatar_url": string | null,"clerk_user_id": string | null,"created_at": string,"first_name": string,"id": string,"is_admin": boolean,"last_name": string,"legacy_user_id": number | null,"updated_at": string,"username": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auth_user_id"?: string | null,"avatar_path"?: string | null,"avatar_url"?: string | null,"clerk_user_id"?: string | null,"created_at"?: string,"first_name"?: string,"id"?: string,"is_admin"?: boolean,"last_name"?: string,"legacy_user_id"?: number | null,"updated_at"?: string,"username": string
                  }
                  Update: {
                    "auth_user_id"?: string | null,"avatar_path"?: string | null,"avatar_url"?: string | null,"clerk_user_id"?: string | null,"created_at"?: string,"first_name"?: string,"id"?: string,"is_admin"?: boolean,"last_name"?: string,"legacy_user_id"?: number | null,"updated_at"?: string,"username"?: string
                  }
                  Relationships: [
                    
                  ]
                },"rate_limits": {
                  Row: {
                    "bucket": string,"hits": number,"player_id": string,"window_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bucket": string,"hits": number,"player_id": string,"window_start": string
                  }
                  Update: {
                    "bucket"?: string,"hits"?: number,"player_id"?: string,"window_start"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "rate_limits_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "players"
      referencedColumns: ["id"]
    }
                  ]
                },"standing_adjustments": {
                  Row: {
                    "created_at": string,"id": number,"losses": number,"player_id": string,"points": number,"reason": string,"source": string,"wins": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: never,"losses"?: number,"player_id": string,"points"?: number,"reason": string,"source": string,"wins"?: number
                  }
                  Update: {
                    "created_at"?: string,"id"?: never,"losses"?: number,"player_id"?: string,"points"?: number,"reason"?: string,"source"?: string,"wins"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "standing_adjustments_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "players"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "app_today":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"avatar_upload_ticket":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"cancel_challenge":
{ Args: { "p_challenge": string }; Returns: undefined
                           },
"cancel_match":
{ Args: { "p_match": string }; Returns: undefined
                           },
"create_challenge":
{ Args: { "p_format": number,"p_message"?: string,"p_opponent": string,"p_proposed_for"?: string }; Returns: string
                           },
"create_invite":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"ensure_player":
{ Args: { "p_first_name": string,"p_invite"?: string,"p_last_name": string,"p_username": string }; Returns: string
                           },
"expire_challenges":
{ Args: { "p_a": string,"p_b": string }; Returns: undefined
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"me":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"my_avatar_count":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"points_for":
{ Args: { "p_format": number }; Returns: number
                           },
"record_match":
{ Args: { "p_allow_duplicate"?: boolean,"p_challenge"?: string,"p_client_key": string,"p_deciding": string,"p_format": number,"p_note"?: string,"p_opponent": string,"p_played_on": string,"p_sets": Json }; Returns: string
                           },
"require_me":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"respond_challenge":
{ Args: { "p_accept": boolean,"p_challenge": string }; Returns: string
                           },
"respond_match":
{ Args: { "p_accept": boolean,"p_match": string }; Returns: undefined
                           },
"set_avatar":
{ Args: { "p_path"?: string }; Returns: string
                           },
"take_rate_limit":
{ Args: { "p_bucket": string,"p_max": number,"p_player": string,"p_window": string }; Returns: undefined
                           },
"update_profile":
{ Args: { "p_first_name": string,"p_last_name": string,"p_username": string }; Returns: undefined
                           },
"validate_sets":
{ Args: { "p_deciding": string,"p_format": number,"p_sets": Json }; Returns: number
                           },
"void_match":
{ Args: { "p_match": string,"p_reason": string }; Returns: undefined
                           }
          }
          Enums: {
            "challenge_status": "pending"|"accepted"|"declined"|"canceled"|"expired"|"completed","match_status": "pending"|"confirmed"|"rejected"|"canceled"|"voided"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "challenge_status": ["pending", "accepted", "declined", "canceled", "expired", "completed"],"match_status": ["pending", "confirmed", "rejected", "canceled", "voided"]
          }
        }
} as const
