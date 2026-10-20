-- Rode este arquivo no Supabase: SQL Editor > New query > Run.
-- Depende do schema.sql (função eh_autorizado e tabela autorizados).

-- Renda fixa mensal (salário): conta automaticamente em todo mês entre inicio e fim.
create table if not exists rendas_fixas (
  id uuid primary key default gen_random_uuid(),
  autor_email text not null,
  descricao text not null,
  valor numeric(12, 2) not null check (valor > 0),
  dia int not null default 5 check (dia between 1 and 28),
  inicio text not null check (inicio ~ '^\d{4}-\d{2}$'),
  fim text check (fim is null or fim ~ '^\d{4}-\d{2}$'),
  criado_em timestamptz not null default now()
);

-- Compras a prazo: geram uma parcela por mês a partir de "primeira".
create table if not exists parcelamentos (
  id uuid primary key default gen_random_uuid(),
  autor_email text not null,
  escopo text not null default 'pessoal' check (escopo in ('pessoal', 'casal')),
  descricao text not null,
  valor_total numeric(12, 2) not null check (valor_total > 0),
  parcelas int not null check (parcelas between 2 and 120),
  primeira text not null check (primeira ~ '^\d{4}-\d{2}$'),
  categoria text not null check (categoria in ('necessidade', 'lazer', 'economia')),
  criado_em timestamptz not null default now()
);

alter table rendas_fixas enable row level security;
alter table parcelamentos enable row level security;

drop policy if exists "ler rendas" on rendas_fixas;
create policy "ler rendas" on rendas_fixas
  for select to authenticated using (eh_autorizado());

drop policy if exists "criar rendas proprias" on rendas_fixas;
create policy "criar rendas proprias" on rendas_fixas
  for insert to authenticated
  with check (eh_autorizado() and lower(autor_email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "editar rendas proprias" on rendas_fixas;
create policy "editar rendas proprias" on rendas_fixas
  for update to authenticated
  using (eh_autorizado() and lower(autor_email) = lower(auth.jwt() ->> 'email'))
  with check (eh_autorizado() and lower(autor_email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "apagar rendas proprias" on rendas_fixas;
create policy "apagar rendas proprias" on rendas_fixas
  for delete to authenticated
  using (eh_autorizado() and lower(autor_email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "ler parcelamentos" on parcelamentos;
create policy "ler parcelamentos" on parcelamentos
  for select to authenticated using (eh_autorizado());

drop policy if exists "criar parcelamentos proprios" on parcelamentos;
create policy "criar parcelamentos proprios" on parcelamentos
  for insert to authenticated
  with check (eh_autorizado() and lower(autor_email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "apagar parcelamentos proprios" on parcelamentos;
create policy "apagar parcelamentos proprios" on parcelamentos
  for delete to authenticated
  using (eh_autorizado() and lower(autor_email) = lower(auth.jwt() ->> 'email'));
