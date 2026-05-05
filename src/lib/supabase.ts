import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Legacy singleton — prefer supabase-browser.ts or supabase-server.ts */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
