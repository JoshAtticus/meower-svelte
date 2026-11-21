/**
 * Human-friendly relative time, e.g. "just now", "5 minutes ago".
 * @param {number} timestamp unix seconds
 */
export function relativeDate(timestamp) {
	const diff = Math.floor(Date.now() / 1000) - timestamp;
	const ago = (n, unit) => `${n} ${unit}${n === 1 ? "" : "s"} ago`;
	if (diff < 60) return "just now";
	if (diff < 3600) return ago(Math.floor(diff / 60), "minute");
	if (diff < 86400) return ago(Math.floor(diff / 3600), "hour");
	if (diff < 604800) return ago(Math.floor(diff / 86400), "day");
	return new Date(timestamp * 1000).toLocaleDateString();
}
