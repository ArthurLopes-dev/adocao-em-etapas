# Montar o pipe no Pipefy

O projeto funciona sem Pipefy (modo demonstração). Para ligar de verdade, crie
um pipe seu, gratuito, com esta estrutura.

## Fases

| Fase | Para quê |
|---|---|
| Triagem | onde o card nasce (use o ID dela em `PIPEFY_FASE_ID`) |
| Entrevista | a equipe conversa com a pessoa |
| Visita | visita à casa, quando o porte exige |
| Aprovado / Não aprovado | fim do processo |

## Campos do formulário inicial

| Campo no pipe | Tipo | Variável no .env |
|---|---|---|
| Nome | texto curto | `PIPEFY_CAMPO_NOME` |
| E-mail | e-mail | `PIPEFY_CAMPO_EMAIL` |
| Telefone | telefone | `PIPEFY_CAMPO_TELEFONE` |
| Bairro | texto curto | `PIPEFY_CAMPO_BAIRRO` |
| Moradia | texto curto | `PIPEFY_CAMPO_MORADIA` |
| Telas | texto curto | `PIPEFY_CAMPO_TELADO` |
| Outros animais | texto longo | `PIPEFY_CAMPO_OUTROS_PETS` |
| Pet | texto curto | `PIPEFY_CAMPO_PET` |
| Porte | texto curto | `PIPEFY_CAMPO_PORTE` |
| Motivo | texto longo | `PIPEFY_CAMPO_MOTIVO` |
| Consentimento | texto curto | `PIPEFY_CAMPO_CONSENTIMENTO` |

## Descobrir os IDs

No [explorador da API](https://api.pipefy.com/graphql), autenticado com o seu
token pessoal:

```graphql
{
  pipe(id: "ID_DO_SEU_PIPE") {
    phases { id name }
    start_form_fields { id label }
  }
}
```

Copie cada `id` para a variável correspondente no `.env`.

## Token

Gere em *Configurações da conta → Tokens de acesso pessoal*. Ele fica só no
`.env` (ou nas variáveis do servidor) e nunca no código.
