export function getRelativeTime(date: Date, now: Date): string {
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 0) {
    return "just now";
  }

  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 60) {
    return "just now";
  }

  if (diffSeconds < 3600) {
    const minutes = Math.floor(diffSeconds / 60);
    return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  }

  if (diffSeconds < 86400) {
    const hours = Math.floor(diffSeconds / 3600);
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  }

  const days = Math.floor(diffSeconds / 86400);
  return days === 1 ? "yesterday" : `${days} days ago`;
}
