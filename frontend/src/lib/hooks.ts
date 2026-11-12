import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from './store';

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

/**
 * Держит флаг `active` включённым не меньше `ms` миллисекунд с момента, когда он включился.
 * Нужен, чтобы индикатор загрузки не мелькал на быстрых ответах.
 */
export const useMinimumDuration = (active: boolean, ms: number) => {
  const [prevActive, setPrevActive] = useState(active);
  const [holding, setHolding] = useState(active);
  // Счётчик запусков: каждое новое включение перезапускает отсчёт.
  const [run, setRun] = useState(0);

  if (active !== prevActive) {
    setPrevActive(active);
    if (active) {
      setHolding(true);
      setRun(run + 1);
    }
  }

  useEffect(() => {
    if (!holding) {
      return;
    }
    const timer = setTimeout(() => setHolding(false), ms);
    return () => clearTimeout(timer);
  }, [holding, run, ms]);

  return active || holding;
};
