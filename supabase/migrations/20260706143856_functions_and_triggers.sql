create or replace function public.handle_new_user()
    returns trigger
    language plpgsql
    security definer
    set search_path = public
as $$
begin
    insert into public.profiles (id, display_name, avatar_url)
    values (
               new.id,
               coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
               new.raw_user_meta_data->>'avatar_url'
           );
    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

create or replace function public.get_my_team_id()
    returns uuid
    language sql
    stable
    security definer
    set search_path = public
as $$
select team_id from public.profiles where id = auth.uid();
$$;

create or replace function public.generate_invite_code()
    returns text
    language plpgsql
as $$
declare
    chars text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    result text := '';
begin
    for i in 1..6 loop
            result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
        end loop;
    return result;
end;
$$;

create or replace function public.create_team(p_name text)
    returns public.teams
    language plpgsql
    security definer
    set search_path = public
as $$
declare
    v_team public.teams;
    v_code text;
    v_attempts int := 0;
begin
    if auth.uid() is null then
        raise exception 'Unauthorized' using errcode = '28000';
    end if;

    if (select team_id from public.profiles where id = auth.uid() for update) is not null then
        raise exception 'User already belongs to a team' using errcode = '23505';
    end if;

    loop
        v_code := public.generate_invite_code();
        v_attempts := v_attempts + 1;
        begin
            insert into public.teams (name, invite_code, created_by)
            values (p_name, v_code, auth.uid())
            returning * into v_team;
            exit;
        exception when unique_violation then
            if v_attempts >= 5 then
                raise exception 'Could not generate a unique invite code, please retry';
            end if;
        end;
    end loop;

    update public.profiles set team_id = v_team.id where id = auth.uid();
    return v_team;
end;
$$;

create or replace function public.join_team(p_invite_code text)
    returns public.teams
    language plpgsql
    security definer
    set search_path = public
as $$
declare
    v_team public.teams;
begin
    if auth.uid() is null then
        raise exception 'Unauthorized' using errcode = '28000';
    end if;

    if (select team_id from public.profiles where id = auth.uid() for update) is not null then
        raise exception 'User already belongs to a team' using errcode = '23505';
    end if;

    select * into v_team from public.teams where invite_code = upper(trim(p_invite_code));
    if not found then
        raise exception 'Invalid invite code' using errcode = 'P0002';
    end if;

    update public.profiles set team_id = v_team.id where id = auth.uid();
    return v_team;
end;
$$;

create or replace function public.enforce_product_rules()
    returns trigger
    language plpgsql
as $$
begin
    if OLD.status = 'deleted' then
        raise exception 'Deleted products cannot be modified' using errcode = '23514';
    end if;

    if OLD.status = 'active' and (
        NEW.title is distinct from OLD.title or
        NEW.description is distinct from OLD.description or
        NEW.image_path is distinct from OLD.image_path
        ) then
        raise exception 'Active products cannot be edited, only their status can change' using errcode = '23514';
    end if;

    if OLD.status = 'active' and NEW.status = 'draft' then
        raise exception 'Cannot revert an active product back to draft' using errcode = '23514';
    end if;

    if NEW.status = 'deleted' and OLD.status <> 'deleted' then
        NEW.deleted_at := now();
    end if;

    -- authorship/team are set once on insert; block spoofing via a crafted update body
    NEW.created_by := OLD.created_by;
    NEW.team_id := OLD.team_id;

    NEW.updated_at := now();
    return NEW;
end;
$$;

create trigger products_before_update
    before update on public.products
    for each row execute function public.enforce_product_rules();