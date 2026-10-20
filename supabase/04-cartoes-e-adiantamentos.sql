-- Rode este arquivo no Supabase: SQL Editor > New query > Run.
-- Depende do schema.sql, do 02-renda-fixa-e-parcelas.sql e do 03-bancos.sql.

-- Cartão de crédito: dia em que a fatura fecha e dia em que vence.
alter table contas add column if not exists dia_fechamento int check (dia_fechamento between 1 and 28);
alter table contas add column if not exists dia_vencimento int check (dia_vencimento between 1 and 28);

-- Compra a prazo: data da compra e dia de vencimento do cartão usado (copiado na criação).
alter table parcelamentos add column if not exists data_compra date;
alter table parcelamentos add column if not exists dia_vencimento int check (dia_vencimento between 1 and 28);

-- Parcelas pagas antes do vencimento. Cada linha tira uma parcela da fatura original
-- e a lança na data em que foi paga, com o valor realmente pago (pode ter desconto).
create table if not exists parcelas_adiantadas (
  id uuid primary key default gen_random_uuid(),
  autor_email text not null,
  parcelamento_id uuid not null references parcelamentos (id) on delete cascade,
  indice int not null check (indice >= 0),
  pago_em date not null,
  valor_pago numeric(12, 2) not null check (valor_pago >= 0),
  criado_em timestamptz not null default now(),
  unique (parcelamento_id, indice)
);

alter table parcelas_adiantadas enable row level security;

drop policy if exists "ler adiantamentos" on parcelas_adiantadas;
create policy "ler adiantamentos" on parcelas_adiantadas
  for select to authenticated using (eh_autorizado());

drop policy if exists "criar adiantamentos proprios" on parcelas_adiantadas;
create policy "criar adiantamentos proprios" on parcelas_adiantadas
  for insert to authenticated
  with check (eh_autorizado() and lower(autor_email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "apagar adiantamentos proprios" on parcelas_adiantadas;
create policy "apagar adiantamentos proprios" on parcelas_adiantadas
  for delete to authenticated
  using (eh_autorizado() and lower(autor_email) = lower(auth.jwt() ->> 'email'));
