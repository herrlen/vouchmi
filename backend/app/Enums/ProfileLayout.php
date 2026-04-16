<?php

namespace App\Enums;

enum ProfileLayout: string
{
    case MASONRY = 'masonry';
    case FEATURED = 'featured';
    case STORY = 'story';

    public function label(): string
    {
        return match ($this) {
            self::MASONRY  => 'Masonry',
            self::FEATURED => 'Featured',
            self::STORY    => 'Story',
        };
    }
}
