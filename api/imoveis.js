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

module.exports = function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Use GET com ?page=1&per_page=20',
    });
  }

  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const perPage = Math.min(100, Math.max(1, parseInt(req.query.per_page || '20', 10)));

  return fetchImoveis(page, perPage)
    .then((data) => res.status(200).json(data))
    .catch((err) => {
      console.error(err);
      return res.status(502).json({
        error: 'Bad Gateway',
        message: err.message || 'Erro ao consultar API de imóveis',
      });
    });
};
