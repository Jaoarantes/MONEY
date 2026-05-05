-- Investments table migration for existing Supabase projects

CREATE TABLE IF NOT EXISTS investments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('fixed_income', 'stock', 'fii', 'crypto', 'fund', 'international', 'other')) NOT NULL DEFAULT 'other',
  broker TEXT NOT NULL DEFAULT '',
  invested_amount NUMERIC NOT NULL DEFAULT 0,
  current_value NUMERIC NOT NULL DEFAULT 0,
  monthly_yield NUMERIC NOT NULL DEFAULT 0,
  annual_yield NUMERIC NOT NULL DEFAULT 0,
  quantity NUMERIC,
  unit_price NUMERIC,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  liquidity TEXT CHECK (liquidity IN ('daily', 'short', 'medium', 'long', 'locked')) NOT NULL DEFAULT 'daily',
  risk TEXT CHECK (risk IN ('low', 'medium', 'high')) NOT NULL DEFAULT 'low',
  notes TEXT,
  color TEXT DEFAULT '#6C63FF',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only access their own investments" ON investments;
CREATE POLICY "Users can only access their own investments"
ON investments
FOR ALL
USING (auth.uid() = user_id);
