import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../../utils/constants';

// Reuse existing client across Vite HMR reloads to avoid duplicate GoTrueClient warnings.
const existing = import.meta.hot?.data?.supabase;
export const supabase = existing || createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
if (import.meta.hot) import.meta.hot.data.supabase = supabase;

export default supabase;
