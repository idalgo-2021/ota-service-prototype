import type { MapHotel } from '../types';
import { createHotelPopup } from './hotelPopup';

const TOUCH_LAYOUT = '(max-width: 767px), (hover: none), (pointer: coarse)';
const EDGE_GAP = 12;
const MARKER_GAP = 10;
const HIDE_DELAY = 180;
const MAP_VARIABLES = [
  '--map-primary',
  '--map-primary-soft',
  '--map-surface',
  '--map-text',
  '--map-border',
  '--map-shadow',
];

export const usesTapPreview = () => window.matchMedia(TOUCH_LAYOUT).matches;

/** One fixed preview follows the hovered marker, or docks above the mobile safe area. */
export const createHotelPreview = (mapElement: HTMLElement) => {
  let activeHotel: MapHotel | undefined;
  let anchor: HTMLButtonElement | undefined;
  let popup: HTMLElement | undefined;
  let hideTimer: ReturnType<typeof setTimeout> | undefined;

  const clearHide = () => {
    if (hideTimer !== undefined) {
      clearTimeout(hideTimer);
      hideTimer = undefined;
    }
  };
  const close = () => {
    clearHide();
    popup?.dispatchEvent(new Event('dispose'));
    popup?.remove();
    popup = undefined;
    anchor = undefined;
    activeHotel = undefined;
  };
  const position = () => {
    if (!popup || !anchor || usesTapPreview()) {
      return;
    }
    const marker = anchor.getBoundingClientRect();
    const card = popup.getBoundingClientRect();
    const map = mapElement.getBoundingClientRect();
    const spaceRight = map.right - marker.right - EDGE_GAP;
    const spaceLeft = marker.left - map.left - EDGE_GAP;
    let x: number;
    let y: number;
    if (spaceRight >= card.width + MARKER_GAP || spaceLeft >= card.width + MARKER_GAP) {
      const right = spaceRight >= card.width + MARKER_GAP;
      x = right ? marker.right + MARKER_GAP : marker.left - card.width - MARKER_GAP;
      y = marker.top + marker.height / 2 - card.height / 2;
    } else {
      x = marker.left + marker.width / 2 - card.width / 2;
      const spaceBelow = map.bottom - marker.bottom;
      const spaceAbove = marker.top - map.top;
      y =
        spaceBelow >= card.height + MARKER_GAP || spaceBelow >= spaceAbove
          ? marker.bottom + MARKER_GAP
          : marker.top - card.height - MARKER_GAP;
    }
    popup.style.left = `${Math.max(map.left + EDGE_GAP, Math.min(x, map.right - card.width - EDGE_GAP))}px`;
    popup.style.top = `${Math.max(map.top + EDGE_GAP, Math.min(y, map.bottom - card.height - EDGE_GAP))}px`;
  };
  const scheduleClose = (id: string) => {
    if (usesTapPreview() || activeHotel?.id !== id) {
      return;
    }
    clearHide();
    hideTimer = setTimeout(close, HIDE_DELAY);
  };
  const open = (hotel: MapHotel, marker: HTMLButtonElement) => {
    clearHide();
    if (activeHotel?.id === hotel.id && popup) {
      if (usesTapPreview()) {
        close();
      } else {
        position();
      }
      return;
    }
    close();
    activeHotel = hotel;
    anchor = marker;
    popup = createHotelPopup(hotel, close);
    const variables = getComputedStyle(mapElement);
    for (const name of MAP_VARIABLES) {
      popup.style.setProperty(name, variables.getPropertyValue(name));
    }
    popup.addEventListener('pointerenter', clearHide);
    popup.addEventListener('pointerleave', () => scheduleClose(hotel.id));
    popup.addEventListener('focusin', clearHide);
    popup.addEventListener('focusout', (event) => {
      if (!popup?.contains(event.relatedTarget as Node | null)) {
        scheduleClose(hotel.id);
      }
    });
    document.body.append(popup);
    position();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      close();
    }
  };
  const onPointerDown = (event: PointerEvent) => {
    if (
      usesTapPreview() &&
      popup &&
      !popup.contains(event.target as Node) &&
      !anchor?.contains(event.target as Node)
    ) {
      close();
    }
  };
  const onScroll = (event: Event) => {
    if (!popup?.contains(event.target as Node)) {
      close();
    }
  };
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('pointerdown', onPointerDown, true);
  window.addEventListener('resize', close);
  window.addEventListener('scroll', onScroll, true);

  return {
    open,
    scheduleClose,
    close,
    getActiveId: () => activeHotel?.id,
    sync(hotels: MapHotel[]) {
      if (!activeHotel || !anchor) {
        return;
      }
      const next = hotels.find(({ id }) => id === activeHotel?.id);
      if (!next) {
        close();
      } else if (next !== activeHotel) {
        const marker = anchor;
        close();
        open(next, marker);
      }
    },
    dispose() {
      close();
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', onScroll, true);
    },
  };
};
