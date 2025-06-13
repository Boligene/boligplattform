export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      boliger: {
        Row: {
          adresse: string | null
          bilde: string | null
          bruker_id: string
          bruksareal: string | null
          bruksareal_m2: number | null
          byggeaar: string | null
          byggeaar_tall: number | null
          eiendomsskatt: string | null
          eiendomsskatt_kr: number | null
          eierform: string | null
          felleskostnader: string | null
          felleskostnader_kr: number | null
          id: string
          kommunale_avg_kr: number | null
          kommunaleAvg: string | null
          lenke: string | null
          oppdatert: string | null
          opprettet: string | null
          pris: number | null
          status: string | null
          tittel: string | null
          type: string | null
        }
        Insert: {
          adresse?: string | null
          bilde?: string | null
          bruker_id: string
          bruksareal?: string | null
          bruksareal_m2?: number | null
          byggeaar?: string | null
          byggeaar_tall?: number | null
          eiendomsskatt?: string | null
          eiendomsskatt_kr?: number | null
          eierform?: string | null
          felleskostnader?: string | null
          felleskostnader_kr?: number | null
          id?: string
          kommunale_avg_kr?: number | null
          kommunaleAvg?: string | null
          lenke?: string | null
          oppdatert?: string | null
          opprettet?: string | null
          pris?: number | null
          status?: string | null
          tittel?: string | null
          type?: string | null
        }
        Update: {
          adresse?: string | null
          bilde?: string | null
          bruker_id?: string
          bruksareal?: string | null
          bruksareal_m2?: number | null
          byggeaar?: string | null
          byggeaar_tall?: number | null
          eiendomsskatt?: string | null
          eiendomsskatt_kr?: number | null
          eierform?: string | null
          felleskostnader?: string | null
          felleskostnader_kr?: number | null
          id?: string
          kommunale_avg_kr?: number | null
          kommunaleAvg?: string | null
          lenke?: string | null
          oppdatert?: string | null
          opprettet?: string | null
          pris?: number | null
          status?: string | null
          tittel?: string | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      offentlige_boliger: {
        Row: {
          adresse: string | null
          bilde: string | null
          bruksareal_m2: number | null
          byggeaar_tall: number | null
          eiendomsskatt_kr: number | null
          eierform: string | null
          felleskostnader_kr: number | null
          id: string | null
          kommunale_avg_kr: number | null
          opprettet: string | null
          pris: number | null
          tittel: string | null
          type: string | null
        }
        Insert: {
          adresse?: string | null
          bilde?: string | null
          bruksareal_m2?: number | null
          byggeaar_tall?: number | null
          eiendomsskatt_kr?: number | null
          eierform?: string | null
          felleskostnader_kr?: number | null
          id?: string | null
          kommunale_avg_kr?: number | null
          opprettet?: string | null
          pris?: number | null
          tittel?: string | null
          type?: string | null
        }
        Update: {
          adresse?: string | null
          bilde?: string | null
          bruksareal_m2?: number | null
          byggeaar_tall?: number | null
          eiendomsskatt_kr?: number | null
          eierform?: string | null
          felleskostnader_kr?: number | null
          id?: string | null
          kommunale_avg_kr?: number | null
          opprettet?: string | null
          pris?: number | null
          tittel?: string | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

// Convenience types for the boliger table
export type Bolig = Tables<'boliger'>
export type BoligInsert = TablesInsert<'boliger'>
export type BoligUpdate = TablesUpdate<'boliger'>
export type OffentligBolig = Tables<'offentlige_boliger'>

// Enums for better type safety
export type BoligType = 'leilighet' | 'enebolig' | 'rekkehus' | 'tomannsbolig' | 'villa' | 'hybel'
export type Eierform = 'selveier' | 'andel' | 'aksje' | 'annet'
export type BoligStatus = 'aktiv' | 'solgt' | 'utleid' | 'inaktiv' 