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

/** Options for twemoji.parse so it emits Noto 3D images. */
export const parseOptions = {
	className: "emoji",
	callback: icon => notoUrl(icon),
};
