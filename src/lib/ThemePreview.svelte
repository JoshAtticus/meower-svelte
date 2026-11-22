<!-- A small mock of the app, coloured like the given theme. -->
<script>
	export let theme = "orange"; // orange | blue | profile
	export let dark = false;
	export let accent = ""; // profile colour (hex without #) for the Profile theme

	// Same values as the themes in _layout.svelte
	const ACCENTS = {
		orange: {light: "#f9a636", dark: "#e48b26"},
		blue: {light: "#4d97ff", dark: "#4d97ff"},
	};

	$: validAccent =
		/^[0-9a-fA-F]{6}$/.test(accent || "") && accent !== "000000";
	$: main =
		theme === "profile" && validAccent
			? `#${accent}`
			: (ACCENTS[theme] || ACCENTS.orange)[dark ? "dark" : "light"];
	$: bg = dark ? "#181818" : "#ffffff";
	$: fg = dark ? "#eeeeff" : "#000000";

	const posts = [0, 1, 2];
</script>

<svg
	class="theme-preview"
	viewBox="0 0 320 200"
	xmlns="http://www.w3.org/2000/svg"
	role="img"
	aria-label="Theme preview"
>
	<rect width="320" height="200" rx="8" fill={bg} />
	<!-- sidebar -->
	<rect width="44" height="200" rx="8" fill={main} />
	<rect x="38" width="6" height="200" fill={main} />
	{#each [10, 40, 70, 100] as y}
		<rect x="10" {y} width="24" height="24" rx="6" fill="none" stroke="#fff" stroke-width="2" />
	{/each}
	<rect x="10" y="166" width="24" height="24" rx="6" fill="#fff" />

	<!-- header -->
	<rect x="52" y="8" width="260" height="34" rx="4" fill={bg} stroke={main} stroke-width="2" />
	<rect x="60" y="15" width="60" height="9" rx="2" fill={fg} />
	<rect x="60" y="29" width="140" height="5" rx="2" fill={fg} opacity="0.45" />

	<!-- message box -->
	<rect x="52" y="48" width="178" height="20" rx="4" fill={bg} stroke={main} stroke-width="2" />
	<rect x="60" y="56" width="60" height="5" rx="2" fill={fg} opacity="0.35" />
	<rect x="234" y="48" width="22" height="20" rx="4" fill={main} />
	<rect x="260" y="48" width="22" height="20" rx="4" fill={main} />
	<rect x="286" y="48" width="26" height="20" rx="4" fill={main} />

	<!-- posts -->
	{#each posts as i}
		<rect x="52" y={74 + i * 41} width="260" height="36" rx="4" fill={bg} stroke={main} stroke-width="2" />
		<rect x="58" y={80 + i * 41} width="24" height="24" rx="6" fill={dark ? "#2a2a2a" : "#eeeeee"} />
		<rect x="88" y={81 + i * 41} width={50 + i * 12} height="7" rx="2" fill={fg} />
		<rect x="88" y={94 + i * 41} width={150 - i * 20} height="5" rx="2" fill={fg} opacity="0.5" />
	{/each}
</svg>

<style>
	.theme-preview {
		display: block;
		width: 100%;
		max-width: 22em;
		height: auto;
		margin: 0 auto;
	}
</style>
