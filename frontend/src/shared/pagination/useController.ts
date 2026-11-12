export const useController = (
  total: number,
  limit: number,
  offset: number,
  onOffsetChange: (offset: number) => void
) => {
  const from = total ? offset + 1 : 0;
  const to = Math.min(offset + limit, total);

  const handlePrev = () => {
    onOffsetChange(Math.max(offset - limit, 0));
  };

  const handleNext = () => {
    onOffsetChange(offset + limit);
  };

  return { from, to, hasPrev: offset > 0, hasNext: to < total, handlePrev, handleNext };
};
