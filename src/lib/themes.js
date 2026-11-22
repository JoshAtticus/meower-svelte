/**
 * Built-in themes (colours from BetterMeower, the first third-party Meower
 * client). Each theme has light and dark accent colours; dark mode itself is
 * a separate setting ($user.mode === false).
 */
export const THEMES = [
	{
		id: "orange",
		name: "Orange",
		light: {main: "#f9a636", light: "#ffce8c", dark: "#b46d34", scroll: "#a15d04"},
		dark: {main: "#b35305", light: "#dd7f14", dark: "#ac4718", scroll: "rgb(131, 45, 5)"},
	},
	{
		id: "blue",
		name: "Blue",
		light: {main: "#4d97ff", light: "#79b7ff", dark: "#3685eb", scroll: "#374eb1"},
		dark: {main: "#4d97ff", light: "#79b7ff", dark: "#3685eb", scroll: "#374eb1"},
	},
	{
		id: "green",
		name: "Green",
		light: {main: "#57e389", light: "#8ff0a4", dark: "#26a269", scroll: "#26a269"},
		dark: {main: "#57e389", light: "#8ff0a4", dark: "#26a269", scroll: "#26a269"},
	},
	{
		id: "magenta",
		name: "Magenta",
		light: {main: "#a85ff5", light: "#b97cfa", dark: "#9c59e4", scroll: "#9c59e4"},
		dark: {main: "#a85ff5", light: "#b97cfa", dark: "#9c59e4", scroll: "#9c59e4"},
	},
	{
		id: "red",
		name: "Red",
		light: {main: "#ff3838", light: "#ff6f6f", dark: "#e03030", scroll: "#e03030"},
		dark: {main: "#ff3838", light: "#ff6f6f", dark: "#e03030", scroll: "#e03030"},
	},
	{
		id: "pink",
		name: "Pink",
		light: {main: "#ff8af7", light: "#fcaef7", dark: "#df79d8", scroll: "#df79d8"},
		dark: {main: "#ff8af7", light: "#fcaef7", dark: "#df79d8", scroll: "#df79d8"},
	},
	{
		id: "purple",
		name: "Purple",
		light: {main: "#731bc4", light: "#9665c4", dark: "#6016a6", scroll: "#6016a6"},
		dark: {main: "#731bc4", light: "#9665c4", dark: "#6016a6", scroll: "#6016a6"},
	},
	{
		id: "gray",
		name: "Gray",
		light: {main: "#575656", light: "#a0a0a0", dark: "#3d3c3c", scroll: "#3d3c3c"},
		dark: {main: "#575656", light: "#a0a0a0", dark: "#3d3c3c", scroll: "#3d3c3c"},
	},
];

export const validProfileColor = hex =>
	/^[0-9a-fA-F]{6}$/.test(hex || "") && hex !== "000000";

/**
 * CSS colours for a theme. "profile" uses the profile colour (falling back to
 * orange). Returns null for unknown themes (e.g. custom ones).
 */
export function themeColors(themeId, dark, profileHex) {
	let accents;
	if (themeId === "profile") {
		if (validProfileColor(profileHex)) {
			const c = `#${profileHex}`;
			accents = {
				main: c,
				light: `color-mix(in srgb, ${c} 60%, white)`,
				dark: `color-mix(in srgb, ${c} 70%, black)`,
				scroll: `color-mix(in srgb, ${c} 50%, black)`,
			};
		} else {
			accents = THEMES[0][dark ? "dark" : "light"];
		}
	} else {
		const t = THEMES.find(x => x.id === themeId);
		if (!t) return null;
		accents = t[dark ? "dark" : "light"];
	}
	return {
		...accents,
		background: dark ? "#181818" : "#ffffff",
		foreground: dark ? "#eeeeff" : "#000000",
		foregroundOrange: dark ? "#eeeeff" : "#ffffff",
	};
}
