import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

let client = null;
let configurationError = "";

if (!url || !key) {
  configurationError = "Supabase environment variables are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in Netlify.";
} else {
  try {
    client = createClient(url, key);
  } catch (error) {
    configurationError = "Supabase configuration is invalid: " + (error?.message || String(error));
  }
}

export const supabase = client;
export const supabaseConfigurationError = configurationError;
