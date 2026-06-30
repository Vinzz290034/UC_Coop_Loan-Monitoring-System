'use client';

import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
  size?: number;
}

export default function StarRating({
  rating,
  maxStars = 5,
  interactive = false,
  onChange,
  size = 20,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const handleMouseEnter = (index: number) => {
    if (!interactive) return;
    setHoverRating(index);
  };

  const handleMouseLeave = () => {
    if (!interactive) return;
    setHoverRating(null);
  };

  const handleClick = (index: number) => {
    if (!interactive || !onChange) return;
    onChange(index);
  };

  const currentRating = hoverRating !== null ? hoverRating : rating;

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: maxStars }).map((_, i) => {
        const index = i + 1;
        const isFilled = index <= currentRating;

        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onClick={() => handleClick(index)}
            onMouseEnter={() => handleMouseEnter(index)}
            onMouseLeave={handleMouseLeave}
            className={`transition-colors ${
              interactive ? 'cursor-pointer hover:scale-110 active:scale-95' : 'cursor-default'
            } focus:outline-none`}
          >
            <Star
              size={size}
              className={`transition-colors ${
                isFilled
                  ? 'fill-secondary text-secondary'
                  : 'text-neutral/40 dark:text-neutral/60'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
