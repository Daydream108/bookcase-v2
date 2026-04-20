const DEFAULT_SUPABASE_URL = 'https://dnkjfbxjsicqbtwoqhao.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_pdVL01ViHeW-eH9JeNA5lA_UCucJTm8'

// These are public client credentials, so repo-safe fallbacks are fine here.
// Cloudflare's Git builds do not always inject NEXT_PUBLIC_* vars during prerender.
export const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? DEFAULT_SUPABASE_URL

export const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? DEFAULT_SUPABASE_ANON_KEY
