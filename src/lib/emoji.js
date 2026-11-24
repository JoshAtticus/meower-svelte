import shapes from "../assets/emoji-shapes.json";

// Emoji images: Noto Emoji 3D by Google (CC BY 4.0), served from jsDelivr.
// Pinned to a commit so the images never change underneath us.
const NOTO_COMMIT = "99701e07d3d1fe1bdbcdb14964547f0fd592966f";
const BASE = `https://cdn.jsdelivr.net/gh/googlefonts/noto-emoji@${NOTO_COMMIT}/3D/png/`;

/** Image URL for an emoji given as a twemoji-style codepoint string ("1f600", "1f468-200d-1f4bb"). Sizes: 32, 72, 128, 512. */
export function notoUrl(icon, size = 128) {
	const name = icon
		.split("-")
		.filter(part => part !== "fe0f")
		.join("_");
	return `${BASE}${size}/emoji_u${name}.png`;
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
	const name = icon
		.split("-")
		.filter(part => part !== "fe0f")
		.join("_");
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

/** Options for twemoji.parse so it emits Noto 3D images with silhouette placeholders. */
export const parseOptions = {
	className: "emoji emoji-loading",
	callback: icon => notoUrl(icon),
	attributes: (raw, icon) => {
		const style = emojiPlaceholderStyle(icon);
		return style ? {style} : {};
	},
};

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
	const sweep = root => {
		if (root.nodeType !== 1) return;
		const imgs = root.matches("img.emoji-loading")
			? [root]
			: root.querySelectorAll("img.emoji-loading");
		imgs.forEach(img => img.complete && settle(img));
	};
	new MutationObserver(muts =>
		muts.forEach(m => m.addedNodes.forEach(sweep))
	).observe(document.documentElement, {childList: true, subtree: true});
}
