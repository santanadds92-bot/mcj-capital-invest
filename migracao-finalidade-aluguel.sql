-- ============================================================
-- MCJ Capital Invest — Migração: finalidade dupla (Comprar + Alugar)
-- e valor de aluguel separado do valor de venda.
-- Rode este script UMA VEZ no SQL Editor do Supabase, depois do
-- supabase-setup.sql original já ter sido executado.
-- ============================================================

-- 1) Novo campo pro valor do aluguel (separado do valor de venda)
alter table public.imoveis add column if not exists valor_aluguel numeric;

-- 2) Transforma "finalidade" de texto único ("comprar" ou "alugar") em uma
--    lista (ex: {comprar}, {alugar} ou {comprar,alugar}), permitindo marcar
--    um imóvel para as duas finalidades ao mesmo tempo. Isso só roda se a
--    coluna ainda for do tipo texto simples (seguro rodar mais de uma vez).
do $$
begin
  if (select data_type from information_schema.columns
      where table_schema = 'public' and table_name = 'imoveis' and column_name = 'finalidade') = 'text' then
    alter table public.imoveis alter column finalidade drop default;
    alter table public.imoveis alter column finalidade type text[] using array[finalidade];
    alter table public.imoveis alter column finalidade set default array['comprar'];
  end if;
end $$;
