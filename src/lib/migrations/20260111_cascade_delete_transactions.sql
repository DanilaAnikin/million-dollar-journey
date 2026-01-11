-- Migration: Add CASCADE DELETE to transactions when account is deleted
-- This ensures orphaned transactions are automatically removed when an account is hard-deleted

-- Drop the existing foreign key constraint (if it exists)
ALTER TABLE transactions
DROP CONSTRAINT IF EXISTS transactions_account_id_fkey;

-- Recreate with ON DELETE CASCADE
ALTER TABLE transactions
ADD CONSTRAINT transactions_account_id_fkey
FOREIGN KEY (account_id)
REFERENCES accounts(id)
ON DELETE CASCADE;
