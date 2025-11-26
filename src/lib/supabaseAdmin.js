// lib/supabaseAdmin.js  ← ТОЛЬКО ДЛЯ АДМИНКИ!
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY; // ← service_role!

if (!supabaseServiceKey) {
  console.error("ОШИБКА: Не найден REACT_APP_SUPABASE_SERVICE_KEY в .env");
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);