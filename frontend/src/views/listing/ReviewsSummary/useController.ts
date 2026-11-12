import { formatCount } from '@/lib/format';
import { formatRating, type ListingReviews } from '@/lib/reviews';

const STARS = 5;

export const useController = ({ rating, count }: ListingReviews) => {
  const filledStars = Math.round(rating / 2);

  return {
    rating: formatRating(rating),
    // Пять звёзд отображают десятибалльную оценку: 9,6 — пять, 8,4 — четыре.
    stars: Array.from({ length: STARS }, (_, index) => index < filledStars),
    count: formatCount(count, ['отзыв', 'отзыва', 'отзывов']),
  };
};
