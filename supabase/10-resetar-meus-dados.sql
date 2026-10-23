-- Rode este arquivo no Supabase: SQL Editor > New query > Run.
-- Depende do schema.sql e dos arquivos 02 a 07.
--
-- Cria a função usada pelo botão "Apagar meus dados" do app. Ela apaga SÓ o que a própria pessoa
-- cadastrou (nunca os dados do par nem o login) e tudo numa transação: ou apaga tudo, ou nada.
--
--   p_tudo = false (padrão): apaga os dados pessoais (lançamentos, compras a prazo e assinaturas pessoais,
--                            salário, cartão emprestado e repasses). Mantém bancos e o que é do casal.
--   p_tudo = true:           apaga tudo que a pessoa cadastrou, inclusive bancos, itens do casal
--                            e os pagamentos de fatura que ela registrou.

create or replace function resetar_meus_dados(p_tudo boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  meu text := lower(auth.jwt() ->> 'email');
  n_lancamentos int;
  n_parcelamentos int;
  n_assinaturas int;
  n_rendas int;
  n_terceiros int;
  n_repasses int;
  n_pagamentos int := 0;
  n_bancos int := 0;
begin
  if meu is null or not eh_autorizado() then
    raise exception 'não autorizado' using errcode = '42501';
  end if;

  delete from repasses where lower(autor_email) = meu;
  get diagnostics n_repasses = row_count;

  delete from assinaturas where lower(autor_email) = meu and (p_tudo or escopo = 'pessoal');
  get diagnostics n_assinaturas = row_count;

  -- Os pagamentos registrados sobre essas compras saem junto (exclusão em cascata).
  delete from parcelamentos where lower(autor_email) = meu and (p_tudo or escopo = 'pessoal');
  get diagnostics n_parcelamentos = row_count;

  if p_tudo then
    delete from parcelas_adiantadas where lower(autor_email) = meu;
    get diagnostics n_pagamentos = row_count;
  end if;

  delete from rendas_fixas where lower(autor_email) = meu;
  get diagnostics n_rendas = row_count;

  delete from transacoes where lower(autor_email) = meu and (p_tudo or escopo = 'pessoal');
  get diagnostics n_lancamentos = row_count;

  delete from terceiros where lower(autor_email) = meu;
  get diagnostics n_terceiros = row_count;

  if p_tudo then
    delete from contas where lower(autor_email) = meu;
    get diagnostics n_bancos = row_count;
  end if;

  return jsonb_build_object(
    'lancamentos', n_lancamentos,
    'compras_a_prazo', n_parcelamentos,
    'assinaturas', n_assinaturas,
    'salarios', n_rendas,
    'pessoas_cartao_emprestado', n_terceiros,
    'repasses', n_repasses,
    'pagamentos_de_fatura', n_pagamentos,
    'bancos', n_bancos
  );
end;
$$;

-- Só quem está logado pode chamar; visitantes anônimos não.
revoke all on function resetar_meus_dados(boolean) from public;
grant execute on function resetar_meus_dados(boolean) to authenticated;
