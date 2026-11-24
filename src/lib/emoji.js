import shapes from "../assets/emoji-shapes.json";

// Emoji images: Noto Emoji 3D by Google (CC BY 4.0), self-hosted in /emoji as
// 128px WebP (generated from googlefonts/noto-emoji commit 99701e0).

/** Image URL for an emoji given as a twemoji-style codepoint string ("1f600", "1f468-200d-1f4bb"). Sizes: 32, 72, 128, 512. */
// Noto file names: lowercase hex, at least 4 digits, FE0F removed ("0023_20e3")
function iconName(icon) {
	return icon
		.split("-")
		.filter(part => part !== "fe0f")
		.map(part => part.padStart(4, "0"))
		.join("_");
}

export function notoUrl(icon, size = 128) {
	return `/emoji/${iconName(icon)}.webp`;
}

/** Same, for an emoji character. */
export function emojiCharUrl(char, size = 128) {
	return notoUrl(
		[...char].map(c => c.codePointAt(0).toString(16)).join("-"),
		size
	);
}

// Loading placeholders: every emoji has a tiny silhouette (24 radii around its
// centre, ~50 bytes) that is drawn as a smooth blob until the image arrives.
const silhouettes = new Map();

function silhouetteUrl(icon) {
	const name = iconName(icon);
	if (silhouettes.has(name)) return silhouettes.get(name);
	let url = null;
	const b64 = shapes[name];
	if (b64) {
		try {
			const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
			const cx = (bytes[0] / 255) * 100;
			const cy = (bytes[1] / 255) * 100;
			const n = bytes.length - 2;
			const pts = [];
			for (let k = 0; k < n; k++) {
				const a = (k / n) * Math.PI * 2;
				const r = (bytes[2 + k] / 255) * 50;
				pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
			}
			const f = v => Math.round(v * 10) / 10;
			let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
			for (let i = 0; i < n; i++) {
				const p0 = pts[(i - 1 + n) % n];
				const p1 = pts[i];
				const p2 = pts[(i + 1) % n];
				const p3 = pts[(i + 2) % n];
				d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
			}
			const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><path d='${d}Z' fill='%23888' fill-opacity='.4'/></svg>`;
			url =
				"data:image/svg+xml," +
				encodeURIComponent(svg.replace(/%23/g, "#"))
					.replace(/'/g, "%27")
					.replace(/\(/g, "%28")
					.replace(/\)/g, "%29");
		} catch {}
	}
	silhouettes.set(name, url);
	return url;
}

/** Inline style that paints an emoji's silhouette behind its (still loading) image. */
export function emojiPlaceholderStyle(icon) {
	const url = silhouetteUrl(icon);
	return url ? `background:url('${url}') center/contain no-repeat` : "";
}

import twemoji from "twemoji";

// The browser's own Unicode data knows about new emoji (twemoji's list is old)
const RGI = (() => {
	try {
		return new RegExp("\\p{RGI_Emoji}", "gv");
	} catch {
		return null;
	}
})();

/** Calls fn(emojiString) for every emoji in text and returns the result. */
export function replaceEmoji(text, fn) {
	return RGI ? text.replace(RGI, fn) : twemoji.replace(text, fn);
}

const toIcon = char =>
	[...char].map(c => c.codePointAt(0).toString(16)).join("-");

/** Turns the emoji in already-escaped text into Noto images with silhouette placeholders. */
export function emojiHtml(text) {
	return replaceEmoji(text, char => {
		const icon = toIcon(char);
		const style = emojiPlaceholderStyle(icon);
		return `<img class="emoji emoji-loading" draggable="false" alt="${char}" src="${notoUrl(icon)}"${style ? ` style="${style}"` : ""}>`;
	});
}

// Placeholders are removed once the image has loaded (or failed). Doing this
// from document-level listeners also covers images that were already cached
// when they were inserted, which never fire their own load event.
function settle(img) {
	img.classList.remove("emoji-loading");
	img.style.background = "none";
}
if (typeof document !== "undefined") {
	const onDone = e => {
		const el = e.target;
		if (el && el.classList && el.classList.contains("emoji-loading")) settle(el);
	};
	document.addEventListener("load", onDone, true);
	document.addEventListener("error", onDone, true);
	// check newly added images once per frame, not once per mutation
	let pending = new Set();
	let scheduled = false;
	const flush = () => {
		scheduled = false;
		const nodes = pending;
		pending = new Set();
		nodes.forEach(root => {
			if (!root.isConnected) return;
			const imgs = root.matches("img.emoji-loading")
				? [root]
				: root.querySelectorAll("img.emoji-loading");
			imgs.forEach(img => img.complete && settle(img));
		});
	};
	new MutationObserver(muts => {
		for (const m of muts)
			for (const n of m.addedNodes) if (n.nodeType === 1) pending.add(n);
		if (pending.size && !scheduled) {
			scheduled = true;
			requestAnimationFrame(flush);
		}
	}).observe(document.documentElement, {childList: true, subtree: true});
}
