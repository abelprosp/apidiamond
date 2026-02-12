const { fetchVariosImoveis, filtrarImoveis } = require('../lib/imoveis');
const { extrairCriterios } = require('../lib/ia');

function setCors(res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Envie POST com body JSON: { "pergunta": "sua pergunta sobre o imóvel" }',
    });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  } catch {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Body deve ser JSON com campo "pergunta".',
    });
  }

  const pergunta = body.pergunta || body.mensagem || body.message || body.query || '';
  if (!pergunta.trim()) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Envie "pergunta" com o texto da busca (ex: "apartamento 2 quartos em Copacabana").',
    });
  }

  try {
    const criterios = await extrairCriterios(pergunta);
    const maxPages = Math.min(5, parseInt(process.env.BUSCAR_MAX_PAGINAS || '3', 10));
    const todos = await fetchVariosImoveis(maxPages, 20);
    const imoveis = filtrarImoveis(todos, criterios);

    return res.status(200).json({
      pergunta: pergunta.trim(),
      criterios,
      total: imoveis.length,
      imoveis: imoveis.slice(0, 20),
    });
  } catch (err) {
    console.error('buscar', err);
    return res.status(502).json({
      error: 'Bad Gateway',
      message: err.message || 'Erro ao buscar imóveis.',
    });
  }
};
