-- ================================================
-- MILLION DOLLAR JOURNEY - Database Schema
-- ================================================
-- Target: $1,000,000 USD by October 31, 2036
-- Birth Date: October 31, 2006
-- ================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- TABLE: profiles
-- Extends Supabase Auth users table
-- ================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    preferred_currency TEXT NOT NULL DEFAULT 'CZK' CHECK (preferred_currency IN ('CZK', 'USD', 'EUR')),
    target_date DATE NOT NULL DEFAULT '2036-10-31',
    target_amount_usd NUMERIC(15, 2) NOT NULL DEFAULT 1000000.00,
    birth_date DATE DEFAULT '2006-10-31',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================
-- TABLE: account_categories
-- Categories for organizing accounts
-- ================================================
CREATE TABLE IF NOT EXISTS account_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('asset', 'liability')),
    icon TEXT,
    color TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- ================================================
-- TABLE: accounts
-- Individual financial accounts
-- ================================================
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES account_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    currency TEXT NOT NULL CHECK (currency IN ('CZK', 'USD', 'EUR')),
    balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    is_investment BOOLEAN NOT NULL DEFAULT FALSE,
    interest_rate_pa NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    institution TEXT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================
-- TABLE: transactions
-- Financial transactions
-- ================================================
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL,
    currency TEXT NOT NULL CHECK (currency IN ('CZK', 'USD', 'EUR')),
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer', 'adjustment', 'interest')),
    transfer_to_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    category TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================
-- TABLE: exchange_rates
-- Cached exchange rates from API
-- ================================================
CREATE TABLE IF NOT EXISTS exchange_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    currency_pair TEXT NOT NULL UNIQUE,
    rate NUMERIC(15, 6) NOT NULL,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================
-- TABLE: milestones
-- Track progress milestones
-- ================================================
CREATE TABLE IF NOT EXISTS milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_amount_usd NUMERIC(15, 2) NOT NULL,
    achieved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================
-- INDEXES for performance
-- ================================================
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_category_id ON accounts(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_account_categories_user_id ON account_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_pair ON exchange_rates(currency_pair);
CREATE INDEX IF NOT EXISTS idx_milestones_user_id ON milestones(user_id);

-- ================================================
-- FUNCTION: Auto-update updated_at timestamps
-- ================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- TRIGGERS: Auto-update timestamps
-- ================================================
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_account_categories_updated_at ON account_categories;
CREATE TRIGGER update_account_categories_updated_at
    BEFORE UPDATE ON account_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_accounts_updated_at ON accounts;
CREATE TRIGGER update_accounts_updated_at
    BEFORE UPDATE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- FUNCTION & TRIGGER: Auto-create profile on signup
-- ================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        preferred_currency,
        target_date,
        target_amount_usd,
        birth_date,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        'CZK',
        '2036-10-31'::date,
        1000000.00,
        '2006-10-31'::date,
        NOW(),
        NOW()
    );
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        RETURN NEW;
    WHEN OTHERS THEN
        RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- Grant permissions to auth admin
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON TABLE public.profiles TO supabase_auth_admin;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Account Categories policies
DROP POLICY IF EXISTS "Users can view own categories" ON account_categories;
CREATE POLICY "Users can view own categories"
    ON account_categories FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own categories" ON account_categories;
CREATE POLICY "Users can create own categories"
    ON account_categories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own categories" ON account_categories;
CREATE POLICY "Users can update own categories"
    ON account_categories FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own categories" ON account_categories;
CREATE POLICY "Users can delete own categories"
    ON account_categories FOR DELETE
    USING (auth.uid() = user_id);

-- Accounts policies
DROP POLICY IF EXISTS "Users can view own accounts" ON accounts;
CREATE POLICY "Users can view own accounts"
    ON accounts FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own accounts" ON accounts;
CREATE POLICY "Users can create own accounts"
    ON accounts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own accounts" ON accounts;
CREATE POLICY "Users can update own accounts"
    ON accounts FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own accounts" ON accounts;
CREATE POLICY "Users can delete own accounts"
    ON accounts FOR DELETE
    USING (auth.uid() = user_id);

-- Transactions policies
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
CREATE POLICY "Users can view own transactions"
    ON transactions FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own transactions" ON transactions;
CREATE POLICY "Users can create own transactions"
    ON transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
CREATE POLICY "Users can update own transactions"
    ON transactions FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions;
CREATE POLICY "Users can delete own transactions"
    ON transactions FOR DELETE
    USING (auth.uid() = user_id);

-- Milestones policies
DROP POLICY IF EXISTS "Users can view own milestones" ON milestones;
CREATE POLICY "Users can view own milestones"
    ON milestones FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own milestones" ON milestones;
CREATE POLICY "Users can create own milestones"
    ON milestones FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own milestones" ON milestones;
CREATE POLICY "Users can update own milestones"
    ON milestones FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own milestones" ON milestones;
CREATE POLICY "Users can delete own milestones"
    ON milestones FOR DELETE
    USING (auth.uid() = user_id);

-- Exchange Rates: Public read access
DROP POLICY IF EXISTS "Anyone can view exchange rates" ON exchange_rates;
CREATE POLICY "Anyone can view exchange rates"
    ON exchange_rates FOR SELECT
    TO authenticated
    USING (true);

-- ================================================
-- SEED: Default exchange rates
-- ================================================
INSERT INTO exchange_rates (currency_pair, rate) VALUES
    ('USD/CZK', 23.50),
    ('EUR/CZK', 25.20),
    ('EUR/USD', 1.07),
    ('USD/EUR', 0.93),
    ('CZK/USD', 0.0426),
    ('CZK/EUR', 0.0397)
ON CONFLICT (currency_pair) DO UPDATE SET
    rate = EXCLUDED.rate,
    last_updated = NOW();
