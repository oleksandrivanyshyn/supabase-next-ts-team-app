grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on public.teams to authenticated, service_role;
grant select, insert, update, delete on public.profiles to authenticated, service_role;
grant select, insert, update, delete on public.products to authenticated, service_role;

create policy "profiles_select_self_or_team"
    on public.profiles for select
    to authenticated
    using (id = (select auth.uid()) or team_id = (select public.get_my_team_id()));

create policy "profiles_update_self"
    on public.profiles for update
    to authenticated
    using (id = (select auth.uid()))
    with check (id = (select auth.uid()));

-- profiles_update_self's `using`/`with check` only guard *which row* can be
-- touched, not *which columns* — without this, a client could PATCH their
-- own team_id directly via PostgREST, bypassing create_team/join_team
-- entirely (no invite code, no "already has a team" guard) and instantly
-- gaining RLS access to any team whose id they know. Column-level GRANTs are
-- enforced independently of RLS, so restricting to the two genuinely
-- self-editable columns closes this without touching the policy itself.
-- create_team/join_team are unaffected: they run security definer as the
-- table owner, which isn't subject to authenticated's column grants.
revoke update on public.profiles from authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;

create policy "teams_select_own"
    on public.teams for select
    to authenticated
    using (id = (select public.get_my_team_id()));

create policy "products_select_team"
    on public.products for select
    to authenticated
    using (team_id = (select public.get_my_team_id()));

create policy "products_insert_team"
    on public.products for insert
    to authenticated
    with check (
    team_id = (select public.get_my_team_id())
        and created_by = (select auth.uid())
    );

create policy "products_update_team"
    on public.products for update
    to authenticated
    using (team_id = (select public.get_my_team_id()))
    with check (team_id = (select public.get_my_team_id()));