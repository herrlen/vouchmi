<?php

namespace App\Enums;

enum ProfileLayout: string
{
    case MASONRY = 'masonry';
    case FEATURED = 'featured';

    public function label(): string
    {
        return match ($this) {
            self::MASONRY  => 'Masonry',
            self::FEATURED => 'Featured',
        };
    }
}
