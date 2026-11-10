<?php
declare(strict_types=1);

/**
 * Lê o arquivo .env da raiz do projeto.
 *
 * Por que não usar uma biblioteca: o projeto roda em qualquer hospedagem PHP
 * sem Composer. O .env nunca vai para o git (ver .gitignore); o repositório
 * traz só o .env.example, com os nomes das variáveis e os valores vazios.
 */
final class Ambiente
{
    private static array $valores = [];

    public static function carregar(string $arquivo): void
    {
        if (!is_file($arquivo)) {
            return; // sem .env o projeto entra em modo demonstração
        }
        foreach (file($arquivo, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $linha) {
            $linha = trim($linha);
            if ($linha === '' || str_starts_with($linha, '#') || !str_contains($linha, '=')) {
                continue;
            }
            [$chave, $valor] = array_map('trim', explode('=', $linha, 2));
            self::$valores[$chave] = trim($valor, "\"'");
        }
    }

    public static function obter(string $chave, string $padrao = ''): string
    {
        $doSistema = getenv($chave);
        if ($doSistema !== false && $doSistema !== '') {
            return $doSistema; // variável do servidor/contêiner tem prioridade
        }
        return self::$valores[$chave] ?? $padrao;
    }
}
