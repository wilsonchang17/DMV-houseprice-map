// src/supabaseClient.js

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://spzokewcnqapyrxsndpl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwem9rZXdjbnFhcHlyeHNuZHBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwMjUyNTcsImV4cCI6MjA1ODYwMTI1N30.gA0b5aaL50vRHoYL2sckJwd5ELkeeUipc4xBYcn2O7E';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);