import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_KEY;

if (!url || !key) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_KEY. Copy .env.example to .env.local.");
}

/** Browser client. All access is limited by row-level security on the database, whatever this UI shows. */
export const supabase = createClient(url, key);
