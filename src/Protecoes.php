<?php
declare(strict_types=1);

/**
 * Proteções do endpoint público: token CSRF, campo-isca contra robôs e limite
 * de envios por pessoa.
 *
 * O limite usa um hash do IP com sal (IP_SAL no .env) em vez do IP puro: dá
 * para contar envios sem guardar um dado pessoal que não serve para mais nada.
 */
final class Protecoes
{
    public static function tokenCsrf(): string
    {
        if (empty($_SESSION['csrf'])) {
            $_SESSION['csrf'] = bin2hex(random_bytes(32));
        }
        return $_SESSION['csrf'];
    }

    public static function csrfValido(?string $recebido): bool
    {
        return is_string($recebido) && !empty($_SESSION['csrf'])
            && hash_equals($_SESSION['csrf'], $recebido);
    }

    /** Campo invisível para pessoas; robôs costumam preencher tudo. */
    public static function caiuNaIsca(array $entrada): bool
    {
        return trim((string)($entrada['site'] ?? '')) !== '';
    }

    /** true se ainda pode enviar; registra a tentativa. */
    public static function dentroDoLimite(string $pastaDados, string $ip, int $max = 5, int $janela = 600): bool
    {
        $arquivo = $pastaDados . '/limite.json';
        $chave = hash('sha256', Ambiente::obter('IP_SAL', 'troque-este-sal') . $ip);
        $agora = time();

        $fp = fopen($arquivo, 'c+');
        if ($fp === false) {
            return true; // sem disco não bloqueia quem é legítimo
        }
        flock($fp, LOCK_EX); // dois envios ao mesmo tempo não corrompem o arquivo
        $registro = json_decode(stream_get_contents($fp) ?: '{}', true) ?: [];

        foreach ($registro as $k => $tempos) {
            $registro[$k] = array_values(array_filter($tempos, fn($t) => $t > $agora - $janela));
            if (!$registro[$k]) {
                unset($registro[$k]);
            }
        }
        $permitido = count($registro[$chave] ?? []) < $max;
        if ($permitido) {
            $registro[$chave][] = $agora;
        }

        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, json_encode($registro));
        flock($fp, LOCK_UN);
        fclose($fp);
        return $permitido;
    }
}
