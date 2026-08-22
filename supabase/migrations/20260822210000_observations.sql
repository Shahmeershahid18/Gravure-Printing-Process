-- Add photo_path to observations
alter table observations add column photo_path text;

-- Insert storage bucket
insert into storage.buckets (id, name, public) 
values ('observation_photos', 'observation_photos', true)
on conflict (id) do nothing;

-- Set up RLS for observation_photos
create policy "Authenticated users can upload observation photos"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'observation_photos' );

create policy "Anyone can view observation photos"
on storage.objects for select
to public
using ( bucket_id = 'observation_photos' );

create policy "Authenticated users can delete observation photos"
on storage.objects for delete
to authenticated
using ( bucket_id = 'observation_photos' );
