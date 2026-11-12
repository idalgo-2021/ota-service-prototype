export const useController = (
  quantity: number,
  max: number,
  initialQuantity: number,
  onQuantityChange: (quantity: number) => void
) => ({
  canIncrease: quantity < max,
  handleAdd: () => onQuantityChange(Math.min(Math.max(initialQuantity, 1), max)),
  handleDecrease: () => onQuantityChange(quantity - 1),
  handleIncrease: () => onQuantityChange(Math.min(quantity + 1, max)),
});
