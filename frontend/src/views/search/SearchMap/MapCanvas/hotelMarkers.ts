import type OlMap from 'ol/Map.js';
import Overlay from 'ol/Overlay.js';
import { fromLonLat } from 'ol/proj.js';
import { boundingExtent } from 'ol/extent.js';
import { formatStartingPrice } from '@/lib/format';
import { formatRating } from '@/lib/reviews';
import { store } from '@/lib/store';
import type { MapHotel } from '../types';
import { MAX_ZOOM } from '../constants';
import { createHotelMarker } from './icons';
import { HOTEL_PRICE_ZOOM, layoutHotels, type HotelLocation, type HotelGroup } from './hotelLayout';
import { usesTapPreview } from './hotelPreview';
import styles from './MapCanvas.module.css';

type HotelRecord = HotelLocation & { hotel: MapHotel; signature: string };
type Marker = {
  overlay: Overlay;
  element: HTMLButtonElement;
  signature: string;
  group: HotelGroup;
};

/** Hotel overlays persist across React renders; only visible changes touch the DOM. */
export const createHotelMarkers = (
  map: OlMap,
  onSelect: (id: string) => void,
  onOpen: (hotel: MapHotel, marker: HTMLButtonElement) => void,
  onLeave: (id: string) => void,
  showAllHotels = false,
  nearbyStyle = false
) => {
  const hotels = new Map<string, HotelRecord>();
  const markers = new Map<string, Marker>();
  const formatters = new Map<string, Intl.NumberFormat>();
  let selectedId: string | undefined;
  let comparedIds = new Set(store.getState().hotelCompare.ids);
  let frame: number | undefined;
  let disposed = false;
  const priceLabel = (hotel: MapHotel) => {
    if (hotel.price === undefined) {
      return undefined;
    }
    const currency = hotel.currency ?? 'RUB';
    let formatter = formatters.get(currency);
    if (!formatter) {
      formatter = new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      });
      formatters.set(currency, formatter);
    }
    return `от ${formatter.format(hotel.price)}`;
  };
  const render = () => {
    if (disposed) {
      return;
    }
    const size = map.getSize();
    const view = map.getView();
    const resolution = view.getResolution();
    const zoom = view.getZoom();
    if (!size || !size[0] || !size[1] || resolution === undefined || zoom === undefined) {
      return;
    }
    const groups = layoutHotels(
      hotels.values(),
      view.calculateExtent(size),
      resolution,
      zoom,
      selectedId,
      comparedIds,
      showAllHotels
    );
    const active = new Set<string>();
    for (const group of groups) {
      const single = group.members.length === 1;
      const id = group.members[0].id;
      const key = single ? `hotel:${id}` : group.key;
      active.add(key);
      const record = hotels.get(id)!;
      const hotel = record.hotel;
      const isCompared = comparedIds.has(id);
      const compact = showAllHotels && zoom < HOTEL_PRICE_ZOOM && id !== selectedId;
      const showPrice =
        single &&
        (hotel.price !== undefined || zoom >= HOTEL_PRICE_ZOOM || id === selectedId || isCompared);
      const signature = single
        ? `${compact ? 'pin' : 'price'}:${record.signature}`
        : `cluster:${group.members.length}`;
      let marker = markers.get(key);
      if (!marker) {
        const element = document.createElement('button');
        element.type = 'button';
        const overlay = new Overlay({
          element,
          positioning: 'bottom-center',
          offset: [0, -7],
          stopEvent: true,
        });
        marker = { overlay, element, signature: '', group };
        markers.set(key, marker);
        const entry = marker;
        const singleHotel = () =>
          entry.group.members.length === 1
            ? hotels.get(entry.group.members[0].id)?.hotel
            : undefined;
        element.addEventListener('pointerenter', (event) => {
          const hotel = singleHotel();
          if (hotel && event.pointerType === 'mouse' && !usesTapPreview()) {
            onOpen(hotel, element);
          }
        });
        element.addEventListener('pointerleave', (event) => {
          const hotel = singleHotel();
          if (hotel && event.pointerType === 'mouse') {
            onLeave(hotel.id);
          }
        });
        element.addEventListener('focus', () => {
          const hotel = singleHotel();
          if (hotel && !usesTapPreview() && element.matches(':focus-visible')) {
            onOpen(hotel, element);
          }
        });
        element.addEventListener('blur', () => {
          const hotel = singleHotel();
          if (hotel) {
            onLeave(hotel.id);
          }
        });
        element.addEventListener('click', () => {
          if (entry.group.members.length === 1) {
            const hotel = singleHotel();
            if (hotel) {
              onSelect(hotel.id);
              if (usesTapPreview()) {
                onOpen(hotel, element);
              }
            }
          } else {
            view.fit(boundingExtent(entry.group.members.map((member) => member.coordinate)), {
              padding: [80, 80, 80, 80],
              maxZoom: MAX_ZOOM,
              duration: 350,
            });
          }
        });
        map.addOverlay(overlay);
        element.parentElement?.style.setProperty('z-index', showAllHotels ? '4' : '0');
      }
      marker.group = group;
      if (marker.signature !== signature) {
        if (single) {
          const price = priceLabel(hotel);
          const replacement = createHotelMarker(
            price ?? hotel.name,
            id === selectedId,
            hotel.rating === undefined ? undefined : formatRating(hotel.rating),
            nearbyStyle,
            compact
          );
          marker.element.className = replacement.className;
          marker.element.replaceChildren(...Array.from(replacement.childNodes));
          const detail =
            hotel.price === undefined
              ? undefined
              : hotel.startingPriceUnitType
                ? formatStartingPrice(
                    hotel.price,
                    hotel.currency ?? 'RUB',
                    hotel.startingPriceUnitType
                  )
                : `${price} за ночь${hotel.priceGuests ? ` · ${hotel.priceGuests}` : ''}`;
          marker.element.title = detail ? `${hotel.name}: ${detail}` : hotel.name;
          marker.element.dataset.hotelId = id;
          delete marker.element.dataset.hotelCluster;
        } else {
          marker.element.className = styles.hotelCluster;
          marker.element.textContent = String(group.members.length);
          marker.element.title = single
            ? hotel.name
            : `Отелей: ${group.members.length}. Приблизить карту`;
          marker.element.dataset.hotelCluster = String(group.members.length);
          delete marker.element.dataset.hotelId;
        }
        marker.element.setAttribute('aria-label', marker.element.title);
        marker.signature = signature;
      }
      marker.element.classList.toggle(styles.selectedPrice, showPrice && id === selectedId);
      marker.element.classList.toggle(styles.comparedPrice, showPrice && isCompared);
      marker.element.setAttribute('aria-pressed', String(single && id === selectedId));
      const previous = marker.overlay.getPosition();
      if (!previous || previous[0] !== group.coordinate[0] || previous[1] !== group.coordinate[1]) {
        marker.overlay.setPosition(group.coordinate);
      }
      marker.element.parentElement?.style.setProperty(
        'z-index',
        single && (id === selectedId || isCompared) ? '3' : '1'
      );
    }
    for (const [key, marker] of markers) {
      if (!active.has(key)) {
        map.removeOverlay(marker.overlay);
        markers.delete(key);
      }
    }
  };
  const schedule = () => {
    if (frame !== undefined || disposed) {
      return;
    }
    frame = requestAnimationFrame(() => {
      frame = undefined;
      render();
    });
  };
  const unsubscribe = store.subscribe(() => {
    const next = new Set(store.getState().hotelCompare.ids);
    if (next.size !== comparedIds.size || [...next].some((id) => !comparedIds.has(id))) {
      comparedIds = next;
      schedule();
    }
  });
  map.on('moveend', schedule);
  map.on('change:size', schedule);
  return {
    setHotels(next: MapHotel[]) {
      const ids = new Set(next.map((hotel) => hotel.id));
      for (const id of hotels.keys()) {
        if (!ids.has(id)) {
          hotels.delete(id);
        }
      }
      for (const hotel of next) {
        const signature = JSON.stringify(hotel);
        if (hotels.get(hotel.id)?.signature !== signature) {
          hotels.set(hotel.id, {
            id: hotel.id,
            hotel,
            signature,
            coordinate: fromLonLat([hotel.position[1], hotel.position[0]]),
          });
        }
      }
      schedule();
    },
    select(id?: string) {
      if (id === selectedId) {
        return;
      }
      const previous = selectedId;
      selectedId = id;
      if ((map.getView().getZoom() ?? 0) < HOTEL_PRICE_ZOOM) {
        schedule();
      } else {
        for (const key of [previous, id]) {
          const marker = key ? markers.get(`hotel:${key}`) : undefined;
          if (!marker) {
            continue;
          }
          marker.element.classList.toggle(styles.selectedPrice, key === id);
          marker.element.setAttribute('aria-pressed', String(key === id));
          marker.element.parentElement?.style.setProperty('z-index', key === id ? '3' : '1');
        }
      }
    },
    dispose() {
      disposed = true;
      unsubscribe();
      if (frame !== undefined) {
        cancelAnimationFrame(frame);
      }
      map.un('moveend', schedule);
      map.un('change:size', schedule);
      for (const marker of markers.values()) {
        map.removeOverlay(marker.overlay);
      }
      markers.clear();
      hotels.clear();
    },
  };
};
