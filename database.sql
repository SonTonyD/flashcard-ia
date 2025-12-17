create table libraries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

create table folders (
  id uuid primary key default gen_random_uuid(),
  library_id uuid not null references libraries(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

create table decks (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null references folders(id) on delete cascade,
  title text not null,
  description text,
  difficulty text,
  objective text,
  created_at timestamptz default now()
);

create table flashcards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references decks(id) on delete cascade,
  front text not null,
  back text not null,
  status text not null default 'NEW',
  created_at timestamptz default now()
);

create index idx_libraries_user_id on libraries(user_id);
create index idx_folders_library_id on folders(library_id);
create index idx_decks_folder_id on decks(folder_id);
create index idx_flashcards_deck_id on flashcards(deck_id);


alter table libraries enable row level security;
alter table folders enable row level security;
alter table decks enable row level security;
alter table flashcards enable row level security;


create policy "Libraries: user access only"
on libraries
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());


create policy "Folders: user access via library"
on folders
for all
using (
  library_id in (
    select id from libraries where user_id = auth.uid()
  )
);

create policy "Decks: user access via folder"
on decks
for all
using (
  folder_id in (
    select f.id
    from folders f
    join libraries l on l.id = f.library_id
    where l.user_id = auth.uid()
  )
);

create policy "Flashcards: user access via deck"
on flashcards
for all
using (
  deck_id in (
    select d.id
    from decks d
    join folders f on f.id = d.folder_id
    join libraries l on l.id = f.library_id
    where l.user_id = auth.uid()
  )
);

