
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "announcements": {
                  Row: {
                    "audience": string,"created_at": string,"created_by": string | null,"id": string,"text": string,"updated_at": string,"valid_until": string | null
                  }
                  Insert: {
                    "audience"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"text": string,"updated_at"?: string,"valid_until"?: string | null
                  }
                  Update: {
                    "audience"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"text"?: string,"updated_at"?: string,"valid_until"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "announcements_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "employees"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_log": {
                  Row: {
                    "action": string,"changed_at": string,"changed_by": string | null,"created_at": string,"date": string | null,"employee_id": string | null,"id": string,"new": Json | null,"old": Json | null,"reason": string | null,"row_id": string,"table_name": string
                  }
                  Insert: {
                    "action": string,"changed_at"?: string,"changed_by"?: string | null,"created_at"?: string,"date"?: string | null,"employee_id"?: string | null,"id"?: string,"new"?: Json | null,"old"?: Json | null,"reason"?: string | null,"row_id": string,"table_name": string
                  }
                  Update: {
                    "action"?: string,"changed_at"?: string,"changed_by"?: string | null,"created_at"?: string,"date"?: string | null,"employee_id"?: string | null,"id"?: string,"new"?: Json | null,"old"?: Json | null,"reason"?: string | null,"row_id"?: string,"table_name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"bookings": {
                  Row: {
                    "arrival": string,"created_at": string,"departure": string,"id": string,"label": string,"matchcode": string,"note": string | null,"updated_at": string
                  }
                  Insert: {
                    "arrival": string,"created_at"?: string,"departure": string,"id"?: string,"label": string,"matchcode": string,"note"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "arrival"?: string,"created_at"?: string,"departure"?: string,"id"?: string,"label"?: string,"matchcode"?: string,"note"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"employees": {
                  Row: {
                    "active": boolean,"contract": string,"created_at": string,"department": Database["public"]['Enums']["department"],"display_name": string,"id": string,"role": Database["public"]['Enums']["app_role"],"soll_min_day": number,"soll_min_month": number,"updated_at": string,"user_id": string | null
                  }
                  Insert: {
                    "active"?: boolean,"contract": string,"created_at"?: string,"department": Database["public"]['Enums']["department"],"display_name": string,"id"?: string,"role"?: Database["public"]['Enums']["app_role"],"soll_min_day"?: number,"soll_min_month"?: number,"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "active"?: boolean,"contract"?: string,"created_at"?: string,"department"?: Database["public"]['Enums']["department"],"display_name"?: string,"id"?: string,"role"?: Database["public"]['Enums']["app_role"],"soll_min_day"?: number,"soll_min_month"?: number,"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"meal_counts": {
                  Row: {
                    "allergies": NonNullable<Json>,"booking_id": string,"created_at": string,"date": string,"id": string,"meal": Database["public"]['Enums']["meal"],"mos": number,"note": string | null,"total": number,"updated_at": string,"veg": number,"vegan": number
                  }
                  Insert: {
                    "allergies"?: NonNullable<Json>,"booking_id": string,"created_at"?: string,"date": string,"id"?: string,"meal": Database["public"]['Enums']["meal"],"mos"?: number,"note"?: string | null,"total"?: number,"updated_at"?: string,"veg"?: number,"vegan"?: number
                  }
                  Update: {
                    "allergies"?: NonNullable<Json>,"booking_id"?: string,"created_at"?: string,"date"?: string,"id"?: string,"meal"?: Database["public"]['Enums']["meal"],"mos"?: number,"note"?: string | null,"total"?: number,"updated_at"?: string,"veg"?: number,"vegan"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "meal_counts_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    }
                  ]
                },"menu_items": {
                  Row: {
                    "created_at": string,"date": string,"dessert": string | null,"id": string,"main_dish": string,"meal": Database["public"]['Enums']["meal"],"updated_at": string,"veg_variant": string | null
                  }
                  Insert: {
                    "created_at"?: string,"date": string,"dessert"?: string | null,"id"?: string,"main_dish": string,"meal": Database["public"]['Enums']["meal"],"updated_at"?: string,"veg_variant"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"date"?: string,"dessert"?: string | null,"id"?: string,"main_dish"?: string,"meal"?: Database["public"]['Enums']["meal"],"updated_at"?: string,"veg_variant"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"push_tokens": {
                  Row: {
                    "created_at": string,"employee_id": string,"id": string,"platform": string,"token": string,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"employee_id": string,"id"?: string,"platform": string,"token": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"employee_id"?: string,"id"?: string,"platform"?: string,"token"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "push_tokens_employee_id_fkey"
      columns: ["employee_id"]
isOneToOne: false
      referencedRelation: "employees"
      referencedColumns: ["id"]
    }
                  ]
                },"room_tasks": {
                  Row: {
                    "assigned_to": string | null,"created_at": string,"date": string,"done_at": string | null,"id": string,"note": string | null,"room_id": string | null,"status": Database["public"]['Enums']["task_status"],"task_type": Database["public"]['Enums']["task_type"],"updated_at": string,"zone": string | null
                  }
                  Insert: {
                    "assigned_to"?: string | null,"created_at"?: string,"date": string,"done_at"?: string | null,"id"?: string,"note"?: string | null,"room_id"?: string | null,"status"?: Database["public"]['Enums']["task_status"],"task_type": Database["public"]['Enums']["task_type"],"updated_at"?: string,"zone"?: string | null
                  }
                  Update: {
                    "assigned_to"?: string | null,"created_at"?: string,"date"?: string,"done_at"?: string | null,"id"?: string,"note"?: string | null,"room_id"?: string | null,"status"?: Database["public"]['Enums']["task_status"],"task_type"?: Database["public"]['Enums']["task_type"],"updated_at"?: string,"zone"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "room_tasks_assigned_to_fkey"
      columns: ["assigned_to"]
isOneToOne: false
      referencedRelation: "employees"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "room_tasks_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "rooms"
      referencedColumns: ["id"]
    }
                  ]
                },"rooms": {
                  Row: {
                    "beds": number,"created_at": string,"floor": number,"has_bath": boolean,"id": string,"number": string,"updated_at": string
                  }
                  Insert: {
                    "beds": number,"created_at"?: string,"floor": number,"has_bath"?: boolean,"id"?: string,"number": string,"updated_at"?: string
                  }
                  Update: {
                    "beds"?: number,"created_at"?: string,"floor"?: number,"has_bath"?: boolean,"id"?: string,"number"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"shifts": {
                  Row: {
                    "break_min": number,"created_at": string,"date": string,"employee_id": string,"end1": number | null,"end2": number | null,"id": string,"note": string | null,"start1": number | null,"start2": number | null,"type": Database["public"]['Enums']["shift_type"],"updated_at": string
                  }
                  Insert: {
                    "break_min"?: number,"created_at"?: string,"date": string,"employee_id": string,"end1"?: number | null,"end2"?: number | null,"id"?: string,"note"?: string | null,"start1"?: number | null,"start2"?: number | null,"type": Database["public"]['Enums']["shift_type"],"updated_at"?: string
                  }
                  Update: {
                    "break_min"?: number,"created_at"?: string,"date"?: string,"employee_id"?: string,"end1"?: number | null,"end2"?: number | null,"id"?: string,"note"?: string | null,"start1"?: number | null,"start2"?: number | null,"type"?: Database["public"]['Enums']["shift_type"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "shifts_employee_id_fkey"
      columns: ["employee_id"]
isOneToOne: false
      referencedRelation: "employees"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "assign_room_task":
{ Args: { "p_employee_id": string,"p_id": string }; Returns: undefined
                           },
"audit_row_change":
{ Args: Record<PropertyKey, never>; Returns: unknown
                           },
"can_write_shifts_of":
{ Args: { "p_employee_id": string }; Returns: boolean
                           },
"current_app_role":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["app_role"]
                           },
"current_employee_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"delete_room_task":
{ Args: { "p_id": string,"p_reason": string }; Returns: undefined
                           },
"delete_shift":
{ Args: { "p_id": string,"p_reason": string }; Returns: undefined
                           },
"is_assignable_housekeeper":
{ Args: { "p_employee_id": string }; Returns: boolean
                           },
"is_valid_allergies":
{ Args: { "a": Json }; Returns: boolean
                           },
"meal_totals":
{ Args: { "from_date": string,"to_date": string }; Returns: { "date": string,"meal": Database["public"]['Enums']["meal"],"total": number,"veg": number,"vegan": number,"mos": number,"allergies": number }[]
                           },
"save_employee":
{ Args: { "p_contract": string,"p_department": Database["public"]['Enums']["department"],"p_display_name": string,"p_id": string,"p_reason": string,"p_role": Database["public"]['Enums']["app_role"],"p_soll_min_day": number,"p_soll_min_month": number }; Returns: string
                           },
"save_room_task":
{ Args: { "p_assigned_to": string,"p_date": string,"p_id": string,"p_note": string,"p_reason": string,"p_room_id": string,"p_task_type": Database["public"]['Enums']["task_type"],"p_zone": string }; Returns: string
                           },
"save_shift":
{ Args: { "p_break_min": number,"p_date": string,"p_employee_id": string,"p_end1": number,"p_end2": number,"p_note": string,"p_reason": string,"p_start1": number,"p_start2": number,"p_type": Database["public"]['Enums']["shift_type"] }; Returns: string
                           },
"set_employee_active":
{ Args: { "p_active": boolean,"p_id": string,"p_reason": string }; Returns: undefined
                           },
"set_task_status":
{ Args: { "p_id": string,"p_status": Database["public"]['Enums']["task_status"] }; Returns: undefined
                           },
"team_shifts":
{ Args: { "day": string }; Returns: { "employee_id": string,"display_name": string,"department": Database["public"]['Enums']["department"],"type": string,"start1": number,"end1": number,"start2": number,"end2": number }[]
                           }
          }
          Enums: {
            "app_role": "admin"|"kitchen_lead"|"staff","department": "kueche"|"housekeeping"|"bfd"|"rezeption","meal": "frueh"|"mittag"|"abend"|"lunchpaket"|"grill","shift_type": "normal"|"td"|"sem"|"urlaub"|"krank"|"frei","task_status": "offen"|"in_arbeit"|"erledigt","task_type": "abreise"|"bleiber"
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
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "app_role": ["admin", "kitchen_lead", "staff"],"department": ["kueche", "housekeeping", "bfd", "rezeption"],"meal": ["frueh", "mittag", "abend", "lunchpaket", "grill"],"shift_type": ["normal", "td", "sem", "urlaub", "krank", "frei"],"task_status": ["offen", "in_arbeit", "erledigt"],"task_type": ["abreise", "bleiber"]
          }
        }
} as const

