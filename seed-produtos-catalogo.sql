-- ============================================================
-- QRV ARTIGOS TÁTICOS — Importação em lote do catálogo de patches,
-- breves, insígnias e acessórios (extraído dos prints enviados).
-- Rode este script no SQL Editor do Supabase depois do
-- supabase-setup.sql. As fotos referenciadas já estão em
-- assets/produtos-catalogo/ dentro do próprio site.
--
-- IMPORTANTE: os nomes e preços foram lidos diretamente dos prints
-- do seu catálogo. Alguns itens (ex: "Touca Bélica") tinham grafia
-- estranha no print original — revise os títulos no admin.html
-- depois de importar e corrija o que precisar.
-- ============================================================

insert into public.produtos
  (codigo, titulo, categoria, corporacao, preco, preco_promocional, personalizavel, descricao, fotos, estoque_status, status, destaque)
values
  ('QRV-INS-001', 'Breve Metálico Polícia da Aeronáutica Avançado', 'insignias', 'Aeronáutica', 29.9, null, false, '', array['assets/produtos-catalogo/breve-metalico-aero-avancado.jpg'], 'disponivel', 'ativo', false),
  ('QRV-INS-002', 'Breve Metálico Polícia da Aeronáutica', 'insignias', 'Aeronáutica', 29.9, null, false, '', array['assets/produtos-catalogo/breve-metalico-aero.jpg'], 'disponivel', 'ativo', false),
  ('QRV-INS-003', 'Patch Bordado Bandeira do Brasil', 'insignias', 'Geral', 14.9, null, false, '', array['assets/produtos-catalogo/patch-bandeira-brasil.jpg'], 'disponivel', 'ativo', false),
  ('QRV-INS-004', 'Brasão 31° BPM Colorido', 'insignias', 'Polícia Militar', 24.9, null, false, '', array['assets/produtos-catalogo/brasao-31-bpm.jpg'], 'disponivel', 'ativo', false),
  ('QRV-ACE-005', 'Fiel Branco', 'acessorios', 'Geral', 54.9, null, false, '', array['assets/produtos-catalogo/fiel-branco.jpg'], 'disponivel', 'ativo', true),
  ('QRV-INS-006', 'Patch Força Aérea', 'insignias', 'Aeronáutica', 29.9, null, false, '', array['assets/produtos-catalogo/patch-forca-aerea.jpg'], 'disponivel', 'ativo', false),
  ('QRV-INS-007', 'Manga Cães de Guerra', 'insignias', 'Geral', 14.9, null, false, '', array['assets/produtos-catalogo/manicaca-caes-guerra.jpg'], 'disponivel', 'ativo', false),
  ('QRV-INS-008', 'Manga Condutor de Cães de Guerra', 'insignias', 'Geral', 19.9, null, false, '', array['assets/produtos-catalogo/manicaca-condutor-caes-guerra.jpg'], 'disponivel', 'ativo', false),
  ('QRV-INS-009', 'Manga Condutor de Cães', 'insignias', 'Geral', 14.9, null, false, '', array['assets/produtos-catalogo/manicaca-condutor-caes.jpg'], 'disponivel', 'ativo', false),
  ('QRV-ACE-010', 'Mosquetão', 'acessorios', 'Geral', 12.9, null, false, '', array['assets/produtos-catalogo/mosquetao.jpg'], 'disponivel', 'ativo', false),
  ('QRV-INS-011', 'Manga Força Patrulha', 'insignias', 'Polícia Militar', 14.9, null, false, '', array['assets/produtos-catalogo/manicaca-forca-patrulha.jpg'], 'disponivel', 'ativo', false),
  ('QRV-ACE-012', 'Isqueiro', 'acessorios', 'Geral', 29.9, null, false, '', array['assets/produtos-catalogo/isqueiro.jpg'], 'disponivel', 'ativo', false),
  ('QRV-INS-013', 'Breve Metálico do Choque', 'insignias', 'Polícia Militar', 29.9, null, false, '', array['assets/produtos-catalogo/breve-metalico-choque.jpg'], 'disponivel', 'ativo', false),
  ('QRV-KIT-014', 'Kit Suspensório', 'kits', 'Geral', 139.9, 119.9, false, 'Suspensório + cinto tático + porta cantil + cantil verde.', array['assets/produtos-catalogo/kit-suspensorio.jpg'], 'disponivel', 'ativo', true),
  ('QRV-INS-015', 'Breve Emborrachado Choque Peito — Variante 1', 'insignias', 'Polícia Militar', 14.9, null, false, '', array['assets/produtos-catalogo/breve-emborrachado-choque-peito-1.jpg'], 'disponivel', 'ativo', false),
  ('QRV-INS-016', 'Breve Emborrachado Choque Peito — Variante 2', 'insignias', 'Polícia Militar', 14.9, null, false, '', array['assets/produtos-catalogo/breve-emborrachado-choque-peito-2.jpg'], 'disponivel', 'ativo', false),
  ('QRV-INS-017', 'Breve Emborrachado Choque para Cobertura', 'insignias', 'Polícia Militar', 14.9, null, false, 'Disponível em raio branco, raio vermelho e raio cinza — especifique a cor no pedido.', array['assets/produtos-catalogo/breve-emborrachado-choque-cobertura.jpg'], 'disponivel', 'ativo', false),
  ('QRV-INS-018', 'Tarjeta Bordada Polícia da Aeronáutica', 'insignias', 'Aeronáutica', 24.9, null, false, '', array['assets/produtos-catalogo/tarjeta-bordada-aero.jpg'], 'disponivel', 'ativo', false),
  ('QRV-INS-019', 'Braçal Polícia da Aeronáutica', 'insignias', 'Aeronáutica', 35.9, null, false, '', array['assets/produtos-catalogo/bracal-aero.jpg'], 'disponivel', 'ativo', false),
  ('QRV-INS-020', 'Breve Emborrachado de Peito Polícia da Aeronáutica — Variante 1', 'insignias', 'Aeronáutica', 14.9, null, false, '', array['assets/produtos-catalogo/breve-emborrachado-peito-aero-1.jpg'], 'disponivel', 'ativo', false),
  ('QRV-INS-021', 'Breve Emborrachado de Peito Polícia da Aeronáutica — Variante 2', 'insignias', 'Aeronáutica', 14.9, null, false, '', array['assets/produtos-catalogo/breve-emborrachado-peito-aero-2.jpg'], 'disponivel', 'ativo', false),
  ('QRV-INS-022', 'Breve Emborrachado de Cobertura Polícia da Aeronáutica', 'insignias', 'Aeronáutica', 14.9, null, false, '', array['assets/produtos-catalogo/breve-emborrachado-cobertura-aero.jpg'], 'disponivel', 'ativo', false),
  ('QRV-KIT-023', 'Kit Exec Completo', 'kits', 'Geral', 219.9, 179.9, false, '', array['assets/produtos-catalogo/kit-exec-completo.jpg'], 'disponivel', 'ativo', true),
  ('QRV-CAL-024', 'Coturno', 'calcados', 'Geral', 289.9, 249.9, false, '', array['assets/produtos-catalogo/coturno.jpg'], 'disponivel', 'ativo', true),
  ('QRV-INS-025', 'Insígnia PM Gola', 'insignias', 'Polícia Militar', 5.9, null, false, '', array['assets/produtos-catalogo/insignia-pm-gola.jpg'], 'disponivel', 'ativo', false),
  ('QRV-INS-026', 'Breve ADS', 'insignias', 'Geral', 29.9, null, false, '', array['assets/produtos-catalogo/breve-ads.jpg'], 'disponivel', 'ativo', false),
  ('QRV-INS-027', 'Breve Metal Brigadista', 'insignias', 'Geral', 29.9, null, false, '', array['assets/produtos-catalogo/breve-metal-brigadista.jpg'], 'disponivel', 'ativo', false),
  ('QRV-VES-028', 'Camiseta do Décimo Bordada', 'vestuario', 'Geral', 49.9, null, true, 'Camiseta já com o bordado de brinde — especifique o tecido (Dryfit, Dryfit colmeia ou algodão) e o tamanho desejado no pedido.', array['assets/produtos-catalogo/camiseta-decimo-bordada.jpg'], 'disponivel', 'ativo', true),
  ('QRV-ACE-029', 'Cantil', 'acessorios', 'Geral', 24.9, null, false, 'Disponível nas cores preto, verde, caqui e marrom — especifique a cor no pedido.', array['assets/produtos-catalogo/cantil.jpg'], 'disponivel', 'ativo', false),
  ('QRV-INS-030', 'Láurea Emborrachada', 'insignias', 'Geral', 12.9, null, false, 'Faixas emborrachadas do 1° ao 5° grau — especifique o grau no pedido.', array['assets/produtos-catalogo/laurea-emborrachada.jpg'], 'disponivel', 'ativo', false),
  ('QRV-INS-031', 'Breve Patrulheiro', 'insignias', 'Polícia Militar', 14.9, null, false, '', array['assets/produtos-catalogo/breve-patrulheiro.jpg'], 'disponivel', 'ativo', false),
  ('QRV-INS-032', 'Brasões PM Coloridos', 'insignias', 'Polícia Militar', 24.9, null, true, 'Favor descrever qual seria o batalhão de sua procura no pedido.', array['assets/produtos-catalogo/brasoes-pm-coloridos.jpg'], 'disponivel', 'ativo', false),
  ('QRV-VES-033', 'Touca Bélica', 'vestuario', 'Geral', 54.9, 44.9, false, '', array['assets/produtos-catalogo/tonta-belica.jpg'], 'disponivel', 'ativo', false),
  ('QRV-INS-034', 'Soldado PM', 'insignias', 'Polícia Militar', 12.9, null, false, '', array['assets/produtos-catalogo/soldado-pm.jpg'], 'disponivel', 'ativo', false),
  ('QRV-INS-035', 'Distintivos de Boina PM', 'insignias', 'Polícia Militar', 32.9, null, false, '', array['assets/produtos-catalogo/distintivos-boina-pm.jpg'], 'disponivel', 'ativo', false),
  ('QRV-INS-036', 'Manga Autodefesa de Superfície', 'insignias', 'Geral', 14.9, null, false, '', array['assets/produtos-catalogo/manicaca-autodefesa-superficie.jpg'], 'disponivel', 'ativo', false),
  ('QRV-INS-037', 'Manga Polícia da Aeronáutica', 'insignias', 'Aeronáutica', 14.9, null, false, '', array['assets/produtos-catalogo/manicaca-policia-aeronautica.jpg'], 'disponivel', 'ativo', false),
  ('QRV-INS-038', 'Breve da Marinha', 'insignias', 'Marinha do Brasil', 14.9, null, true, 'Disponível nas cores preta, verde e laranja — especifique a cor no pedido.', array['assets/produtos-catalogo/breve-marinha.jpg'], 'disponivel', 'ativo', true)
on conflict (codigo) do update set
  titulo = excluded.titulo,
  categoria = excluded.categoria,
  corporacao = excluded.corporacao,
  preco = excluded.preco,
  preco_promocional = excluded.preco_promocional,
  personalizavel = excluded.personalizavel,
  descricao = excluded.descricao,
  fotos = excluded.fotos,
  estoque_status = excluded.estoque_status,
  status = excluded.status,
  destaque = excluded.destaque;
