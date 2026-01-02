-- ================================================
-- MILLION DOLLAR JOURNEY - Seed Data
-- ================================================

DO $$
DECLARE
    user_uuid UUID;
BEGIN
    SELECT id INTO user_uuid FROM auth.users LIMIT 1;

    IF user_uuid IS NOT NULL THEN
        INSERT INTO account_categories (user_id, name, type, icon, color, sort_order)
        VALUES
            (user_uuid, 'Stocks & ETFs', 'asset', 'trending-up', '#10B981', 1),
            (user_uuid, 'Crypto', 'asset', 'bitcoin', '#F59E0B', 2),
            (user_uuid, 'Savings Accounts', 'asset', 'piggy-bank', '#3B82F6', 3),
            (user_uuid, 'Cash', 'asset', 'wallet', '#6366F1', 4),
            (user_uuid, 'Real Estate', 'asset', 'home', '#8B5CF6', 5),
            (user_uuid, 'Retirement', 'asset', 'landmark', '#EC4899', 6),
            (user_uuid, 'Loans', 'liability', 'credit-card', '#EF4444', 10),
            (user_uuid, 'Mortgage', 'liability', 'home', '#DC2626', 11)
        ON CONFLICT (user_id, name) DO NOTHING;

        INSERT INTO milestones (user_id, name, target_amount_usd)
        VALUES
            (user_uuid, 'First $1,000', 1000),
            (user_uuid, 'First $10,000', 10000),
            (user_uuid, 'First $50,000', 50000),
            (user_uuid, 'First $100,000', 100000),
            (user_uuid, 'Quarter Million', 250000),
            (user_uuid, 'Half Million', 500000),
            (user_uuid, 'Three Quarters', 750000),
            (user_uuid, 'MILLIONAIRE!', 1000000)
        ON CONFLICT DO NOTHING;

        RAISE NOTICE 'Seed data inserted for user: %', user_uuid;
    ELSE
        RAISE NOTICE 'No users found. Create a user first.';
    END IF;
END $$;
