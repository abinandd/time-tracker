export const iso = (d) => (d ? new Date(d).toISOString() : null);
export const fromIso = (s) => (s ? new Date(s) : null);

export const minutesBetween = (a, b) => Math.max(0, Math.floor((b - a) / (1000 * 60)));

export const formatShort = (d) =>
  d ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';

export const formatFull = (d) =>
  d ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : '';

export const formatDuration = (minutes) => {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
};

export const todayDateString = () => new Date().toDateString();

export const formatDateNice = () => {
  return new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'short', 
    day: 'numeric' 
  });
};
