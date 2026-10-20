-- Rode este arquivo no Supabase: SQL Editor > New query > Run.
-- Depende do schema.sql e do 02-renda-fixa-e-parcelas.sql.

-- Bancos / contas de cada pessoa (Nubank, Itaú, dinheiro na carteira...).
create table if not exists contas (
  id uuid primary key default gen_random_uuid(),
  autor_email text not null,
  nome text not null,
  cor text not null default '#2a78d6',
  saldo_inicial numeric(12, 2) not null default 0,
  criado_em timestamptz not null default now()
);

alter table contas enable row level security;

drop policy if exists "ler contas" on contas;
create policy "ler contas" on contas
  for select to authenticated using (eh_autorizado());

drop policy if exists "criar contas proprias" on contas;
create policy "criar contas proprias" on contas
  for insert to authenticated
  with check (eh_autorizado() and lower(autor_email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "editar contas proprias" on contas;
create policy "editar contas proprias" on contas
  for update to authenticated
  using (eh_autorizado() and lower(autor_email) = lower(auth.jwt() ->> 'email'))
  with check (eh_autorizado() and lower(autor_email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "apagar contas proprias" on contas;
create policy "apagar contas proprias" on contas
  for delete to authenticated
  using (eh_autorizado() and lower(autor_email) = lower(auth.jwt() ->> 'email'));

-- Cada lançamento, salário e compra a prazo pode apontar para um banco.
-- Se o banco for apagado, os lançamentos ficam, apenas sem banco.
alter table transacoes add column if not exists conta_id uuid references contas (id) on delete set null;
alter table rendas_fixas add column if not exists conta_id uuid references contas (id) on delete set null;
alter table parcelamentos add column if not exists conta_id uuid references contas (id) on delete set null;
