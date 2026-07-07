-- Local dev seed data. Populated once teams/products migrations exist.

-- Secrets consumed by the cron.sql migration's cron-cleanup job (net.http_post
-- call). Local-only values — the local anon key and Kong hostname are the same
-- for every local Supabase instance, and 'cron_secret' matches the placeholder
-- in supabase/functions/.env. Never put a real hosted secret here; those are
-- set once via the Studio SQL editor on the hosted project (see plan §13).
select vault.create_secret('http://supabase_kong_supabase-next-ts-team-app:8000', 'project_url');
select vault.create_secret('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0', 'anon_key');
select vault.create_secret('cron_secret', 'cron_secret');
