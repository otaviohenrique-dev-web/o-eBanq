-- Rode este arquivo no Supabase: SQL Editor > New query > Run.
-- Desfaz o que o antigo 08-telegram-e-alertas.sql criou. É seguro rodar mesmo que o 08 nunca tenha sido executado.

drop table if exists alertas_enviados;
alter table autorizados drop column if exists telegram_chat_id;
