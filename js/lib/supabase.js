// Cliente de Supabase. Importamos el SDK desde esm.sh (compatible con módulos ES nativos del navegador).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = "https://epyzxfchztyplrckxgku.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Kp51g56NtEMf2RRaj_0jtQ_QYjVB-o8";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
