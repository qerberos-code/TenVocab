import 'react-native-url-polyfill/auto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Both values come from a gitignored .env (see .env.example). The anon key is a
// publishable key by design; row-level security on the server is what limits it.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// null when unconfigured, so every caller degrades to offline behaviour instead of crashing
export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
