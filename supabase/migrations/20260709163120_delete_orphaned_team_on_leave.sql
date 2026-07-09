-- Once the last member leaves, the team row would otherwise sit in the DB
-- forever: RLS makes it invisible to everyone (nobody's team_id matches it
-- anymore), yet it's never deleted, and its invite_code stays permanently
-- burned. No ownership/role concept exists in this app (brief has none), so
-- this isn't about who's "allowed" to delete the team — it's just cleanup of
-- a row nobody can ever reach again. products.team_id already cascades on
-- team delete, so its products go with it; their Storage images are not
-- cleaned up here (same accepted class of gap as the existing
-- PATCH-replace-image orphan case noted in cron-cleanup's design).
create or replace function public.leave_team()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized' using errcode = '28000';
  end if;

  select team_id into v_team_id from public.profiles where id = auth.uid();
  if v_team_id is null then
    raise exception 'User does not belong to a team' using errcode = 'P0002';
  end if;

  update public.profiles set team_id = null where id = auth.uid();

  if not exists (select 1 from public.profiles where team_id = v_team_id) then
    delete from public.teams where id = v_team_id;
  end if;
end;
$$;
