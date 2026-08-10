// Carrinho de compras — QRV Artigos Táticos
// Estado guardado em localStorage. Preparado para, no futuro, o checkout.html
// se conectar a um gateway real (Mercado Pago ou outro) — por enquanto o
// fechamento do pedido é feito via WhatsApp com o resumo completo do carrinho.

const CART_KEY = 'qrv_cart_v1';

function readCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
  window.dispatchEvent(new CustomEvent('qrv-cart-updated', { detail: cart }));
}

function buildItemKey(codigo, tamanho, cor, personalizacao) {
  return [codigo, tamanho || '', cor || '', personalizacao || ''].join('__');
}

export function getCart() {
  return readCart();
}

export function addToCart(produto, opts = {}) {
  const { quantidade = 1, tamanho = null, cor = null, personalizacao = null } = opts;
  const cart = readCart();
  const itemKey = buildItemKey(produto.codigo, tamanho, cor, personalizacao);
  const precoUnit = Number(
    produto.preco_promocional && Number(produto.preco_promocional) < Number(produto.preco)
      ? produto.preco_promocional
      : produto.preco
  ) || 0;

  const existente = cart.find(i => i.itemKey === itemKey);
  if (existente) {
    existente.quantidade += quantidade;
  } else {
    cart.push({
      itemKey,
      codigo: produto.codigo,
      titulo: produto.titulo,
      preco: precoUnit,
      foto: (Array.isArray(produto.fotos) && produto.fotos[0]) || null,
      tamanho,
      cor,
      personalizacao,
      quantidade,
    });
  }
  writeCart(cart);
  return cart;
}

export function removeFromCart(itemKey) {
  writeCart(readCart().filter(i => i.itemKey !== itemKey));
}

export function updateQuantidade(itemKey, quantidade) {
  const cart = readCart();
  const item = cart.find(i => i.itemKey === itemKey);
  if (!item) return;
  item.quantidade = Math.max(1, Math.floor(Number(quantidade)) || 1);
  writeCart(cart);
}

export function clearCart() {
  writeCart([]);
}

export function getCartCount() {
  return readCart().reduce((sum, i) => sum + i.quantidade, 0);
}

export function getCartTotal() {
  return readCart().reduce((sum, i) => sum + i.quantidade * i.preco, 0);
}

// Atualiza todos os badges de contagem presentes na página (header de todas as páginas)
export function updateCartBadge() {
  const count = getCartCount();
  document.querySelectorAll('.cart-count').forEach(el => {
    el.textContent = count > 99 ? '99+' : String(count);
    el.classList.toggle('show', count > 0);
  });
}

// Monta a mensagem de WhatsApp com o resumo completo do carrinho (usado no checkout
// enquanto não há um gateway de pagamento real conectado)
export function buildWhatsappResumoCarrinho(dadosEntrega = {}) {
  const cart = readCart();
  if (cart.length === 0) return '';
  const linhas = cart.map(i => {
    let linha = `• ${i.quantidade}x ${i.titulo} (${i.codigo})`;
    if (i.tamanho) linha += ` — Tam: ${i.tamanho}`;
    if (i.cor) linha += ` — Cor: ${i.cor}`;
    if (i.personalizacao) linha += ` — Personalização: ${i.personalizacao}`;
    linha += ` — ${(i.quantidade * i.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
    return linha;
  });
  const total = getCartTotal().toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  let texto = 'Olá! Quero finalizar este pedido feito no site da QRV Artigos Táticos:\n\n';
  texto += linhas.join('\n');
  texto += `\n\n*Total: ${total}*`;
  if (dadosEntrega.nome) texto += `\n\nNome: ${dadosEntrega.nome}`;
  if (dadosEntrega.telefone) texto += `\nTelefone: ${dadosEntrega.telefone}`;
  if (dadosEntrega.endereco) texto += `\nEndereço de entrega: ${dadosEntrega.endereco}`;
  if (dadosEntrega.observacoes) texto += `\nObservações: ${dadosEntrega.observacoes}`;
  return texto;
}

document.addEventListener('DOMContentLoaded', updateCartBadge);

// ---------- Botões "Adicionar ao Carrinho" nos cards de produto (delegação global) ----------
function showAddedToast(mensagem) {
  let toast = document.getElementById('cartMiniToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'cartMiniToast';
    toast.className = 'cart-mini-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = mensagem;
  toast.classList.add('show');
  clearTimeout(toast._hideTimeout);
  toast._hideTimeout = setTimeout(() => toast.classList.remove('show'), 2200);
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.add-to-cart-btn');
  if (!btn || btn.disabled) return;
  e.preventDefault();
  e.stopPropagation();
  try {
    const produto = JSON.parse(btn.dataset.produto.replace(/&quot;/g, '"'));
    addToCart(produto, { quantidade: 1 });
    showAddedToast(`"${produto.titulo}" adicionado ao carrinho`);
    const original = btn.textContent;
    btn.textContent = 'Adicionado ✓';
    btn.classList.add('added');
    setTimeout(() => { btn.textContent = original; btn.classList.remove('added'); }, 1400);
  } catch (err) {
    console.error('Erro ao adicionar ao carrinho:', err);
  }
});
