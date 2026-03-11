import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://chrwixhpvgokojohhlhd.supabase.co'  // ← reemplazá
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNocndpeGhwdmdva29qb2hobGhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzUzMDMsImV4cCI6MjA4ODY1MTMwM30.OJdLg4d6lmo3erITLrnL1yoCm1KlovQ4E435TyD76ak'                  // ← reemplazá

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)