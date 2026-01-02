-- ================================================
-- DEVELOPMENT SEED DATA
-- ================================================

DO $$
DECLARE
    user_uuid UUID;
    cat_stocks UUID;
    cat_crypto UUID;
    cat_savings UUID;
    cat_cash UUID;
BEGIN
    SELECT id INTO user_uuid FROM auth.users LIMIT 1;

    IF user_uuid IS NULL THEN
        RAISE EXCEPTION 'No users found. Create a user first.';
    END IF;

    SELECT id INTO cat_stocks FROM account_categories WHERE user_id = user_uuid AND name = 'Stocks & ETFs' LIMIT 1;
    SELECT id INTO cat_crypto FROM account_categories WHERE user_id = user_uuid AND name = 'Crypto' LIMIT 1;
    SELECT id INTO cat_savings FROM account_categories WHERE user_id = user_uuid AND name = 'Savings Accounts' LIMIT 1;
    SELECT id INTO cat_cash FROM account_categories WHERE user_id = user_uuid AND name = 'Cash' LIMIT 1;

    INSERT INTO accounts (user_id, category_id, name, currency, balance, is_investment, interest_rate_pa, institution)
    VALUES
        (user_uuid, cat_stocks, 'Interactive Brokers', 'USD', 5000.00, true, 8.0, 'IBKR'),
        (user_uuid, cat_stocks, 'Fio e-Broker', 'CZK', 25000.00, true, 8.0, 'Fio banka'),
        (user_uuid, cat_crypto, 'Binance', 'USD', 1500.00, true, 8.0, 'Binance'),
        (user_uuid, cat_crypto, 'Ledger Wallet', 'USD', 3000.00, true, 8.0, 'Hardware'),
        (user_uuid, cat_savings, 'CSOB Savings', 'CZK', 50000.00, false, 4.5, 'CSOB'),
        (user_uuid, cat_savings, 'Raiffeisen', 'EUR', 1000.00, false, 3.0, 'Raiffeisenbank'),
        (user_uuid, cat_cash, 'Cash CZK', 'CZK', 15000.00, false, 0.0, NULL),
        (user_uuid, cat_cash, 'Cash EUR', 'EUR', 200.00, false, 0.0, NULL)
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Dev seed data inserted for user: %', user_uuid;
END $$;
