-- Secrets (project_url, anon_key, cron_secret) are seeded per-environment via
-- vault.create_secret() — locally in seed.sql, on hosted projects once via the
-- Studio SQL editor — never hardcoded here. See ai/IMPLEMENTATION_PLAN.md §9.
select cron.schedule(
               'cleanup-deleted-products',
               '0 3 * * *',
               $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/cron-cleanup',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key'),
                 'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
               ),
    body    := jsonb_build_object('triggeredAt', now())
  );
  $$
     );