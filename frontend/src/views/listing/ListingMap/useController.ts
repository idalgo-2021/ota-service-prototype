import { useMemo } from 'react';
import { getDemoReviews } from '@/lib/reviews';
import type { MapPosition, SearchMapData } from '@/views/search';

export const useController = (
  id: string,
  title: string,
  city: string,
  latitude: number,
  longitude: number
) => {
  // Карта пересоздаёт метки и центр при каждом новом `data`, поэтому держим один объект.
  const data = useMemo<SearchMapData>(() => {
    const position: MapPosition = [latitude, longitude];
    return {
      city,
      center: position,
      hotels: [{ id, name: title, position, rating: getDemoReviews({ id, title }).rating }],
      points: [],
      districts: [],
    };
  }, [id, title, city, latitude, longitude]);

  return { data };
};
