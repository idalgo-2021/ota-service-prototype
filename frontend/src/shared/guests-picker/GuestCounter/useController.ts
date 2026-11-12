export const useController = (value: number, onValueChange: (value: number) => void) => {
  const handleDecrement = () => {
    onValueChange(value - 1);
  };
  const handleIncrement = () => {
    onValueChange(value + 1);
  };

  return { handleDecrement, handleIncrement };
};
