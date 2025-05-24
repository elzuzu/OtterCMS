export const formatDate = (date: string | number) => {
  const d = new Date(date);
  return d.toLocaleDateString();
};
