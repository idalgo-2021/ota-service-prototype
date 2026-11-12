import { formatCount, formatMoney, formatStartingPrice } from '@/lib/format';
import { toggleHotelComparison } from '@/lib/hotelCompare';
import { store } from '@/lib/store';
import { formatRating } from '@/lib/reviews';
import type { MapHotel } from '../types';
import styles from './MapCanvas.module.css';

const appendText = (
  parent: HTMLElement,
  tag: keyof HTMLElementTagNameMap,
  className: string,
  text: string
) => {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  parent.append(element);
  return element;
};

export const createHotelPopup = (hotel: MapHotel, onClose: () => void) => {
  const popup = document.createElement('section');
  popup.className = styles.hotelPopup;
  popup.dataset.hotelPreview = hotel.id;
  popup.setAttribute('role', 'dialog');
  popup.setAttribute('aria-label', hotel.name);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = styles.hotelPopupClose;
  close.setAttribute('aria-label', 'Закрыть карточку отеля');
  close.textContent = '×';
  close.addEventListener('click', onClose);
  popup.append(close);

  if (hotel.image) {
    const image = document.createElement('img');
    image.className = styles.hotelPopupImage;
    image.src = hotel.image;
    image.alt = '';
    image.loading = 'lazy';
    popup.append(image);
  } else {
    const placeholder = document.createElement('span');
    placeholder.className = styles.hotelPopupImagePlaceholder;
    placeholder.setAttribute('aria-hidden', 'true');
    popup.append(placeholder);
  }

  const content = document.createElement('div');
  content.className = styles.hotelPopupContent;
  const heading = document.createElement('div');
  heading.className = styles.hotelPopupHeading;
  appendText(heading, 'strong', styles.hotelPopupTitle, hotel.name);
  if (hotel.rating !== undefined) {
    appendText(heading, 'span', styles.hotelPopupRating, formatRating(hotel.rating));
  }
  content.append(heading);
  const meta = [
    hotel.typeName,
    hotel.reviewCount === undefined
      ? undefined
      : formatCount(hotel.reviewCount, ['отзыв', 'отзыва', 'отзывов']),
  ]
    .filter(Boolean)
    .join(' · ');
  if (meta) {
    appendText(content, 'span', styles.hotelPopupMeta, meta);
  }

  const footer = document.createElement('div');
  footer.className = styles.hotelPopupFooter;
  if (hotel.price !== undefined) {
    const currency = hotel.currency ?? 'RUB';
    const fullPrice = hotel.startingPriceUnitType
      ? formatStartingPrice(hotel.price, currency, hotel.startingPriceUnitType)
      : `от ${formatMoney(hotel.price, currency)} за ночь`;
    const shortPrice = `от ${formatMoney(hotel.price, currency)}`;
    const priceBlock = document.createElement('div');
    priceBlock.className = styles.hotelPopupPriceBlock;
    const price = appendText(priceBlock, 'strong', styles.hotelPopupPrice, shortPrice);
    price.setAttribute('aria-label', fullPrice);
    appendText(
      priceBlock,
      'span',
      styles.hotelPopupPriceUnit,
      fullPrice.slice(shortPrice.length).trim()
    );
    footer.append(priceBlock);
  }
  const compare = document.createElement('button');
  compare.type = 'button';
  compare.className = styles.hotelPopupCompare;
  compare.setAttribute(
    'aria-pressed',
    String(store.getState().hotelCompare.ids.includes(hotel.id))
  );
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('fill', 'none');
  icon.setAttribute('aria-hidden', 'true');
  const iconPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  iconPath.setAttribute('d', 'M4 10h5v10H4zM15 4h5v16h-5zM2 20h20');
  iconPath.setAttribute('stroke', 'currentColor');
  iconPath.setAttribute('stroke-width', '2');
  iconPath.setAttribute('stroke-linecap', 'round');
  iconPath.setAttribute('stroke-linejoin', 'round');
  icon.append(iconPath);
  const updateCompareButton = () => {
    const selected = store.getState().hotelCompare.ids.includes(hotel.id);
    compare.setAttribute('aria-pressed', String(selected));
    compare.setAttribute(
      'aria-label',
      `${selected ? 'Убрать из сравнения' : 'Добавить к сравнению'}: ${hotel.name}`
    );
    compare.title = compare.getAttribute('aria-label') ?? '';
    compare.dataset.selected = String(selected);
  };
  compare.append(icon);
  updateCompareButton();
  const unsubscribe = store.subscribe(updateCompareButton);
  popup.addEventListener('dispose', unsubscribe, { once: true });
  compare.addEventListener('click', (event) => {
    event.stopPropagation();
    store.dispatch(toggleHotelComparison(hotel.id));
    updateCompareButton();
  });
  footer.append(compare);
  if (hotel.href) {
    const link = document.createElement('a');
    link.className = styles.hotelPopupLink;
    link.href = hotel.href;
    link.textContent = hotel.price === undefined ? 'Подробнее' : 'Смотреть →';
    footer.append(link);
  }
  content.append(footer);
  popup.append(content);

  if (hotel.address || hotel.description) {
    const details = document.createElement('div');
    details.className = styles.hotelPopupDetails;
    if (hotel.address) {
      appendText(details, 'span', styles.hotelPopupAddress, hotel.address);
    }
    if (hotel.description) {
      appendText(details, 'p', styles.hotelPopupDescription, hotel.description);
    }
    popup.append(details);
  }

  return popup;
};
