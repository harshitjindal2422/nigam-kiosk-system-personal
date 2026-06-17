/**
 * Returns a Date object adjusted by +5:30 to save in the DB as pseudo-UTC matching the IST time values.
 * This guarantees that database columns contain IST timestamps directly.
 */
export const getISTDate = () => {
  const now = new Date();
  return new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
};
