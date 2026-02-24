-- 0. CLEANUP (CAUTION: CLEARS DATA - Use only for initial setup or reset)
-- drop table if exists tracking_logs;
-- drop table if exists diet_versions;
-- drop table if exists diets;
-- drop table if exists foods;
-- drop table if exists profiles;

-- 1. PROFILES TABLE
create table if not exists profiles (
  id uuid references auth.users not null primary key,
  name text,
  role text default 'CREATOR',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table profiles enable row level security;

create policy "Users can read own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);


-- 2. FOODS TABLE
create table if not exists foods (
  id text primary key, -- Changed to text to support frontend IDs
  name text not null,
  base_unit text not null,
  calories numeric default 0,
  protein numeric default 0,
  carbs numeric default 0,
  fats numeric default 0,
  image_url text,
  created_by uuid references auth.users, -- Reference auth.users directly for safety
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table foods enable row level security;

-- Allow read access to everyone (authenticated, anon, etc)
create policy "Public read foods" on foods for select using (true);
-- Allow creator to add foods
create policy "Auth users insert foods" on foods for insert with check (auth.uid() = created_by);
create policy "Auth users update own foods" on foods for update using (auth.uid() = created_by);
create policy "Auth users delete own foods" on foods for delete using (auth.uid() = created_by);


-- 3. DIETS TABLE
create table if not exists diets (
  id text primary key, -- Changed to text
  name text not null,
  coach_id uuid references auth.users not null,
  client_email text,
  current_version_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table diets enable row level security;

create policy "Coach manage diets" on diets for all using (auth.uid() = coach_id);
-- Allow clients to read if they have the link (simulated by checking if ID exists in query?)
-- Simpler: If user is anon (Client), allow read if they know the ID (handled by select query by ID).
-- But RLS needs a condition.
-- For "Shared Link" access without login, we rely on the backend/policy.
-- If user is Client role (anon login), we can allow them to read diets where they are not the coach?
-- Or allow public read for diets?
create policy "Public read diets" on diets for select using (true);


-- 4. DIET VERSIONS TABLE
create table if not exists diet_versions (
  id text primary key,
  diet_id text references diets(id) on delete cascade not null,
  version_number integer not null,
  content jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table diet_versions enable row level security;

create policy "Public read versions" on diet_versions for select using (true);
create policy "Coach manage versions" on diet_versions for all using (
  exists (select 1 from diets where id = diet_versions.diet_id and coach_id = auth.uid())
);


-- 5. TRACKING LOGS
create table if not exists tracking_logs (
  id uuid default gen_random_uuid() primary key,
  diet_version_id text references diet_versions(id) not null,
  user_id uuid references auth.users,
  date text not null,
  completed_meal_ids jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(diet_version_id, date, user_id)
);

alter table tracking_logs enable row level security;

create policy "Enable tracking" on tracking_logs for all using (true);


-- 6. TRIGGERS
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'Guest User'),
    coalesce(new.raw_user_meta_data->>'role', 'CREATOR')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
