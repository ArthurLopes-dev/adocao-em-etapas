<?php
declare(strict_types=1);

/**
 * Valida o pedido de adoção no servidor.
 *
 * O navegador também valida cada etapa, mas isso é só conforto para quem
 * preenche: qualquer pessoa pode mandar um POST direto, então a regra que vale
 * é a daqui. Campos que não estão na lista são descartados (coleta mínima).
 */
final class Validador
{
    public const MORADIAS = ['casa', 'apartamento', 'chacara'];
    public const PORTES = ['pequeno', 'medio', 'grande', 'tanto-faz'];

    /** @return array{0: array, 1: array<string,string>} [dados limpos, erros por campo] */
    public static function pedido(array $entrada, array $petsValidos): array
    {
        $erros = [];
        $txt = static fn(string $k, int $max) => mb_substr(trim((string)($entrada[$k] ?? '')), 0, $max);

        $dados = [
            'nome'        => $txt('nome', 120),
            'email'       => mb_strtolower($txt('email', 160)),
            'telefone'    => preg_replace('/\D+/', '', $txt('telefone', 20)),
            'bairro'      => $txt('bairro', 80),
            'moradia'     => $txt('moradia', 20),
            'telado'      => ($entrada['telado'] ?? '') === 'sim' ? 'sim' : 'nao',
            'outros_pets' => $txt('outros_pets', 200),
            'todos_de_acordo' => ($entrada['todos_de_acordo'] ?? '') === 'sim',
            'pet'         => $txt('pet', 40),
            'porte'       => $txt('porte', 20),
            'motivo'      => $txt('motivo', 1000),
            'consentimento' => ($entrada['consentimento'] ?? '') === 'sim',
        ];

        if (mb_strlen($dados['nome']) < 3) {
            $erros['nome'] = 'Informe o nome completo.';
        }
        if (!filter_var($dados['email'], FILTER_VALIDATE_EMAIL)) {
            $erros['email'] = 'E-mail inválido.';
        }
        if ($dados['telefone'] !== '' && !preg_match('/^\d{10,11}$/', $dados['telefone'])) {
            $erros['telefone'] = 'Telefone com DDD, só números (10 ou 11 dígitos).';
        }
        if ($dados['bairro'] === '') {
            $erros['bairro'] = 'Escolha o bairro.';
        }
        if (!in_array($dados['moradia'], self::MORADIAS, true)) {
            $erros['moradia'] = 'Escolha o tipo de moradia.';
        }
        if (!$dados['todos_de_acordo']) {
            $erros['todos_de_acordo'] = 'Todos da casa precisam concordar com a adoção.';
        }
        if ($dados['pet'] !== 'qualquer' && !in_array($dados['pet'], $petsValidos, true)) {
            $erros['pet'] = 'Escolha um pet da lista ou "qualquer um".';
        }
        if (!in_array($dados['porte'], self::PORTES, true)) {
            $erros['porte'] = 'Escolha o porte.';
        }
        if (mb_strlen($dados['motivo']) < 20) {
            $erros['motivo'] = 'Conte um pouco mais (mínimo de 20 caracteres).';
        }
        if (!$dados['consentimento']) {
            $erros['consentimento'] = 'É preciso aceitar o uso dos dados para analisar o pedido.';
        }

        return [$dados, $erros];
    }
}
