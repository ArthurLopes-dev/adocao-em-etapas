<?php
declare(strict_types=1);

/**
 * Cria cards no Pipefy pela API GraphQL pública (https://api.pipefy.com/graphql).
 *
 * Detalhe que pega muita gente: o GraphQL responde HTTP 200 mesmo quando a
 * operação falha, com o motivo dentro de "errors". Por isso o sucesso aqui só
 * é aceito quando volta o id do card criado; qualquer outra coisa vira exceção.
 */
final class PipefyCliente
{
    private const URL = 'https://api.pipefy.com/graphql';

    /** @var callable(string $corpoJson): array resposta já decodificada */
    private $transporte;

    /**
     * @param callable|null $transporte troca o envio HTTP (usado nos testes para
     *        simular as respostas do Pipefy sem rede e sem token real)
     */
    public function __construct(
        private string $token,
        private string $pipeId,
        private string $faseId = '',
        ?callable $transporte = null,
    ) {
        if ($this->token === '' || $this->pipeId === '') {
            throw new InvalidArgumentException('Token e ID do pipe são obrigatórios');
        }
        $this->transporte = $transporte ?? fn(string $corpo) => $this->enviarHttp($corpo);
    }

    /** @param array<string,string> $campos id do campo no Pipefy => valor */
    public function criarCard(string $titulo, array $campos): string
    {
        $atributos = [];
        foreach ($campos as $id => $valor) {
            if ($id === '' || $valor === '') {
                continue;
            }
            $atributos[] = ['field_id' => $id, 'field_value' => $valor];
        }

        $entrada = ['pipe_id' => $this->pipeId, 'title' => $titulo, 'fields_attributes' => $atributos];
        if ($this->faseId !== '') {
            $entrada['phase_id'] = $this->faseId;
        }

        $resposta = ($this->transporte)(json_encode([
            'query' => 'mutation($input: CreateCardInput!) { createCard(input: $input) { card { id } } }',
            'variables' => ['input' => $entrada],
        ], JSON_UNESCAPED_UNICODE));

        $id = $resposta['data']['createCard']['card']['id'] ?? null;
        if (!$id) {
            $motivo = $resposta['errors'][0]['message'] ?? 'resposta sem id do card';
            throw new RuntimeException('Pipefy recusou o card: ' . $motivo);
        }
        return (string)$id;
    }

    private function enviarHttp(string $corpoJson): array
    {
        $ch = curl_init(self::URL);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $this->token,
            ],
            CURLOPT_POSTFIELDS => $corpoJson,
        ]);
        $corpo = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $erro = curl_error($ch);
        curl_close($ch);

        if ($corpo === false) {
            throw new RuntimeException('Sem conexão com o Pipefy: ' . $erro);
        }
        if ($status >= 400) {
            throw new RuntimeException("Pipefy respondeu HTTP $status");
        }
        $json = json_decode((string)$corpo, true);
        if (!is_array($json)) {
            throw new RuntimeException('Resposta do Pipefy não é JSON');
        }
        return $json;
    }
}
