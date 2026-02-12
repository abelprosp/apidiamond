# Busca por pergunta (chat com IA)

O chat envia uma **pergunta em linguagem natural** e a API usa IA para extrair critérios e devolver os imóveis que batem com a busca.

## Endpoint

- **Local:** `POST http://localhost:3000/buscar`
- **Vercel:** `POST https://seu-projeto.vercel.app/api/buscar`

## Body (JSON)

```json
{
  "pergunta": "apartamento com 2 quartos em Copacabana até 500 mil"
}
```

Também aceita: `mensagem`, `message` ou `query` no lugar de `pergunta`.

## Resposta

```json
{
  "pergunta": "apartamento com 2 quartos em Copacabana até 500 mil",
  "criterios": {
    "quartos": 2,
    "bairro": "Copacabana",
    "tipo": "apartamento",
    "preco_max": 500000,
    "termos": ["apartamento", "copacabana"]
  },
  "total": 5,
  "imoveis": [ ... ]
}
```

A IA extrai **quartos**, **bairro**, **tipo**, **preco_max** e **termos**; a API busca várias páginas de imóveis, filtra e devolve até 20.

## Variáveis de ambiente

- **OPENAI_API_KEY** – Chave da OpenAI (recomendado). Sem ela, usa um fallback que extrai números e palavras da pergunta.
- **OPENAI_MODEL** – (opcional) Padrão: `gpt-4o-mini`
- **BUSCAR_MAX_PAGINAS** – (opcional) Quantas páginas buscar para filtrar. Padrão: 3

## Exemplo em PHP (chat chamando a API)

```php
$pergunta = "casa 3 quartos com piscina"; // texto que o usuário digitou no chat

$ch = curl_init('https://seu-projeto.vercel.app/api/buscar');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode(['pergunta' => $pergunta]),
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_RETURNTRANSFER => true,
]);
$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);
// $data['imoveis'] = lista dos imóveis que batem com a busca
// $data['total'] = quantidade
// Use isso para montar a resposta do chat para o usuário
```

## Fluxo resumido

1. Usuário escreve no chat: "quero um apartamento de 2 quartos em Copacabana".
2. Seu chat/sistema envia **POST /api/buscar** com `{ "pergunta": "..." }`.
3. A API usa a IA para extrair critérios (quartos: 2, bairro: Copacabana, tipo: apartamento).
4. A API busca imóveis na Diamond, filtra pela lista e devolve os que batem.
5. Seu chat exibe os imóveis (ou um resumo) para o usuário.
