import { createClient } from '@supabase/supabase-js';
import type { Database } from './types/database.types';

const supabaseUrl = (typeof window !== 'undefined' && (window as any).VITE_SUPABASE_URL) || 
  process.env.VITE_SUPABASE_URL || 
  'https://your-project.supabase.co';

const supabaseKey = (typeof window !== 'undefined' && (window as any).VITE_SUPABASE_ANON_KEY) || 
  process.env.VITE_SUPABASE_ANON_KEY || 
  'your-anon-key';
 
export const supabase = createClient<Database>(supabaseUrl, supabaseKey); 