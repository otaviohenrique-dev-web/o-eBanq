-- Rode este arquivo no Supabase: SQL Editor > New query > Run.
-- Depende do 04-cartoes-e-adiantamentos.sql.

-- Compra no crédito à vista (1x) também passa a ser aceita.
alter table parcelamentos drop constraint if exists parcelamentos_parcelas_check;
alter table parcelamentos add constraint parcelamentos_parcelas_check check (parcelas between 1 and 120);

-- Pagamento de fatura: quem pagou e de qual banco saiu o dinheiro.
alter table parcelas_adiantadas add column if not exists pago_por text;
alter table parcelas_adiantadas add column if not exists pago_com_conta_id uuid references contas (id) on delete set null;
