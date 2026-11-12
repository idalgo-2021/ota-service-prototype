export type SearchDistance = 'any' | 'under_1' | '1_to_3' | '3_to_5' | 'over_5';

type DistanceOption = {
  value: SearchDistance;
  label: string;
  params: { min_distance_km?: number; max_distance_km?: number };
};

export const DISTANCE_OPTIONS: DistanceOption[] = [
  { value: 'any', label: 'Любое расстояние', params: {} },
  { value: 'under_1', label: 'До 1 км', params: { max_distance_km: 1 } },
  {
    value: '1_to_3',
    label: 'От 1 до 3 км',
    params: { min_distance_km: 1, max_distance_km: 3 },
  },
  {
    value: '3_to_5',
    label: 'От 3 до 5 км',
    params: { min_distance_km: 3, max_distance_km: 5 },
  },
  { value: 'over_5', label: 'От 5 км', params: { min_distance_km: 5 } },
];
