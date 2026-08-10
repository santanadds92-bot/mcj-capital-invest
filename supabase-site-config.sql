-- ============================================================
-- QRV ARTIGOS TÁTICOS — Tabela de configurações do site
-- Rode este script UMA VEZ no SQL Editor do Supabase.
-- Ela guarda a chave da API do Gemini usada pelo chat "Recruta QRV"
-- (e outras configs futuras) para que o Admin edite direto pelo
-- navegador, sem precisar mexer em código/GitHub nunca mais.
-- ============================================================

create table if not exists public.site_config (
  chave text primary key,
  valor text,
  updated_at timestamptz default now()
);

alter table public.site_config enable row level security;

-- Leitura pública: o widget de chat roda em páginas sem login e
-- precisa ler a chave para funcionar para qualquer visitante.
create policy "Public read site_config" on public.site_config
  for select using (true);

-- Escrita só pelo admin (mesmo e-mail usado no admin.html).
create policy "Admin insert site_config" on public.site_config
  for insert with check (auth.jwt() ->> 'email' = 'santanadds92@gmail.com');

create policy "Admin update site_config" on public.site_config
  for update using (auth.jwt() ->> 'email' = 'santanadds92@gmail.com')
  with check (auth.jwt() ->> 'email' = 'santanadds92@gmail.com');

-- Linha inicial vazia (o Admin preenche pelo painel depois).
insert into public.site_config (chave, valor)
values ('chatbot_gemini_key', '')
on conflict (chave) do nothing;
