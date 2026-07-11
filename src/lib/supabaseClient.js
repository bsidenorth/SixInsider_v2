import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  // Loud in dev, and visible in Vercel's runtime logs too.
  // eslint-disable-next-line no-console
  console.error(
    "[SixInsider] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. " +
      "Set both in your .env locally AND in Vercel/Netlify > Project Settings " +
      "> Environment Variables, then redeploy."
  );
}

// IMPORTANT: createClient() throws immediately if given an invalid/empty
// URL, which would crash the whole app at import time (blank screen,
// nothing rendered, no error shown to the user). We fall back to a
// harmless placeholder URL when unconfigured so the app can still boot
// and show a proper "setup needed" message via isSupabaseConfigured.
export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : "https://placeholder.supabase.co",
  isSupabaseConfigured ? supabaseAnonKey : "placeholder-anon-key"
);
