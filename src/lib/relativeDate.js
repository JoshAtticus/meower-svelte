import {readable} from "svelte/store";
import {apiUrl} from "./urls.js";

// Seconds the local clock is behind (+) or ahead (-) of the server, so that
// timestamps stay correct even when the device clock is wrong.
let clockOffset = 0;
const nowSeconds = () => Math.floor(Date.now() / 1000) + clockOffset;
export {nowSeconds};


/**
 * Current time in unix seconds, ticking every 30s so relative timestamps
 * stay up to date. Use as `relativeDate(ts, $now)` in components.
 */
export const now = readable(nowSeconds(), set => {
	const interval = setInterval(() => set(nowSeconds()), 30000);
	fetch(apiUrl, {method: "HEAD", cache: "no-store"})
		.then(resp => {
			const date = Date.parse(resp.headers.get("date"));
			if (!isNaN(date)) {
				clockOffset = Math.round((date - Date.now()) / 1000);
				set(nowSeconds());
			}
		})
		.catch(() => {});
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
 * @param {number} [nowTs] current unix seconds (pass $now to stay live)
 */
export function relativeDate(timestamp, nowTs = nowSeconds()) {
	const diff = nowTs - timestamp;
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
