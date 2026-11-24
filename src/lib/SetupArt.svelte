<!-- Random illustration shown beside the login/signup forms; a new one is picked on every launch. -->
<script>
	import meowy from "../assets/meowy.svg";

	const SCENES = [
		"ui",
		"beach",
		"community",
		"night",
		"chat",
		"camping",
		"party",
		"space",
	];
	const scene = SCENES[Math.floor(Math.random() * SCENES.length)];

	// positions/hues for the community scene
	const crowd = [
		{x: 20, y: 40, w: 96, r: -8, h: 0},
		{x: 150, y: 20, w: 110, r: 6, h: 40},
		{x: 290, y: 46, w: 92, r: -4, h: 200},
		{x: 56, y: 150, w: 118, r: 5, h: 120},
		{x: 196, y: 130, w: 130, r: -6, h: 0},
		{x: 320, y: 168, w: 84, r: 9, h: 280},
		{x: 24, y: 270, w: 90, r: -5, h: 320},
		{x: 134, y: 276, w: 104, r: 7, h: 80},
		{x: 262, y: 290, w: 116, r: -7, h: 160},
	];
	const stars = [
		[40, 50], [110, 30], [190, 70], [260, 36], [340, 80], [380, 40],
		[70, 120], [300, 130], [150, 110], [370, 150], [30, 180], [230, 20],
	];
</script>

<div class="art">
	<svg viewBox="0 0 420 420" xmlns="http://www.w3.org/2000/svg" class="setup-svg">
		{#if scene === "ui"}
			<circle cx="210" cy="210" r="175" fill="var(--orange)" opacity="0.12" />
			<circle cx="210" cy="210" r="125" fill="var(--orange)" opacity="0.16" />
			<rect x="44" y="64" width="230" height="72" rx="16" fill="var(--background)" stroke="var(--orange)" stroke-width="2" />
			<rect x="60" y="80" width="38" height="38" rx="12" fill="var(--orange)" opacity="0.85" />
			<rect x="110" y="84" width="90" height="10" rx="5" fill="var(--foreground)" opacity="0.85" />
			<rect x="110" y="102" width="142" height="8" rx="4" fill="var(--foreground)" opacity="0.35" />
			<rect x="146" y="168" width="236" height="84" rx="16" fill="var(--background)" stroke="var(--orange)" stroke-width="2" />
			<rect x="162" y="184" width="38" height="38" rx="12" fill="var(--orange)" />
			<rect x="212" y="188" width="106" height="10" rx="5" fill="var(--foreground)" opacity="0.85" />
			<rect x="212" y="206" width="150" height="8" rx="4" fill="var(--foreground)" opacity="0.35" />
			<rect x="212" y="224" width="54" height="18" rx="9" fill="var(--orange)" opacity="0.25" />
			<rect x="274" y="224" width="44" height="18" rx="9" fill="var(--orange)" />
			<rect x="64" y="284" width="220" height="68" rx="16" fill="var(--background)" stroke="var(--orange)" stroke-width="2" />
			<rect x="80" y="300" width="36" height="36" rx="11" fill="var(--orange)" opacity="0.7" />
			<rect x="128" y="304" width="84" height="10" rx="5" fill="var(--foreground)" opacity="0.85" />
			<rect x="128" y="322" width="132" height="8" rx="4" fill="var(--foreground)" opacity="0.35" />
			<image href={meowy} x="300" y="316" width="84" height="77" class="bob" />
		{:else if scene === "beach"}
			<clipPath id="beach-clip"><rect width="420" height="420" rx="36" /></clipPath>
			<g clip-path="url(#beach-clip)">
				<rect width="420" height="420" fill="#8fd3f4" />
				<circle cx="320" cy="90" r="46" fill="#ffd45e" />
				<circle cx="320" cy="90" r="64" fill="#ffd45e" opacity="0.25" />
				<rect y="220" width="420" height="120" fill="#3aa7d9" />
				<path d="M0 232 q30 -16 60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 v20 h-420z" fill="#6cc4ea" />
				<path d="M0 272 q30 -14 60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 v18 h-420z" fill="#55b6e2" opacity="0.8" />
				<path d="M0 330 q60 -40 150 -30 t270 24 v96 h-420z" fill="#f3d9a4" />
				<line x1="92" y1="270" x2="112" y2="352" stroke="#8a5a2b" stroke-width="5" stroke-linecap="round" />
				<path d="M40 276 q52 -78 104 0 z" fill="var(--orange)" />
				<path d="M40 276 q26 -40 52 -76 q-52 28 -52 76z M92 276 q26 -48 52 0z" fill="#fff" opacity="0.35" />
				<image href={meowy} x="170" y="270" width="132" height="120" class="bob" />
				<ellipse cx="236" cy="392" rx="70" ry="8" fill="#c9a96b" opacity="0.6" />
				<path d="M350 340 l14 -22 l14 22 z" fill="#ff7a8a" />
				<circle cx="364" cy="348" r="8" fill="#fff" opacity="0.8" />
			</g>
		{:else if scene === "community"}
			<circle cx="210" cy="210" r="190" fill="var(--orange)" opacity="0.12" />
			{#each crowd as m}
				<image
					href={meowy}
					x={m.x}
					y={m.y}
					width={m.w}
					height={m.w * 0.913}
					transform="rotate({m.r} {m.x + m.w / 2} {m.y + (m.w * 0.913) / 2})"
					style="filter: hue-rotate({m.h}deg)"
				/>
			{/each}
			<rect x="150" y="232" width="116" height="40" rx="14" fill="var(--background)" stroke="var(--orange)" stroke-width="2" />
			<text x="208" y="258" text-anchor="middle" font-size="20" fill="var(--foreground)">hi everyone!</text>
		{:else if scene === "night"}
			<clipPath id="night-clip"><rect width="420" height="420" rx="36" /></clipPath>
			<g clip-path="url(#night-clip)">
				<rect width="420" height="420" fill="#1c2340" />
				{#each stars as s, i}
					<circle cx={s[0]} cy={s[1]} r={i % 3 === 0 ? 2.6 : 1.6} fill="#fff" opacity={0.5 + (i % 4) * 0.12} />
				{/each}
				<circle cx="304" cy="96" r="48" fill="#fff6c8" />
				<circle cx="324" cy="84" r="44" fill="#1c2340" />
				<path d="M0 330 q80 -60 170 -20 t250 -10 v120 h-420z" fill="#2b3563" />
				<path d="M0 372 q100 -44 200 -10 t220 -8 v66 h-420z" fill="#363f75" />
				<image href={meowy} x="140" y="256" width="140" height="128" class="bob" />
			</g>
		{:else if scene === "chat"}
			<circle cx="210" cy="220" r="170" fill="var(--orange)" opacity="0.12" />
			<rect x="30" y="50" width="190" height="64" rx="22" fill="var(--background)" stroke="var(--orange)" stroke-width="2" />
			<text x="50" y="92" font-size="26" fill="var(--foreground)">👋 hey!</text>
			<rect x="196" y="140" width="196" height="64" rx="22" fill="var(--orange)" />
			<text x="216" y="182" font-size="26" fill="var(--foreground-orange, #fff)">✨ new post</text>
			<rect x="44" y="230" width="170" height="64" rx="22" fill="var(--background)" stroke="var(--orange)" stroke-width="2" />
			<text x="64" y="272" font-size="26" fill="var(--foreground)">😸 lol</text>
			<image href={meowy} x="248" y="290" width="124" height="113" class="bob" />
		{:else if scene === "camping"}
			<clipPath id="camp-clip"><rect width="420" height="420" rx="36" /></clipPath>
			<g clip-path="url(#camp-clip)">
				<rect width="420" height="420" fill="#27315a" />
				{#each stars as s, i}
					<circle cx={s[0]} cy={s[1]} r="1.8" fill="#fff" opacity={0.5 + (i % 3) * 0.2} />
				{/each}
				<path d="M-10 300 L90 150 L190 300z" fill="#1d2547" />
				<path d="M120 300 L250 120 L380 300z" fill="#222c52" />
				<path d="M0 320 q120 -40 240 -10 t180 -8 v120 h-420z" fill="#2f6b4a" />
				<path d="M60 372 l56 -76 l56 76z" fill="var(--orange)" />
				<path d="M116 372 l-22 0 l22 -48 l22 48z" fill="#00000040" />
				<image href={meowy} x="190" y="312" width="86" height="79" class="bob" />
				<path d="M310 376 q-16 -30 0 -52 q6 18 18 22 q10 -12 4 -30 q30 28 8 60z" fill="#ff8a2a" />
				<path d="M318 376 q-8 -16 2 -28 q8 10 10 28z" fill="#ffd45e" />
			</g>
		{:else if scene === "party"}
			<circle cx="210" cy="220" r="175" fill="var(--orange)" opacity="0.12" />
			{#each [[70, 90, "#ff6b8b"], [150, 60, "#ffd45e"], [250, 76, "#5ac8fa"], [336, 110, "#8be28b"], [196, 130, "#c58bff"]] as b}
				<line x1={b[0]} y1={b[1] + 32} x2="210" y2="226" stroke="var(--foreground)" stroke-width="1.5" opacity="0.4" />
				<ellipse cx={b[0]} cy={b[1]} rx="30" ry="36" fill={b[2]} />
				<ellipse cx={b[0] - 10} cy={b[1] - 12} rx="7" ry="10" fill="#fff" opacity="0.4" />
			{/each}
			<image href={meowy} x="140" y="262" width="140" height="128" class="bob" />
			<path d="M180 272 l30 -52 l30 52z" fill="#ff6b8b" />
			<circle cx="210" cy="220" r="7" fill="#ffd45e" />
			{#each [[40, 200], [90, 250], [330, 220], [370, 280], [60, 330], [350, 340]] as c, i}
				<rect x={c[0]} y={c[1]} width="12" height="6" rx="2" fill={["#ff6b8b", "#ffd45e", "#5ac8fa", "#8be28b"][i % 4]} transform="rotate({i * 37} {c[0]} {c[1]})" />
			{/each}
		{:else}
			<clipPath id="space-clip"><rect width="420" height="420" rx="36" /></clipPath>
			<g clip-path="url(#space-clip)">
				<rect width="420" height="420" fill="#120f2e" />
				{#each stars as s, i}
					<circle cx={s[0]} cy={s[1] + 20} r={i % 3 === 0 ? 2.4 : 1.4} fill="#fff" opacity={0.5 + (i % 4) * 0.12} />
				{/each}
				<circle cx="90" cy="110" r="48" fill="#ff8a5b" />
				<ellipse cx="90" cy="110" rx="76" ry="14" fill="none" stroke="#ffd0a8" stroke-width="5" transform="rotate(-18 90 110)" />
				<circle cx="340" cy="320" r="30" fill="#5ac8fa" />
				<circle cx="330" cy="312" r="10" fill="#fff" opacity="0.25" />
				<circle cx="210" cy="220" r="86" fill="#cfe9ff" opacity="0.14" stroke="#cfe9ff" stroke-width="3" />
				<image href={meowy} x="150" y="164" width="120" height="110" class="bob" />
			</g>
		{/if}
	</svg>
</div>

<style>
	.art {
		width: 100%;
		height: 100%;
	}
	.setup-svg {
		width: 100%;
		height: 100%;
		display: block;
	}
	.bob {
		animation: bob 3.6s ease-in-out infinite;
	}
	@keyframes bob {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-5px);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.bob {
			animation: none;
		}
	}
</style>
