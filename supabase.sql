create table if not exists public.movies (
  id bigint generated always as identity primary key,
  list_id text,
  tmdb_id integer not null,
  title text not null,
  poster_url text,
  watched boolean not null default false,
  rating numeric(2,1),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.movies add column if not exists list_id text;

update public.movies
set list_id = 'main'
where list_id is null or btrim(list_id) = '';

alter table public.movies alter column list_id set default 'main';
alter table public.movies alter column list_id set not null;

alter table public.movies alter column tmdb_id set not null;
alter table public.movies alter column title set not null;
alter table public.movies alter column watched set default false;
alter table public.movies alter column watched set not null;
alter table public.movies alter column created_at set default timezone('utc', now());
alter table public.movies alter column created_at set not null;
alter table public.movies alter column updated_at set default timezone('utc', now());
alter table public.movies alter column updated_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'movies_rating_check'
      and conrelid = 'public.movies'::regclass
  ) then
    alter table public.movies
      add constraint movies_rating_check check (
        rating is null
        or (
          rating >= 0.5
          and rating <= 5.0
          and mod((rating * 10)::integer, 5) = 0
        )
      );
  end if;
end $$;

alter table public.movies drop constraint if exists movies_tmdb_id_key;

create unique index if not exists movies_list_id_tmdb_id_key
  on public.movies (list_id, tmdb_id);

create index if not exists movies_list_id_idx
  on public.movies (list_id);

create or replace function public.set_movies_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_movies_updated_at on public.movies;
create trigger set_movies_updated_at
before update on public.movies
for each row
execute function public.set_movies_updated_at();

alter table public.movies disable row level security;

revoke all on table public.movies from anon, authenticated;
grant all on table public.movies to service_role;

revoke all on sequence public.movies_id_seq from anon, authenticated;
grant usage, select on sequence public.movies_id_seq to service_role;
