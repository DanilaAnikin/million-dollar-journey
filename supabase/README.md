# Supabase Database Setup

## Step 1: Create Tables

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `schema.sql`
4. Click **Run**

## Step 2: Verify Tables

After running the schema, you should see these tables:
- `profiles`
- `account_categories`
- `accounts`
- `transactions`
- `exchange_rates`
- `milestones`

## Step 3: Create a User

1. Go to **Authentication** > **Users**
2. Click **Add User** > **Create New User**
3. Enter an email and password
4. Note the user's UUID

## Step 4: Seed Data

1. Go back to **SQL Editor**
2. Run `seed.sql` to create default categories and milestones
3. (Optional) Run `seed-dev.sql` to add dummy accounts for testing

## Troubleshooting

### RLS Policy Errors
If you get "permission denied" errors, make sure:
1. You're authenticated
2. RLS policies are properly set up
3. You're querying your own data

### Missing auth.users reference
The schema references `auth.users`. This table is created automatically by Supabase Auth.

## Fixing Auth Trigger Issues

If you encounter the error `Database error saving new user` when signing up, run the following SQL in your Supabase SQL Editor:

1. Go to **Supabase Dashboard** > **SQL Editor**
2. Copy the contents of `fix_auth_trigger.sql`
3. Click **Run**

This will recreate the trigger that automatically creates user profiles on signup.
