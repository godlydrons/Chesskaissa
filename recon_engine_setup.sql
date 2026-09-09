-- Recon Engine Database Schema
-- Deliverable 1: Supabase Database Strategy

-- 1. Create the recon_jobs table to track asynchronous scanning tasks
CREATE TABLE IF NOT EXISTS recon_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  target_lichess_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'pending', 'completed', 'failed')),
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE recon_jobs ENABLE ROW LEVEL SECURITY;

-- 3. Create Security Policies
-- Users can only see and manage their own scanning jobs
CREATE POLICY "Users can insert their own recon jobs" ON recon_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own recon jobs" ON recon_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own recon jobs" ON recon_jobs
  FOR UPDATE USING (auth.uid() = user_id);

-- 4. CRITICAL: Enable Supabase Realtime for this specific table
-- This allows the mobile app to subscribe to row changes via WebSockets
BEGIN;
  -- Remove the table from publication if it exists to avoid errors
  -- ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS recon_jobs;
  
  -- Add the table to the realtime publication
  ALTER PUBLICATION supabase_realtime ADD TABLE recon_jobs;
COMMIT;

-- 5. Trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_recon_jobs_updated_at
    BEFORE UPDATE ON recon_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
