// Hand-written types matching supabase/migrations/0001_init.sql. Kept small
// and manual since this project has only two tables — no codegen needed.
export interface Database {
  public: {
    Tables: {
      pandals: {
        Row: {
          id: string;
          name: string;
          organizer_name: string;
          contact_phone: string;
          address: string;
          lat: number;
          lng: number;
          event_date: string;
          timing_text: string;
          description: string | null;
          image_url: string;
          banner_image_urls: string[] | null;
          banner_payment_proof_url: string | null;
          banner_paid: boolean;
          user_id: string | null;
          status: "pending" | "approved" | "rejected";
          edit_requested: boolean;
          edit_unlocked: boolean;
          admin_note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          organizer_name: string;
          contact_phone: string;
          address: string;
          lat: number;
          lng: number;
          event_date: string;
          timing_text: string;
          description?: string | null;
          image_url: string;
          banner_image_urls?: string[] | null;
          banner_payment_proof_url?: string | null;
          banner_paid?: boolean;
          user_id?: string | null;
          status?: "pending" | "approved" | "rejected";
          edit_requested?: boolean;
          edit_unlocked?: boolean;
          admin_note?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["pandals"]["Insert"]>;
        Relationships: [];
      };
      sponsors: {
        Row: {
          id: string;
          pandal_id: string | null;
          sponsor_name: string;
          contact_phone: string;
          banner_image_url: string | null;
          banner_image_urls: string[] | null;
          link_url: string | null;
          payment_proof_url: string;
          status: "pending" | "approved" | "rejected";
          expires_at: string | null;
          user_id: string | null;
          placement: "map" | "card";
          created_at: string;
        };
        Insert: {
          id?: string;
          pandal_id?: string | null;
          sponsor_name: string;
          contact_phone: string;
          banner_image_url?: string | null;
          banner_image_urls?: string[] | null;
          link_url?: string | null;
          payment_proof_url: string;
          status?: "pending" | "approved" | "rejected";
          expires_at?: string | null;
          user_id?: string | null;
          placement?: "map" | "card";
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["sponsors"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "sponsors_pandal_id_fkey";
            columns: ["pandal_id"];
            isOneToOne: false;
            referencedRelation: "pandals";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_settings: {
        Row: {
          id: boolean;
          upi_id: string;
          qr_image_url: string | null;
        };
        Insert: {
          id?: boolean;
          upi_id?: string;
          qr_image_url?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["payment_settings"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
