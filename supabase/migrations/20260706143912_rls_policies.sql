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