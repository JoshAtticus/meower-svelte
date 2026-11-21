import {readable} from "svelte/store";

/**
 * Current time in unix seconds, ticking every 30s so relative timestamps
 * stay up to date. Use as `relativeDate(ts, $now)` in components.
 */
export const now = readable(Math.floor(Date.now() / 1000), set => {
	const interval = setInterval(() => set(Math.floor(Date.now() / 1000)), 30000);
	return () => clearInterval(interval);
});

const UNITS = [
	["year", 31536000],
	["month", 2592000],
	["week", 604800],
	["day", 86400],
	["hour", 3600],
	["minute", 60],
];

/**
 * Human-friendly relative time: "just now", "5 minutes ago", "in 3 hours".
 * @param {number} timestamp unix seconds
 * @param {number} [nowSeconds] current unix seconds (pass $now to stay live)
 */
export function relativeDate(timestamp, nowSeconds = Math.floor(Date.now() / 1000)) {
	const diff = nowSeconds - timestamp;
	const abs = Math.abs(diff);
	if (abs < 60) return "just now";
	for (const [unit, seconds] of UNITS) {
		if (abs >= seconds) {
			const n = Math.floor(abs / seconds);
			const label = `${n} ${unit}${n === 1 ? "" : "s"}`;
			return diff >= 0 ? `${label} ago` : `in ${label}`;
		}
	}
	return "just now";
}
