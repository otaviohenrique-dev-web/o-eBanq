-- Rode este arquivo no Supabase: SQL Editor > New query > Run.
-- Depende do schema.sql (tabela autorizados).

-- Conversa do Telegram de cada pessoa (preenchida pelo próprio app ao conectar).
alter table autorizados add column if not exists telegram_chat_id text;

-- Avisos já enviados, para o mesmo aviso não chegar duas vezes.
-- Sem nenhuma política de acesso: só o servidor do app (chave de serviço) lê e grava.
create table if not exists alertas_enviados (
  chave text primary key,
  enviado_em timestamptz not null default now()
);

alter table alertas_enviados enable row level security;
