import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️ Advertencia: SUPABASE_URL o SUPABASE_SERVICE_KEY no están configurados en .env');
}

export const supabase = createClient(supabaseUrl || '', supabaseServiceKey || '');
