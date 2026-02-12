const BASE_URL = 'https://imobiliariadiamond.com.br/wp-json/imob/v1/imoveis';
const BEARER = process.env.BEARER_TOKEN || 'Ot3CYy0xWgK52DW3UgQ1hPcEbDRrmteRfEET3uvUZwtJBqSXFQC4Wti0Jt3IPX45';
const COOKIE = process.env.COOKIE || 'PHPSESSID=luh116pfcqb8ul8oelilrintcu';

async function fetchImoveis(page = 1, perPage = 20) {
  const url = `${BASE_URL}?page=${page}&per_page=${perPage}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${BEARER}`,
      Cookie: COOKIE,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API imóveis: ${res.status} - ${text}`);
  }
  return res.json();
}

/**
 * Busca vários páginas de imóveis (para o chat buscar e filtrar).
 * @param {number} maxPages - Máximo de páginas (ex.: 3 = até 60 imóveis com per_page 20)
 * @returns {Promise<Array>} Lista de imóveis (array direto ou extraído de .data/.imoveis conforme a API)
 */
async function fetchVariosImoveis(maxPages = 3, perPage = 20) {
  const lista = [];
  for (let page = 1; page <= maxPages; page++) {
    const data = await fetchImoveis(page, perPage);
    const itens = Array.isArray(data) ? data : (data.data || data.imoveis || data.items || []);
    if (!Array.isArray(itens) || itens.length === 0) break;
    lista.push(...itens);
    if (itens.length < perPage) break;
  }
  return lista;
}

/**
 * Normaliza um valor para comparação (string em minúsculo, número).
 */
function norm(val) {
  if (val == null) return '';
  if (typeof val === 'number') return val;
  return String(val).toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

/**
 * Extrai número de quartos de um imóvel (campo pode vir com nomes diferentes).
 */
function getQuartos(imovel) {
  const n = imovel.quartos ?? imovel.bedrooms ?? imovel.dormitorios ?? imovel.rooms ?? imovel.numero_quartos;
  if (typeof n === 'number') return n;
  const parsed = parseInt(String(n).replace(/\D/g, ''), 10);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Extrai valor numérico (preço) do imóvel.
 */
function getValor(imovel) {
  const v = imovel.valor ?? imovel.preco ?? imovel.price ?? imovel.value ?? imovel.preco_venda ?? imovel.preco_aluguel;
  if (typeof v === 'number') return v;
  const s = String(v || '').replace(/\D/g, '');
  return s ? parseInt(s, 10) : null;
}

/**
 * Texto pesquisável do imóvel (título, descrição, bairro, cidade, tipo).
 */
function getTexto(imovel) {
  const parts = [
    imovel.titulo ?? imovel.title ?? imovel.nome ?? '',
    imovel.descricao ?? imovel.description ?? imovel.resumo ?? '',
    imovel.bairro ?? imovel.neighborhood ?? imovel.bairro_nome ?? '',
    imovel.cidade ?? imovel.city ?? imovel.cidade_nome ?? '',
    imovel.tipo ?? imovel.type ?? imovel.finalidade ?? '',
    imovel.endereco ?? imovel.address ?? '',
  ];
  return norm(parts.join(' '));
}

/**
 * Filtra a lista de imóveis com base em critérios extraídos pela IA.
 * @param {Array} lista - Lista de imóveis
 * @param {Object} criterios - { quartos, bairro, tipo, preco_max, termos[] }
 */
function filtrarImoveis(lista, criterios) {
  if (!criterios || !Array.isArray(lista)) return lista;

  const quartosMin = criterios.quartos != null ? Number(criterios.quartos) : null;
  const precoMax = criterios.preco_max != null ? Number(criterios.preco_max) : null;
  const bairro = criterios.bairro ? norm(criterios.bairro) : '';
  const tipo = criterios.tipo ? norm(criterios.tipo) : '';
  const termos = (criterios.termos || []).map(norm).filter(Boolean);

  return lista.filter((imovel) => {
    if (quartosMin != null) {
      const q = getQuartos(imovel);
      if (q != null && q < quartosMin) return false;
    }
    if (precoMax != null) {
      const v = getValor(imovel);
      if (v != null && v > precoMax) return false;
    }
    const texto = getTexto(imovel);
    if (bairro && texto.indexOf(bairro) === -1) return false;
    if (tipo && texto.indexOf(tipo) === -1) return false;
    for (const t of termos) {
      if (t.length > 1 && texto.indexOf(t) === -1) return false;
    }
    return true;
  });
}

module.exports = { fetchImoveis, fetchVariosImoveis, filtrarImoveis };
