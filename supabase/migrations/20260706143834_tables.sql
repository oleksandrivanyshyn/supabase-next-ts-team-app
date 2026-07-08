create table public.teams (
                              id uuid primary key default gen_random_uuid(),
                              name text not null check (char_length(name) between 1 and 80),
                              invite_code text not null unique,
                              created_by uuid not null references auth.users(id),
                              created_at timestamptz not null default now()
);

create table public.profiles (
                                 id uuid primary key references auth.users(id) on delete cascade,
                                 team_id uuid references public.teams(id) on delete set null,
                                 display_name text not null,
                                 avatar_url text,
                                 created_at timestamptz not null default now()
);

create table public.products (
                                 id uuid primary key default gen_random_uuid(),
                                 team_id uuid not null references public.teams(id) on delete cascade,
                                 title text not null check (char_length(title) between 1 and 200),
                                 description text not null default '',
                                 image_path text,
                                 status public.product_status not null default 'draft',
                                 created_by uuid not null references public.profiles(id),
                                 created_at timestamptz not null default now(),
                                 updated_at timestamptz not null default now(),
                                 deleted_at timestamptz,
                                 fts tsvector generated always as (
                                     to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, ''))
                                     ) stored
);

create index idx_profiles_team_id     on public.profiles(team_id);
create index idx_products_team_created on public.products(team_id, created_at desc);
create index idx_products_status      on public.products(status);
create index idx_products_created_at on public.products(created_at);
create index idx_products_created_by on public.products(created_by);
create index idx_products_fts        on public.products using gin(fts);

alter table public.teams    enable row level security;
alter table public.profiles enable row level security;
alter table public.products enable row level security;