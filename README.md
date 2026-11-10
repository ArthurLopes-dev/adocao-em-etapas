# Adoção em etapas · formulário → Pipefy

Formulário de adoção de pets em quatro etapas que transforma cada pedido em um
card no [Pipefy](https://www.pipefy.com/), pela API GraphQL. PHP 8 sem framework; no navegador, anime.js e three.js
empacotados no próprio projeto.

> **Projeto de portfólio.** O "Abrigo Quintal do Vale", a cidade de Vale Sereno,
> os bairros e os pets são fictícios.

## O que ele mostra

- **Formulário em etapas** com validação por etapa, revisão antes do envio e
  retorno ao ponto exato do erro quando o servidor recusa um campo.
- **Integração com a API do Pipefy** (`createCard`), com o mapeamento de campos
  em configuração e não no código.
- **Validação de verdade no servidor**: o navegador valida para dar conforto,
  mas a regra que vale é a do PHP, porque qualquer um pode mandar um POST direto.
- **Proteções de um endpoint público**: token CSRF, campo-isca contra robôs e
  limite de envios por pessoa.
- **LGPD na prática**: consentimento explícito com versão do termo, coleta
  mínima (campo extra é descartado), telefone opcional e IP guardado só como
  hash com sal.

## Rodar

```bash
cp .env.example .env      # pode deixar tudo vazio
php -S localhost:8080 -t public
```

Abra <http://localhost:8080>. Sem token ou sem pipe, ele roda em **modo demonstração**: o
pedido é salvo em `dados/pedidos-demo.jsonl` e nada sai da sua máquina.

Para ligar no Pipefy, siga [docs/montar-o-pipe.md](docs/montar-o-pipe.md).

## Testes

```bash
php tests/teste.php
```

## Decisões

**Por que o sucesso só conta com o id do card?** A API GraphQL responde HTTP 200
mesmo quando a operação falha, com o motivo dentro de `errors`. Checar só o
status faria o formulário dizer "recebido" para um pedido que nunca chegou.

**Por que os IDs dos campos ficam no `.env`?** Cada pipe tem IDs próprios. Com
eles fora do código, qualquer pessoa monta o seu pipe e roda o projeto sem
mexer em PHP.

**Por que hash do IP e não o IP?** O limite de envios só precisa saber se é a
mesma pessoa, não quem ela é. Guardar o IP puro seria dado pessoal sem
finalidade.

**Por que o robô recebe "ok"?** Se a isca devolvesse erro, o robô aprenderia a
deixar o campo vazio. Respondendo sucesso, ele vai embora achando que passou.

## Camada visual (anime.js + three.js)

O formulário funciona sozinho; a animação é uma camada por cima, em `frontend/`:

- **Cena 3D** (three.js): patinhas de "massinha" modeladas no código, com
  material matcap desenhado num canvas (sem luz, sem imagem para baixar). Uma
  trilha de quatro pegadas mostra o progresso: cada etapa concluída pinta uma.
- **Movimento** (anime.js v4): título palavra por palavra, contadores, troca de
  etapa coreografada, mola nas escolhas, campo que sacode no erro e o "check"
  desenhado no envio.
- **Três caminhos funcionam**: normal; `prefers-reduced-motion` (nada se move e
  nenhum loop roda, mas a trilha ainda muda de cor); e sem o JavaScript dos
  efeitos (o CSS mostra tudo sozinho).

As bibliotecas vão empacotadas em `public/assets/efeitos.js` (nada de CDN). Para
refazer o pacote depois de mexer em `frontend/`:

```bash
npm install
npm run build
```

## Estrutura

```
public/            o que o servidor expõe
  index.html       formulário
  enviar.php       endpoint (GET = token CSRF, POST = pedido)
  assets/          CSS e JS
  dados/pets.json  pets do abrigo fictício
src/               classes (ambiente, validação, proteções, cliente Pipefy)
config/campos.php  formulário → variáveis com os IDs do pipe
dados/             gerado em execução, fora do git
tests/             testes sem framework
```

## Segredos

Nenhum token está neste repositório. O `.env` está no `.gitignore` e o
`.env.example` traz só os nomes das variáveis, vazios.

## Licença

MIT. Inclui three.js e anime.js (ambos MIT); os avisos de licença ficam no fim dos pacotes.
