create extension if not exists "pgcrypto";

create table public.daily_targets (
  user_id uuid references auth.users(id) primary key,
  calories integer not null default 2000,
  protein integer not null default 150,
  carbs integer not null default 200,
  fat integer not null default 65,
  updated_at timestamptz default now()
);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  date date not null,
  meal_type text not null check (meal_type in ('cafe','almoco','lanche','jantar')),
  time text not null,               -- formato 'HH:MM'
  description text,
  items jsonb not null default '[]', -- [{nome, porcao, calorias, proteina, carboidrato, gordura}]
  calories numeric not null default 0,
  protein numeric not null default 0,
  carbs numeric not null default 0,
  fat numeric not null default 0,
  created_at timestamptz default now()
);

create index meals_user_date_idx on public.meals (user_id, date);

alter table public.meals enable row level security;
alter table public.daily_targets enable row level security;

create policy "usuario_ve_proprias_refeicoes" on public.meals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "usuario_ve_proprias_metas" on public.daily_targets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
