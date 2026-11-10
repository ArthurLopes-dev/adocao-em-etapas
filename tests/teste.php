<?php
declare(strict_types=1);

// Testes sem framework: php tests/teste.php
require __DIR__ . '/../src/Ambiente.php';
require __DIR__ . '/../src/Validador.php';
require __DIR__ . '/../src/Protecoes.php';

$falhas = 0;
function confere(string $nome, bool $ok): void
{
    global $falhas;
    echo ($ok ? '  ok   ' : '  FALHA ') . $nome . PHP_EOL;
    if (!$ok) {
        $falhas++;
    }
}

$pets = ['caramelo', 'pipoca'];
$valido = [
    'nome' => 'Maria da Silva', 'email' => 'MARIA@exemplo.com', 'telefone' => '(11) 98888-7777',
    'bairro' => 'Centro', 'moradia' => 'casa', 'todos_de_acordo' => 'sim', 'pet' => 'caramelo',
    'porte' => 'medio', 'motivo' => 'Tenho quintal grande e tempo para passear todo dia.',
    'consentimento' => 'sim', 'campo_extra' => 'não deveria passar',
];

echo "Validador\n";
[$d, $e] = Validador::pedido($valido, $pets);
confere('pedido completo passa', $e === []);
confere('e-mail vira minúsculo', $d['email'] === 'maria@exemplo.com');
confere('telefone fica só com dígitos', $d['telefone'] === '11988887777');
confere('campo fora da lista é descartado', !array_key_exists('campo_extra', $d));

[, $e] = Validador::pedido(['consentimento' => 'nao'] + $valido, $pets);
confere('sem consentimento não passa', isset($e['consentimento']));

[, $e] = Validador::pedido(['pet' => 'pet-inventado'] + $valido, $pets);
confere('pet fora da lista não passa', isset($e['pet']));

[, $e] = Validador::pedido(['pet' => 'qualquer'] + $valido, $pets);
confere('"qualquer" é aceito', !isset($e['pet']));

[, $e] = Validador::pedido(['telefone' => '123'] + $valido, $pets);
confere('telefone curto não passa', isset($e['telefone']));

[, $e] = Validador::pedido(['telefone' => ''] + $valido, $pets);
confere('telefone é opcional', !isset($e['telefone']));

[, $e] = Validador::pedido([], $pets);
confere('envio vazio aponta vários erros', count($e) >= 7);

echo "Proteções\n";
$tmp = sys_get_temp_dir() . '/adocao-teste-' . bin2hex(random_bytes(3));
mkdir($tmp);
$resultados = [];
for ($i = 0; $i < 6; $i++) {
    $resultados[] = Protecoes::dentroDoLimite($tmp, '203.0.113.9', 5, 600);
}
confere('5 envios passam e o 6º é barrado', $resultados === [true, true, true, true, true, false]);
confere('outro IP não é afetado', Protecoes::dentroDoLimite($tmp, '198.51.100.7', 5, 600));
confere('o IP não fica gravado em texto puro', !str_contains(file_get_contents("$tmp/limite.json"), '203.0.113.9'));
confere('isca preenchida é detectada', Protecoes::caiuNaIsca(['site' => 'http://spam']));
confere('isca vazia passa', !Protecoes::caiuNaIsca(['site' => '']));
array_map('unlink', glob("$tmp/*"));
rmdir($tmp);

// Modo real: o envio HTTP é trocado por respostas simuladas no formato da API
// do Pipefy, então o teste roda sem rede e sem token de verdade.
require __DIR__ . '/../src/PipefyCliente.php';
echo "Cliente Pipefy (modo real, respostas simuladas)\n";
$enviado = null;
$sucesso = function (string $corpo) use (&$enviado): array {
    $enviado = json_decode($corpo, true);
    return ['data' => ['createCard' => ['card' => ['id' => '1001']]]];
};
$cliente = new PipefyCliente('token-de-teste', '42', '7', $sucesso);
$id = $cliente->criarCard('ADT-1 · Caramelo · Maria', ['campo_nome' => 'Maria', 'campo_vazio' => '', '' => 'sem id']);
$entrada = $enviado['variables']['input'] ?? [];
confere('devolve o id do card criado', $id === '1001');
confere('usa a mutação createCard', str_contains($enviado['query'] ?? '', 'createCard'));
confere('manda pipe, fase e título', $entrada['pipe_id'] === '42' && $entrada['phase_id'] === '7' && str_starts_with($entrada['title'], 'ADT-1'));
confere('manda só campos com id e valor', $entrada['fields_attributes'] === [['field_id' => 'campo_nome', 'field_value' => 'Maria']]);

$semFase = new PipefyCliente('token-de-teste', '42', '', $sucesso);
$semFase->criarCard('t', ['c' => 'v']);
confere('sem fase configurada, o Pipefy usa a fase inicial', !array_key_exists('phase_id', $enviado['variables']['input']));

$erroGraphql = fn() => ['data' => ['createCard' => null], 'errors' => [['message' => 'Pipe not found with id: 42']]];
try {
    (new PipefyCliente('token-de-teste', '42', '', $erroGraphql))->criarCard('t', []);
    confere('HTTP 200 com "errors" vira falha', false);
} catch (RuntimeException $e) {
    confere('HTTP 200 com "errors" vira falha', str_contains($e->getMessage(), 'Pipe not found'));
}
try {
    (new PipefyCliente('token-de-teste', '42', '', fn() => ['data' => []]))->criarCard('t', []);
    confere('resposta sem id do card vira falha', false);
} catch (RuntimeException) {
    confere('resposta sem id do card vira falha', true);
}
try {
    new PipefyCliente('', '42');
    confere('sem token o cliente não é criado', false);
} catch (InvalidArgumentException) {
    confere('sem token o cliente não é criado', true);
}

echo $falhas ? "\n$falhas falha(s)\n" : "\nTudo certo\n";
exit($falhas ? 1 : 0);
