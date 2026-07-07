create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

create type public.product_status as enum ('draft', 'active', 'deleted');