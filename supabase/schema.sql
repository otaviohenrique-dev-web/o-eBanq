-- Rode este arquivo inteiro no Supabase: SQL Editor > New query > Run.

create table if not exists autorizados (
  email text primary key,
  nome text
);

create table if not exists transacoes (
  id uuid primary key default gen_random_uuid(),
  autor_email text not null,
  escopo text not null default 'pessoal' check (escopo in ('pessoal', 'casal')),
  tipo text not null check (tipo in ('entrada', 'saida')),
  descricao text not null,
  valor numeric(12, 2) not null check (valor > 0),
  categoria text not null check (categoria in ('necessidade', 'lazer', 'economia')),
  data date not null,
  criado_em timestamptz not null default now()
);

alter table autorizados enable row level security;
alter table transacoes enable row level security;

-- security definer evita recursão de política na própria tabela autorizados
create or replace function eh_autorizado()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from autorizados
    where lower(email) = lower(auth.jwt() ->> 'email')
  );
$$;

drop policy if exists "autorizados leem" on autorizados;
create policy "autorizados leem" on autorizados
  for select to authenticated using (eh_autorizado());

drop policy if exists "ler transacoes" on transacoes;
create policy "ler transacoes" on transacoes
  for select to authenticated using (eh_autorizado());

drop policy if exists "criar transacoes proprias" on transacoes;
create policy "criar transacoes proprias" on transacoes
  for insert to authenticated
  with check (eh_autorizado() and lower(autor_email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "apagar transacoes proprias" on transacoes;
create policy "apagar transacoes proprias" on transacoes
  for delete to authenticated
  using (eh_autorizado() and lower(autor_email) = lower(auth.jwt() ->> 'email'));

-- Troque pelos e-mails Google que podem acessar (em minúsculas).
insert into autorizados (email, nome) values
  ('tecproduz@gmail.com', 'Otávio')
  -- , ('email.do.par@gmail.com', 'Nome do par')
on conflict (email) do nothing;
