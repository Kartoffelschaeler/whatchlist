drop table if exists public.movies cascade;

create table public.movies (
  id bigint generated always as identity primary key,
  tmdb_id integer not null unique,
  title text not null,
  poster_url text,
  watched boolean not null default false,
  rating numeric(2,1),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint movies_rating_check check (
    rating is null
    or (
      rating >= 0.5
      and rating <= 5.0
      and mod((rating * 10)::integer, 5) = 0
    )
  )
);

create or replace function public.set_movies_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger set_movies_updated_at
before update on public.movies
for each row
execute function public.set_movies_updated_at();

alter table public.movies disable row level security;

revoke all on table public.movies from anon, authenticated;
grant all on table public.movies to service_role;

revoke all on sequence public.movies_id_seq from anon, authenticated;
grant usage, select on sequence public.movies_id_seq to service_role;
