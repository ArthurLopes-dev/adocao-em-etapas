<?php
declare(strict_types=1);

/*
 * Ligação entre os campos do formulário e os campos do pipe no Pipefy.
 *
 * Os IDs dos campos ficam no .env, não aqui: cada pessoa que montar o próprio
 * pipe (ver docs/montar-o-pipe.md) terá IDs diferentes, e o código não muda.
 * Campo sem ID configurado é simplesmente ignorado no envio.
 */
return [
    'nome'          => 'PIPEFY_CAMPO_NOME',
    'email'         => 'PIPEFY_CAMPO_EMAIL',
    'telefone'      => 'PIPEFY_CAMPO_TELEFONE',
    'bairro'        => 'PIPEFY_CAMPO_BAIRRO',
    'moradia'       => 'PIPEFY_CAMPO_MORADIA',
    'telado'        => 'PIPEFY_CAMPO_TELADO',
    'outros_pets'   => 'PIPEFY_CAMPO_OUTROS_PETS',
    'pet'           => 'PIPEFY_CAMPO_PET',
    'porte'         => 'PIPEFY_CAMPO_PORTE',
    'motivo'        => 'PIPEFY_CAMPO_MOTIVO',
    'consentimento' => 'PIPEFY_CAMPO_CONSENTIMENTO',
];
