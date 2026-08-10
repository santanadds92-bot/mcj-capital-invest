-- ============================================================
-- QRV ARTIGOS TÁTICOS — Setup do Supabase
-- Rode este script inteiro no SQL Editor do seu projeto Supabase.
-- Substitua 'santanadds92@gmail.com' pelo e-mail do admin
-- (o mesmo que você vai usar para logar no admin.html) em TODAS
-- as políticas abaixo antes de rodar.
-- ============================================================

-- ---------- 1. Tabela de produtos ----------
create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  titulo text not null,
  categoria text not null,           -- vestuario, calcados, mochilas, insignias, protecao, facas, kits, acessorios, replicas
  corporacao text,                    -- EB, MB, FAB, PMESP, PM (outros estados), Bombeiros, Civil, Geral
  descricao text,
  tamanhos text[] default '{}',       -- ex: {P,M,G,GG} ou {38,39,40,41,42}
  cores text[] default '{}',
  preco numeric not null,
  preco_promocional numeric,
  estoque_status text not null default 'disponivel',  -- disponivel, sob_encomenda, esgotado
  personalizavel boolean default false,               -- exige nome de guerra / batalhão no pedido
  fotos text[] default '{}',
  destaque boolean default false,
  status text not null default 'ativo',                -- ativo, inativo, arquivado
  created_at timestamptz default now()
);

-- ---------- 2. Mensagens de contato ----------
create table if not exists public.mensagens_contato (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text,
  telefone text,
  mensagem text not null,
  lida boolean default false,
  created_at timestamptz default now()
);

-- ---------- 3. Solicitações de bordado / personalização ----------
create table if not exists public.solicitacoes_bordado (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text not null,
  tipo_peca text,           -- camisa, boné, mochila, etc.
  o_que_bordar text,        -- nome de guerra, tipo sanguíneo, batalhão...
  observacoes text,
  status text not null default 'novo',   -- novo, em_andamento, concluido
  created_at timestamptz default now()
);

-- ---------- 4. Solicitações de revenda ----------
create table if not exists public.solicitacoes_revenda (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text not null,
  cidade text,
  tipo_negocio text,
  observacoes text,
  status text not null default 'novo',   -- novo, contatado, aprovado, recusado
  created_at timestamptz default now()
);

-- ---------- RLS ----------
alter table public.produtos enable row level security;
alter table public.mensagens_contato enable row level security;
alter table public.solicitacoes_bordado enable row level security;
alter table public.solicitacoes_revenda enable row level security;

-- Produtos: leitura pública só do que está ativo; escrita só do admin
create policy "Public read produtos ativos" on public.produtos
  for select using (status = 'ativo');

create policy "Admin full access produtos" on public.produtos
  for all using (auth.jwt() ->> 'email' = 'santanadds92@gmail.com')
  with check (auth.jwt() ->> 'email' = 'santanadds92@gmail.com');

-- Mensagens de contato: qualquer visitante pode inserir; só o admin lê/gerencia
create policy "Anon insert mensagens_contato" on public.mensagens_contato
  for insert with check (true);

create policy "Admin manage mensagens_contato" on public.mensagens_contato
  for select using (auth.jwt() ->> 'email' = 'santanadds92@gmail.com');

create policy "Admin update mensagens_contato" on public.mensagens_contato
  for update using (auth.jwt() ->> 'email' = 'santanadds92@gmail.com');

create policy "Admin delete mensagens_contato" on public.mensagens_contato
  for delete using (auth.jwt() ->> 'email' = 'santanadds92@gmail.com');

-- Solicitações de bordado: mesmo padrão
create policy "Anon insert solicitacoes_bordado" on public.solicitacoes_bordado
  for insert with check (true);

create policy "Admin manage solicitacoes_bordado" on public.solicitacoes_bordado
  for select using (auth.jwt() ->> 'email' = 'santanadds92@gmail.com');

create policy "Admin update solicitacoes_bordado" on public.solicitacoes_bordado
  for update using (auth.jwt() ->> 'email' = 'santanadds92@gmail.com');

create policy "Admin delete solicitacoes_bordado" on public.solicitacoes_bordado
  for delete using (auth.jwt() ->> 'email' = 'santanadds92@gmail.com');

-- Solicitações de revenda: mesmo padrão
create policy "Anon insert solicitacoes_revenda" on public.solicitacoes_revenda
  for insert with check (true);

create policy "Admin manage solicitacoes_revenda" on public.solicitacoes_revenda
  for select using (auth.jwt() ->> 'email' = 'santanadds92@gmail.com');

create policy "Admin update solicitacoes_revenda" on public.solicitacoes_revenda
  for update using (auth.jwt() ->> 'email' = 'santanadds92@gmail.com');

create policy "Admin delete solicitacoes_revenda" on public.solicitacoes_revenda
  for delete using (auth.jwt() ->> 'email' = 'santanadds92@gmail.com');

-- ---------- Storage: bucket público de fotos de produto ----------
insert into storage.buckets (id, name, public)
values ('produtos-fotos', 'produtos-fotos', true)
on conflict (id) do nothing;

create policy "Public read produtos-fotos" on storage.objects
  for select using (bucket_id = 'produtos-fotos');

create policy "Admin upload produtos-fotos" on storage.objects
  for insert with check (
    bucket_id = 'produtos-fotos'
    and auth.jwt() ->> 'email' = 'santanadds92@gmail.com'
  );

create policy "Admin delete produtos-fotos" on storage.objects
  for delete using (
    bucket_id = 'produtos-fotos'
    and auth.jwt() ->> 'email' = 'santanadds92@gmail.com'
  );

-- ---------- Criação do usuário admin ----------
-- Crie o usuário manualmente em Authentication > Users no painel do Supabase,
-- usando o mesmo e-mail que você colocou nas políticas acima. Não precisa de
-- tabela extra: a policy já valida direto pelo e-mail do JWT autenticado.
