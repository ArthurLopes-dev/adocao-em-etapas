<?php
declare(strict_types=1);

/*
 * Endpoint do formulário.
 *   GET  -> devolve o token CSRF da sessão
 *   POST -> valida o pedido e cria o card (Pipefy) ou grava em arquivo (demonstração)
 *
 * Sem PIPEFY_TOKEN ou PIPEFY_PIPE_ID o projeto roda em MODO DEMONSTRAÇÃO: nada sai da
 * máquina, o pedido vai para dados/pedidos-demo.jsonl (fora da pasta pública
 * e fora do git).
 */

$raiz = dirname(__DIR__);
require $raiz . '/src/Ambiente.php';
require $raiz . '/src/Validador.php';
require $raiz . '/src/Protecoes.php';
require $raiz . '/src/PipefyCliente.php';

Ambiente::carregar($raiz . '/.env');

session_start([
    'cookie_httponly' => true,
    'cookie_samesite' => 'Strict',
    'cookie_secure'   => !empty($_SERVER['HTTPS']),
]);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function responder(int $status, array $corpo): never
{
    http_response_code($status);
    echo json_encode($corpo, JSON_UNESCAPED_UNICODE);
    exit;
}

$pastaDados = $raiz . '/dados';
if (!is_dir($pastaDados)) {
    mkdir($pastaDados, 0750, true);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    responder(200, ['csrf' => Protecoes::tokenCsrf()]);
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder(405, ['ok' => false, 'erro' => 'Método não permitido']);
}

$entrada = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($entrada)) {
    responder(400, ['ok' => false, 'erro' => 'Envio inválido']);
}
if (!Protecoes::csrfValido($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null)) {
    responder(403, ['ok' => false, 'erro' => 'Sessão expirada. Recarregue a página.']);
}
if (Protecoes::caiuNaIsca($entrada)) {
    responder(200, ['ok' => true, 'protocolo' => 'ADT-' . date('Ymd') . '-0000']); // robô não percebe a recusa
}
if (!Protecoes::dentroDoLimite($pastaDados, $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0')) {
    responder(429, ['ok' => false, 'erro' => 'Muitos envios seguidos. Tente de novo em alguns minutos.']);
}

$pets = json_decode((string)file_get_contents(__DIR__ . '/dados/pets.json'), true) ?: [];
[$dados, $erros] = Validador::pedido($entrada, array_column($pets, 'id'));
if ($erros) {
    responder(422, ['ok' => false, 'erros' => $erros]);
}

$protocolo = 'ADT-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(2)));
$nomePet = 'qualquer pet';
foreach ($pets as $p) {
    if ($p['id'] === $dados['pet']) {
        $nomePet = $p['nome'];
    }
}
$primeiroNome = explode(' ', $dados['nome'])[0];
$titulo = "$protocolo · $nomePet · $primeiroNome";

$token = Ambiente::obter('PIPEFY_TOKEN');
$pipeId = Ambiente::obter('PIPEFY_PIPE_ID');

// Demonstração quando falta o token OU o pipe: um PIPEFY_TOKEN que já exista
// no sistema (de outro projeto) não pode fazer este enviar para lugar nenhum.
if ($token === '' || $pipeId === '') {
    // MODO DEMONSTRAÇÃO
    $registro = [
        'protocolo' => $protocolo,
        'titulo' => $titulo,
        'recebido_em' => date('c'),
        'dados' => $dados,
        'consentimento' => ['aceito' => true, 'versao_termo' => '2026-01', 'em' => date('c')],
    ];
    file_put_contents($pastaDados . '/pedidos-demo.jsonl',
        json_encode($registro, JSON_UNESCAPED_UNICODE) . PHP_EOL, FILE_APPEND | LOCK_EX);
    responder(201, ['ok' => true, 'protocolo' => $protocolo, 'modo' => 'demonstracao']);
}

$mapa = require $raiz . '/config/campos.php';
$campos = [];
foreach ($mapa as $chave => $variavel) {
    $valor = $dados[$chave];
    if (is_bool($valor)) {
        $valor = $valor ? 'Sim' : 'Não';
    }
    $campos[Ambiente::obter($variavel)] = (string)$valor;
}

try {
    $cliente = new PipefyCliente($token, $pipeId, Ambiente::obter('PIPEFY_FASE_ID'));
    $cliente->criarCard($titulo, $campos);
} catch (Throwable $e) {
    error_log('[adocao] ' . $e->getMessage()); // detalhe só no log do servidor
    responder(502, ['ok' => false, 'erro' => 'Não conseguimos registrar agora. Tente de novo em instantes.']);
}

responder(201, ['ok' => true, 'protocolo' => $protocolo]);
