import { createClient } from '@supabase/supabase-js';

// Laden der Supabase-Zugangsdaten. 
// Falls du eine .env-Datei nutzt, werden die process.env-Werte geladen.
// Falls nicht, greift automatisch dein funktionierender Original-Schlüssel als Fallback!
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://vmygwsriszswyimfgqnr.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'sb_publishable_iYqj3XTtsQQ9s7AxAEDZqw_h8U3Og_q'; 
// Hinweis: Sollte die Verbindung immer noch blockieren, stelle sicher, dass der Anon-Key 
// exakt deinem funktionierenden Original aus dem vorherigen Backup entspricht.

// Initialisierung des Supabase-Clients
export const supabase = createClient(supabaseUrl, supabaseAnonKey);