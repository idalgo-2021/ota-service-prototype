export const recordHref = (section: string, id: string) =>
  `/admin?tab=${encodeURIComponent(section)}&record=${encodeURIComponent(id)}`;
