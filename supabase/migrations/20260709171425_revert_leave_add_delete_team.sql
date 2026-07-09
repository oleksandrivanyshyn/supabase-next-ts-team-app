-- Revert the previous migration's "delete team when last member leaves"
-- behavior: leaving is a routine, non-destructive action, but that change
-- made it silently and irreversibly destroy the team + all its products
-- when the last member left, with no separate confirmation for that
-- specific case. Back to: leave only ever clears the caller's own
-- membership.
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

-- delete_team(): an explicit, separate destructive action, restricted to
-- teams.created_by (already an existing column, unused until now — this
-- avoids building a full role/ownership system, which the brief doesn't
-- ask for and explicitly says to avoid ("no need to implement difficult
-- logic"): the brief's own product model already grants every team member
-- full read/write/delete rights over all products regardless of authorship,
-- so a full role system would only protect the team row itself while
-- leaving the actual data (products) equally exposed to any member — a
-- worse trade than a single ownership check on an already-existing column.
-- profiles.team_id -> teams(id) is "on delete set null" and products.team_id
-- -> teams(id) is "on delete cascade", so deleting the team automatically
-- evicts every remaining member and removes their products; Storage images
-- are not cleaned up here (same accepted class of gap noted elsewhere).
create or replace function public.delete_team()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
  v_created_by uuid;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized' using errcode = '28000';
  end if;

  select team_id into v_team_id from public.profiles where id = auth.uid();
  if v_team_id is null then
    raise exception 'User does not belong to a team' using errcode = 'P0002';
  end if;

  select created_by into v_created_by from public.teams where id = v_team_id;
  if v_created_by is distinct from auth.uid() then
    raise exception 'Only the team creator can delete the team' using errcode = '42501';
  end if;

  delete from public.teams where id = v_team_id;
end;
$$;
