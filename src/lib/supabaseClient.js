import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Loud in dev, harmless in prod builds where env vars are set correctly.
  // eslint-disable-next-line no-console
  console.error(
    "[SixInsider] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. " +
      "Create a .env file locally (see .env.example) and set the same " +
      "vars in your Vercel/Netlify project settings."
  );
}

export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "");
