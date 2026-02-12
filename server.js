const http = require('http');
const { fetchVariosImoveis, filtrarImoveis } = require('./lib/imoveis');
const { extrairCriterios } = require('./lib/ia');

const BASE_URL = 'https://imobiliariadiamond.com.br/wp-json/imob/v1/imoveis';
const BEARER = process.env.BEARER_TOKEN || 'Ot3CYy0xWgK52DW3UgQ1hPcEbDRrmteRfEET3uvUZwtJBqSXFQC4Wti0Jt3IPX45';
const COOKIE = process.env.COOKIE || 'PHPSESSID=luh116pfcqb8ul8oelilrintcu';

const PORT = process.env.PORT || 3000;

async function fetchImoveis(page = 1, perPage = 20) {
  const url = `${BASE_URL}?page=${page}&per_page=${perPage}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${BEARER}`,
      'Cookie': COOKIE,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API imóveis: ${res.status} - ${text}`);
  }

  return res.json();
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  const path = url.pathname.replace(/\/$/, '') || '/';
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get('per_page') || '20', 10)));

  const isImoveis = path === '/imoveis' || path === '/' || path === '/webhook';
  const isBuscar = path === '/buscar';

  if (isBuscar && req.method === 'POST') {
    try {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      const pergunta = body.pergunta || body.mensagem || body.message || body.query || '';
      if (!pergunta.trim()) {
        res.writeHead(400);
        return res.end(JSON.stringify({ error: 'Bad Request', message: 'Envie "pergunta" no body.' }));
      }
      const criterios = await extrairCriterios(pergunta);
      const maxPages = Math.min(5, parseInt(process.env.BUSCAR_MAX_PAGINAS || '3', 10));
      const todos = await fetchVariosImoveis(maxPages, 20);
      const imoveis = filtrarImoveis(todos, criterios);
      res.writeHead(200);
      return res.end(JSON.stringify({
        pergunta: pergunta.trim(),
        criterios,
        total: imoveis.length,
        imoveis: imoveis.slice(0, 20),
      }));
    } catch (err) {
      console.error(err);
      res.writeHead(502);
      return res.end(JSON.stringify({ error: 'Bad Gateway', message: err.message }));
    }
  }

  if (req.method !== 'GET' || !isImoveis) {
    res.writeHead(404);
    res.end(JSON.stringify({
      error: 'Not Found',
      message: 'GET /imoveis ou POST /buscar com { "pergunta": "..." }',
    }));
    return;
  }

  try {
    const data = await fetchImoveis(page, perPage);
    res.writeHead(200);
    res.end(JSON.stringify(data));
  } catch (err) {
    console.error(err);
    res.writeHead(502);
    res.end(JSON.stringify({
      error: 'Bad Gateway',
      message: err.message || 'Erro ao consultar API de imóveis',
    }));
  }
});

server.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
  console.log(`Exemplo: GET http://localhost:${PORT}/imoveis?page=1&per_page=20`);
});
