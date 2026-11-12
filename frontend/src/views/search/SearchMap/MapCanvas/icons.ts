import { getPointKind } from '../constants';
import type { MapNearbyPlace, MapPoint } from '../types';
import styles from './MapCanvas.module.css';

/** Метка отеля: цена или название, а под ними — оценка «★ 4,6», если она известна. */
export const createHotelMarker = (
  label: string,
  selected: boolean,
  rating?: string,
  nearbyStyle = false,
  compact = false
) => {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = [
    compact ? styles.hotelPin : styles.price,
    nearbyStyle && styles.nearbyHotelMarker,
    selected && styles.selectedPrice,
    rating && styles.rated,
  ]
    .filter(Boolean)
    .join(' ');
  if (compact) {
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('fill', 'none');
    icon.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M4 20h16M6 20V7h12v13M9 11h2m2 0h2M9 15h2m2 0h2M8 7V4h8v3');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '1.8');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    icon.append(path);
    element.append(icon);
    return element;
  }
  const text = document.createElement('span');
  text.className = styles.priceLabel;
  text.textContent = label;
  element.append(text);
  if (rating) {
    const line = document.createElement('span');
    line.className = styles.rating;
    const star = document.createElement('span');
    star.className = styles.ratingStar;
    star.textContent = '★';
    line.append(star, ` ${rating}`);
    element.append(line);
  }
  return element;
};

const createTransportSvg = (kind: 'station' | 'airport') => {
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('fill', 'none');
  icon.setAttribute('stroke', 'currentColor');
  icon.setAttribute('stroke-width', '1.8');
  icon.setAttribute('stroke-linecap', 'round');
  icon.setAttribute('stroke-linejoin', 'round');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute(
    'd',
    kind === 'airport'
      ? 'M3 12h18M12 4v16M7 7l5 5 5-5M7 17l5-5 5 5'
      : 'M5 20h14M6 20V7h12v13M4 7h16M8 4h8v3M9 11h2m2 0h2M9 15h2m2 0h2'
  );
  icon.append(path);
  return icon;
};

const createPin = (glyph: string, kind: 'office' | 'music' | 'station' | 'airport' | 'search') => {
  const element = document.createElement('span');
  element.className = styles.point;
  const pin = document.createElement('span');
  pin.className = styles.pin;
  pin.dataset.kind = kind;
  if (kind === 'station' || kind === 'airport') {
    pin.append(createTransportSvg(kind));
  } else {
    const symbol = document.createElement('span');
    symbol.textContent = glyph;
    pin.append(symbol);
  }
  element.append(pin);
  return element;
};

export const createPointMarker = (point: MapPoint) => {
  const { glyph } = getPointKind(point);
  const element = document.createElement('button');
  element.type = 'button';
  element.className = styles.pointGroup;
  element.setAttribute('aria-label', point.name);
  element.append(createPin(glyph, point.kind ?? 'office'));
  const label = document.createElement('span');
  label.className = styles.pointLabel;
  label.textContent = point.name;
  element.append(label);
  return element;
};

export const createSearchMarker = (name: string) => {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = styles.pointGroup;
  element.setAttribute('aria-label', name);
  element.append(createPin('⌕', 'search'));
  return element;
};

export const createEventMarker = (name: string) => {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = styles.eventMarker;
  element.setAttribute('aria-label', `Событие: ${name}`);
  element.title = name;

  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('fill', 'none');
  icon.setAttribute('aria-hidden', 'true');
  const outline = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  outline.setAttribute('d', 'M5 5.5h14v14H5zM8 3v5M16 3v5M5 10h14');
  outline.setAttribute('stroke', 'currentColor');
  outline.setAttribute('stroke-width', '1.8');
  outline.setAttribute('stroke-linecap', 'round');
  outline.setAttribute('stroke-linejoin', 'round');
  icon.append(outline);
  element.append(icon);
  return element;
};

export const createHeritageMarker = (name: string) => {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = styles.heritageMarker;
  element.setAttribute('aria-label', `Историческая справка: ${name}`);
  element.title = name;
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('fill', 'none');
  icon.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M4 20h16M5 20V9l7-5 7 5v11M8 20v-7h3v7m4 0v-7h1v7M3 9h18');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.7');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  icon.append(path);
  element.append(icon);
  return element;
};

const nearbyIconPaths: Record<MapNearbyPlace['kind'], string> = {
  building: 'M4 20h16M5 20V9l7-5 7 5v11M8 20v-7h3v7m4 0v-7h1v7M3 9h18',
  pier: 'M3 18h18M5 15h14M7 15V9h10v6M9 9V6h6v3M4 18l2-3m14 3-2-3',
  event: 'M5 5.5h14v14H5zM8 3v5M16 3v5M5 10h14',
};

export const createNearbyPlaceMarker = (place: MapNearbyPlace) => {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = styles.nearbyPlaceMarker;
  element.dataset.kind = place.kind;
  element.setAttribute('aria-label', place.name);
  element.title = place.name;

  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('fill', 'none');
  icon.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', nearbyIconPaths[place.kind]);
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.8');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  icon.append(path);
  element.append(icon);
  return element;
};

/** Компактный цветной маркер категории из исходного демо. */
export const createPoiMarker = (name: string, symbol: string, color: string) => {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = styles.poi;
  element.style.backgroundColor = color;
  element.textContent = symbol;
  element.title = name;
  element.setAttribute('aria-label', name);
  return element;
};

export const createNightPlaceMarker = (category: 'pharmacy' | 'store' | 'cafe') => {
  const labels = { pharmacy: 'Аптека 24/7', store: 'Магазин 24/7', cafe: 'Еда 24/7' };
  const symbols = { pharmacy: '+', store: '▰', cafe: '•' };
  const colors = { pharmacy: '#2f8f83', store: '#b06a32', cafe: '#6c5aa8' };
  const element = document.createElement('button');
  element.type = 'button';
  element.className = styles.nightPlaceMarker;
  element.style.backgroundColor = colors[category];
  element.textContent = symbols[category];
  element.title = labels[category];
  element.setAttribute('aria-label', labels[category]);
  return element;
};
