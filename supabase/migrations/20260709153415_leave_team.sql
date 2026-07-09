-- leave_team(): lets a user leave their current team, so they can create or
-- join another one. Keeps the "one team at a time" invariant (brief 2b) without
-- locking a user in forever. security definer + auth.uid() guard so a caller can
-- only ever clear their own membership. Products keep their team_id (owned by the
-- team, not the user). Mirrors create_team/join_team's shape.
create or replace function public.leave_team()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Unauthorized' using errcode = '28000';
  end if;

  if (select team_id from public.profiles where id = auth.uid()) is null then
    raise exception 'User does not belong to a team' using errcode = 'P0002';
  end if;

  update public.profiles set team_id = null where id = auth.uid();
end;
$$;
