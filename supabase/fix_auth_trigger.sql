-- ================================================
-- FIX: Auth Trigger for Profile Creation
-- ================================================
-- This script fixes the trigger that automatically creates
-- a profile when a new user signs up.
--
-- RUN THIS IN YOUR SUPABASE SQL EDITOR!
-- ================================================

-- Step 1: Drop the existing trigger (if exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 2: Drop the existing function (if exists)
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 3: Recreate the function with explicit defaults and error handling
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
        -- Profile already exists, ignore
        RETURN NEW;
    WHEN OTHERS THEN
        -- Log error but don't fail the signup
        RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- Step 4: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON TABLE public.profiles TO supabase_auth_admin;

-- Step 5: Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Step 6: Verify the function exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'on_auth_user_created'
    ) THEN
        RAISE NOTICE 'SUCCESS: Trigger on_auth_user_created has been created!';
    ELSE
        RAISE WARNING 'WARNING: Trigger was not created properly.';
    END IF;
END $$;

-- ================================================
-- ALTERNATIVE: If the trigger still fails, you can
-- create profiles manually after signup by running
-- this SQL for existing users without profiles:
-- ================================================
-- INSERT INTO public.profiles (id, preferred_currency, target_date, target_amount_usd)
-- SELECT
--     au.id,
--     'CZK',
--     '2036-10-31'::date,
--     1000000.00
-- FROM auth.users au
-- LEFT JOIN public.profiles p ON au.id = p.id
-- WHERE p.id IS NULL;
