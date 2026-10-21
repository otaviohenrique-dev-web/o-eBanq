-- Rode este arquivo no Supabase: SQL Editor > New query > Run.
-- Depende dos arquivos 02 a 06. Permite que cada pessoa edite o que ela mesma cadastrou.

drop policy if exists "editar parcelamentos proprios" on parcelamentos;
create policy "editar parcelamentos proprios" on parcelamentos
  for update to authenticated
  using (eh_autorizado() and lower(autor_email) = lower(auth.jwt() ->> 'email'))
  with check (eh_autorizado() and lower(autor_email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "editar repasses proprios" on repasses;
create policy "editar repasses proprios" on repasses
  for update to authenticated
  using (eh_autorizado() and lower(autor_email) = lower(auth.jwt() ->> 'email'))
  with check (eh_autorizado() and lower(autor_email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "editar terceiros proprios" on terceiros;
create policy "editar terceiros proprios" on terceiros
  for update to authenticated
  using (eh_autorizado() and lower(autor_email) = lower(auth.jwt() ->> 'email'))
  with check (eh_autorizado() and lower(autor_email) = lower(auth.jwt() ->> 'email'));
