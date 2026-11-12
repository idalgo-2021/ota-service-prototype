import type { SegmentedControlOption } from './SegmentedControl';

export const useController = <T extends string>(
  options: readonly SegmentedControlOption<T>[],
  onValueChange: (value: T) => void
) => {
  const items = options.map((option) => {
    const handleSelect = () => {
      onValueChange(option.value);
    };
    return { ...option, handleSelect };
  });

  return { items };
};
