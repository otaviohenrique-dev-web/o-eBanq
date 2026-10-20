import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const configurado = Boolean(url && chave);

export const supabase = createClient(
  url ?? "https://placeholder.supabase.co",
  chave ?? "placeholder",
);
