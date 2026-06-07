// Thesis Supabase database types.
// Regenerated from the schema in supabase/migrations via `supabase gen types`.
// Until the schema lands, this is a permissive placeholder.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Tables: Record<string, any>;
    Views: Record<string, never>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Functions: Record<string, any>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
