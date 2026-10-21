-- Rode este arquivo no Supabase: SQL Editor > New query > Run.
-- Depende do schema.sql e dos arquivos 02 a 05.

-- Pessoas que usam o seu cartão emprestado (não precisam ter login no sistema).
create table if not exists terceiros (
  id uuid primary key default gen_random_uuid(),
  autor_email text not null,
  nome text not null,
  criado_em timestamptz not null default now()
);

-- Dinheiro que essas pessoas já devolveram.
create table if not exists repasses (
  id uuid primary key default gen_random_uuid(),
  autor_email text not null,
  terceiro_id uuid not null references terceiros (id) on delete cascade,
  valor numeric(12, 2) not null check (valor > 0),
  data date not null,
  conta_id uuid references contas (id) on delete set null,
  criado_em timestamptz not null default now()
);

-- Assinaturas: cobrança mensal sem número fixo de parcelas, até ser cancelada (fim).
create table if not exists assinaturas (
  id uuid primary key default gen_random_uuid(),
  autor_email text not null,
  escopo text not null default 'pessoal' check (escopo in ('pessoal', 'casal')),
  descricao text not null,
  valor_mensal numeric(12, 2) not null check (valor_mensal > 0),
  categoria text not null check (categoria in ('necessidade', 'lazer', 'economia')),
  conta_id uuid references contas (id) on delete set null,
  terceiro_id uuid references terceiros (id) on delete set null,
  inicio text not null check (inicio ~ '^\d{4}-\d{2}$'),
  fim text check (fim is null or fim ~ '^\d{4}-\d{2}$'),
  dia_vencimento int check (dia_vencimento between 1 and 28),
  data_compra date,
  criado_em timestamptz not null default now()
);

-- Compra a prazo emprestada: quem vai pagar é essa pessoa.
alter table parcelamentos add column if not exists terceiro_id uuid references terceiros (id) on delete set null;

alter table terceiros enable row level security;
alter table repasses enable row level security;
alter table assinaturas enable row level security;

-- terceiros
drop policy if exists "ler terceiros" on terceiros;
create policy "ler terceiros" on terceiros for select to authenticated using (eh_autorizado());
drop policy if exists "criar terceiros proprios" on terceiros;
create policy "criar terceiros proprios" on terceiros for insert to authenticated
  with check (eh_autorizado() and lower(autor_email) = lower(auth.jwt() ->> 'email'));

-- repasses
drop policy if exists "ler repasses" on repasses;
create policy "ler repasses" on repasses for select to authenticated using (eh_autorizado());
drop policy if exists "criar repasses proprios" on repasses;
create policy "criar repasses proprios" on repasses for insert to authenticated
  with check (eh_autorizado() and lower(autor_email) = lower(auth.jwt() ->> 'email'));
drop policy if exists "apagar repasses proprios" on repasses;
create policy "apagar repasses proprios" on repasses for delete to authenticated
  using (eh_autorizado() and lower(autor_email) = lower(auth.jwt() ->> 'email'));

-- assinaturas
drop policy if exists "ler assinaturas" on assinaturas;
create policy "ler assinaturas" on assinaturas for select to authenticated using (eh_autorizado());
drop policy if exists "criar assinaturas proprias" on assinaturas;
create policy "criar assinaturas proprias" on assinaturas for insert to authenticated
  with check (eh_autorizado() and lower(autor_email) = lower(auth.jwt() ->> 'email'));
drop policy if exists "editar assinaturas proprias" on assinaturas;
create policy "editar assinaturas proprias" on assinaturas for update to authenticated
  using (eh_autorizado() and lower(autor_email) = lower(auth.jwt() ->> 'email'))
  with check (eh_autorizado() and lower(autor_email) = lower(auth.jwt() ->> 'email'));
drop policy if exists "apagar assinaturas proprias" on assinaturas;
create policy "apagar assinaturas proprias" on assinaturas for delete to authenticated
  using (eh_autorizado() and lower(autor_email) = lower(auth.jwt() ->> 'email'));
