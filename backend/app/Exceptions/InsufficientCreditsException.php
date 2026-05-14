<?php

namespace App\Exceptions;

use RuntimeException;

class InsufficientCreditsException extends RuntimeException
{
    public function __construct(
        public readonly string $walletId,
        public readonly int $requested,
        public readonly int $available,
    ) {
        parent::__construct(sprintf(
            'Insufficient credits in wallet %s: requested %d, available %d.',
            $walletId,
            $requested,
            $available,
        ));
    }
}
