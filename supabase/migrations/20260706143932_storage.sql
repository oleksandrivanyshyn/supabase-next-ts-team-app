insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'product-images',
    'product-images',
    false,
    5242880, -- 5 MB
    array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
);

create policy "product_images_select_team"
    on storage.objects for select
    to authenticated
    using (
    bucket_id = 'product-images'
        and (storage.foldername(name))[1] = (select public.get_my_team_id())::text
    );

create policy "product_images_insert_team"
    on storage.objects for insert
    to authenticated
    with check (
    bucket_id = 'product-images'
        and (storage.foldername(name))[1] = (select public.get_my_team_id())::text
    );

create policy "product_images_update_team"
    on storage.objects for update
    to authenticated
    using (
    bucket_id = 'product-images'
        and (storage.foldername(name))[1] = (select public.get_my_team_id())::text
    );

create policy "product_images_delete_team"
    on storage.objects for delete
    to authenticated
    using (
    bucket_id = 'product-images'
        and (storage.foldername(name))[1] = (select public.get_my_team_id())::text
    );