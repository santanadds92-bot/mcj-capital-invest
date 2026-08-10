-- ============================================================
-- MCJ Capital Invest — Tabela de configurações do site
-- Rode este script UMA VEZ no SQL Editor do Supabase.
-- Guarda a chave da API do Gemini usada pelo "Corretor Atendente"
-- (chat público) para que o Admin edite direto pelo navegador, sem
-- precisar mexer em código nem fazer commit/redeploy — mesmo padrão
-- já usado na chave de preenchimento automático por IA.
-- ============================================================

create table if not exists public.site_config (
  chave text primary key,
  valor text,
  updated_at timestamptz default now()
);

alter table public.site_config enable row level security;

-- Leitura pública: o widget de chat roda em páginas sem login e
-- precisa ler a chave para funcionar para qualquer visitante.
drop policy if exists "Leitura pública de site_config" on public.site_config;
create policy "Leitura pública de site_config"
  on public.site_config for select
  using (true);

-- Escrita só por usuário logado (mesmo padrão das outras tabelas do site).
drop policy if exists "Admin grava site_config" on public.site_config;
create policy "Admin grava site_config"
  on public.site_config for insert
  to authenticated
  with check (true);

drop policy if exists "Admin atualiza site_config" on public.site_config;
create policy "Admin atualiza site_config"
  on public.site_config for update
  to authenticated
  using (true);

-- Linha inicial vazia (o Admin preenche pelo painel depois).
insert into public.site_config (chave, valor)
values ('chatbot_gemini_key', '')
on conflict (chave) do nothing;
