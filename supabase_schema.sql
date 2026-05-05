-- SQL Schema for Luxury Dark Finance App (Supabase)

-- 1. Create CATEGORIES table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('income', 'expense', 'both')) NOT NULL,
  icon TEXT,
  color TEXT,
  budget NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create TRANSACTIONS table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('income', 'expense')) NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL,
  category UUID REFERENCES categories(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  tags TEXT[],
  recurrent BOOLEAN DEFAULT FALSE,
  recurrence_frequency TEXT,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create GOALS table
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount NUMERIC NOT NULL,
  current_amount NUMERIC DEFAULT 0,
  deadline DATE,
  category UUID REFERENCES categories(id) ON DELETE SET NULL,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create BUDGETS table
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- Format 'YYYY-MM'
  "limit" NUMERIC NOT NULL,
  spent NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create INVESTMENTS table
CREATE TABLE investments (
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

-- 6. Enable Row Level Security (RLS)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS Policies
CREATE POLICY "Users can only access their own categories" ON categories FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access their own transactions" ON transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access their own goals" ON goals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access their own budgets" ON budgets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access their own investments" ON investments FOR ALL USING (auth.uid() = user_id);
