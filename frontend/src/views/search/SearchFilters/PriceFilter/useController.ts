import { useState } from 'react';

const PRICE_MIN = 100;
const PRICE_MAX = 100_000;

const formatPrice = (value: number) => `${value.toLocaleString('ru-RU')} ₽`;

export const useController = () => {
  const [price, setPrice] = useState([PRICE_MIN, PRICE_MAX]);

  const handlePriceChange = ({ value }: { value: number[] }) => {
    setPrice(value);
  };

  return { price, handlePriceChange, priceMin: PRICE_MIN, priceMax: PRICE_MAX, formatPrice };
};
