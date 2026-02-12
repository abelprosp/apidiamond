const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

/**
 * Chama a OpenAI para extrair critérios de busca de imóvel a partir da pergunta do usuário.
 * Retorna { quartos?, bairro?, tipo?, preco_max?, termos[] } ou null se não houver API key.
 */
async function extrairCriterios(pergunta) {
  if (!OPENAI_API_KEY || !pergunta || typeof pergunta !== 'string') {
    return fallbackCriterios(pergunta);
  }

  const system = `Você é um assistente que extrai critérios de busca de imóveis a partir da pergunta do usuário.
Responda APENAS com um JSON válido, sem markdown, sem explicação, no formato:
{"quartos": número ou null, "bairro": string ou null, "tipo": string ou null (ex: apartamento, casa, sala comercial), "preco_max": número ou null (valor máximo em reais), "termos": array de palavras-chave ou []}
Extraia apenas o que o usuário mencionar. Use null para o que não for dito. Para "termos", coloque palavras importantes da pergunta (ex: "copacabana", "varanda", "garagem").`;

  const user = String(pergunta).trim();
  if (!user) return { termos: [] };

  try {
    const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('OpenAI error', res.status, err);
      return fallbackCriterios(pergunta);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return fallbackCriterios(pergunta);

    const parsed = JSON.parse(content);
    return {
      quartos: parsed.quartos ?? null,
      bairro: parsed.bairro ?? null,
      tipo: parsed.tipo ?? null,
      preco_max: parsed.preco_max ?? null,
      termos: Array.isArray(parsed.termos) ? parsed.termos : [],
    };
  } catch (e) {
    console.error('IA extrairCriterios', e);
    return fallbackCriterios(pergunta);
  }
}

/**
 * Fallback quando não há OpenAI: extrai números e palavras da pergunta.
 */
function fallbackCriterios(pergunta) {
  const text = String(pergunta || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const criterios = { quartos: null, bairro: null, tipo: null, preco_max: null, termos: [] };

  const quartosMatch = text.match(/(\d+)\s*(quartos?|dormitorios?|suites?)/);
  if (quartosMatch) criterios.quartos = parseInt(quartosMatch[1], 10);

  const valorMatch = text.match(/(?:ate|até|max|máximo|menos de)\s*[\s R$]*(\d+(?:\.\d{3})*(?:,\d+)?)/i)
    || text.match(/[\s R$](\d+(?:\.\d{3})*(?:,\d+)?)\s*(?:reais|mil|k)/i);
  if (valorMatch) {
    const v = valorMatch[1].replace(/\D/g, '');
    criterios.preco_max = parseInt(v, 10);
    if (text.includes('mil') || text.includes('k')) criterios.preco_max *= 1000;
  }

  const palavras = text.split(/\s+/).filter((p) => p.length > 2 && /\p{L}/u.test(p));
  criterios.termos = [...new Set(palavras)].slice(0, 10);

  return criterios;
}

module.exports = { extrairCriterios };
