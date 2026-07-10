import { createClient } from '@supabase/supabase-js';

// TODO: Ersetze diese beiden Werte mit deinen echten Supabase-Daten!
const supabaseUrl = 'https://vmygwsriszswyimfgqnr.supabase.co';
const supabaseAnonKey = 'sb_publishable_iYqj3XTtsQQ9s7AxAEDZqw_h8U3Og_q';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);