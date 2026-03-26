-- Add color column to goals table
ALTER TABLE goals ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#00D26A';
