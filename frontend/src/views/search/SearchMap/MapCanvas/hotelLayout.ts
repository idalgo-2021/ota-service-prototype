export type HotelLocation = { id: string; coordinate: number[] };
export type HotelGroup = { key: string; members: HotelLocation[]; coordinate: number[] };
export const HOTEL_PRICE_ZOOM = 15;
export const HOTEL_VIEWPORT_PADDING = 160;
const CLUSTER_CELL_PX = 72;

export const layoutHotels = (
  hotels: Iterable<HotelLocation>,
  extent: number[],
  resolution: number,
  zoom: number,
  selectedId?: string,
  comparedIds: ReadonlySet<string> = new Set(),
  showAllHotels = false
): HotelGroup[] => {
  const padding = HOTEL_VIEWPORT_PADDING * resolution;
  const cell = CLUSTER_CELL_PX * resolution;
  const groups = new Map<string, HotelGroup>();
  for (const hotel of hotels) {
    const [x, y] = hotel.coordinate;
    if (
      x < extent[0] - padding ||
      x > extent[2] + padding ||
      y < extent[1] - padding ||
      y > extent[3] + padding
    ) {
      continue;
    }
    const key =
      showAllHotels ||
      zoom >= HOTEL_PRICE_ZOOM ||
      hotel.id === selectedId ||
      comparedIds.has(hotel.id)
        ? `hotel:${hotel.id}`
        : `cluster:${Math.floor(x / cell)}:${Math.floor(y / cell)}`;
    const group = groups.get(key);
    if (group) {
      group.members.push(hotel);
      group.coordinate[0] += x;
      group.coordinate[1] += y;
    } else {
      groups.set(key, { key, members: [hotel], coordinate: [x, y] });
    }
  }
  return Array.from(groups.values(), (group) => ({
    ...group,
    coordinate: group.coordinate.map((value) => value / group.members.length),
  }));
};
