<!-- "Try new layout" tour: carousel introducing the opt-in layout -->
<script>
	import Modal from "../../Modal.svelte";

	import {modernLayout, setModernLayout} from "../../modernLayout.js";
	import * as modals from "../../modals.js";

	const close = () => modals.closeLastModal();

	let index = 0;
	const slides = [
		{
			title: "A fresh look for Meower",
			text: "Keeps everything you know, while giving posts, pages and navigation a more streamlined feel.",
		},
		{
			title: "Labelled navigation",
			text: "On desktop, the icon strip becomes a rail with labelled buttons and your profile card at the bottom.",
		},
		{
			title: "Cleaner posts",
			text: "Posts sit on soft cards, and post actions hide in a floating pill that appears when you hover.",
		},
		{
			title: "A better composer",
			text: "The message box becomes one rounded card with your picture, attach and emoji buttons inside.",
		},
		{
			title: "Chats at a glance",
			text: "On wide screens, your chat list docks on the right so you can hop between conversations faster.",
		},
		{
			title: "Made for your phone",
			text: "On mobile you get a bottom tab bar and a floating top bar — all thumb-friendly.",
		},
		{
			title: "Ready to try it?",
			text: "You can switch back any time from Settings → Appearance. Nothing about your account changes.",
		},
	];

	function next() {
		if (index < slides.length - 1) index++;
	}
	function prev() {
		if (index > 0) index--;
	}
	function onKey(e) {
		if (e.key === "ArrowRight") next();
		if (e.key === "ArrowLeft") prev();
	}

	let touchX = null;
	function onTouchStart(e) {
		touchX = e.touches[0].clientX;
	}
	function onTouchEnd(e) {
		if (touchX === null) return;
		const dx = e.changedTouches[0].clientX - touchX;
		if (dx < -50) next();
		if (dx > 50) prev();
		touchX = null;
	}
</script>

<svelte:window on:keydown={onKey} />

<Modal on:close={close}>
	<span slot="header"><h2>Try the new layout</h2></span>

	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		class="tour"
		on:touchstart={onTouchStart}
		on:touchend={onTouchEnd}
	>
		<div class="slide">
			<svg
				class="mock"
				viewBox="0 0 300 170"
				xmlns="http://www.w3.org/2000/svg"
				role="img"
				aria-hidden="true"
			>
				{#if index === 0}
					<!-- overview: rail + feed -->
					<rect width="300" height="170" rx="10" fill="var(--surface)" stroke="var(--hairline)" />
					<rect width="52" height="170" rx="10" fill="var(--surface-2)" />
					<rect x="46" width="6" height="170" fill="var(--surface-2)" />
					<rect x="10" y="10" width="22" height="10" rx="3" fill="var(--orange)" />
					{#each [30, 46, 62, 78, 94] as y}
						<rect x="8" {y} width="36" height="10" rx="5" fill="var(--foreground)" opacity="0.25" />
					{/each}
					<rect x="8" y="30" width="36" height="10" rx="5" fill="var(--orange)" />
					<rect x="8" y="140" width="36" height="18" rx="9" fill="var(--surface-2)" stroke="var(--hairline)" />
					<circle cx="15" cy="149" r="6" fill="var(--orange)" />
					{#each [0, 1, 2] as i}
						<rect x="64" y={14 + i * 48} width="160" height="40" rx="9" fill="var(--background)" stroke="var(--hairline)" />
						<rect x="72" y={21 + i * 48} width="20" height="20" rx="6" fill="var(--orange)" opacity="0.7" />
						<rect x="98" y={24 + i * 48} width="70" height="6" rx="3" fill="var(--foreground)" />
						<rect x="98" y={36 + i * 48} width="110" height="5" rx="2" fill="var(--foreground)" opacity="0.4" />
					{/each}
				{:else if index === 1}
					<!-- nav rail zoom -->
					<rect width="300" height="170" rx="10" fill="var(--surface)" stroke="var(--hairline)" />
					<rect width="150" height="170" rx="10" fill="var(--surface-2)" />
					<rect x="144" width="6" height="170" fill="var(--surface-2)" />
					<circle cx="20" cy="20" r="9" fill="var(--orange)" />
					<rect x="36" y="15" width="60" height="10" rx="4" fill="var(--foreground)" />
					{#each [45, 70, 95, 120] as y, i}
						<rect x="12" {y} width="126" height="18" rx="9" fill={i === 0 ? "var(--orange)" : "var(--background)"} stroke="var(--hairline)" />
						<circle cx="24" cy={y + 9} r="5" fill={i === 0 ? "var(--foreground-orange)" : "var(--foreground)"} opacity={i === 0 ? 1 : 0.5} />
						<rect x="36" y={y + 6} width="55" height="6" rx="3" fill={i === 0 ? "var(--foreground-orange)" : "var(--foreground)"} opacity={i === 0 ? 1 : 0.5} />
					{/each}
					<rect x="180" y="30" width="100" height="110" rx="9" fill="var(--background)" stroke="var(--hairline)" opacity="0.5" />
				{:else if index === 2}
					<!-- post card + hover pill -->
					<rect width="300" height="170" rx="10" fill="var(--surface)" stroke="var(--hairline)" />
					<rect x="40" y="30" width="220" height="80" rx="12" fill="var(--background)" stroke="var(--hairline)" />
					<rect x="170" y="24" width="96" height="22" rx="11" fill="var(--surface-2)" stroke="var(--hairline)" />
					{#each [0, 1, 2, 3] as i}
						<circle cx={186 + i * 20} cy="35" r="6" fill="var(--foreground)" opacity="0.45" />
					{/each}
					<rect x="52" y="44" width="28" height="28" rx="9" fill="var(--orange)" opacity="0.7" />
					<rect x="88" y="48" width="90" height="7" rx="3" fill="var(--foreground)" />
					<rect x="88" y="62" width="150" height="5" rx="2" fill="var(--foreground)" opacity="0.4" />
					<rect x="88" y="72" width="120" height="5" rx="2" fill="var(--foreground)" opacity="0.4" />
					<rect x="52" y="84" width="44" height="14" rx="7" fill="var(--surface-2)" stroke="var(--hairline)" />
					<rect x="102" y="84" width="36" height="14" rx="7" fill="var(--orange)" />
					<rect x="40" y="125" width="220" height="30" rx="12" fill="var(--background)" stroke="var(--hairline)" opacity="0.5" />
				{:else if index === 3}
					<!-- composer card -->
					<rect width="300" height="170" rx="10" fill="var(--surface)" stroke="var(--hairline)" />
					<rect x="40" y="55" width="220" height="60" rx="14" fill="var(--background)" stroke="var(--hairline)" />
					<circle cx="62" cy="85" r="14" fill="var(--orange)" />
					<rect x="84" y="72" width="110" height="7" rx="3" fill="var(--foreground)" opacity="0.35" />
					<rect x="84" y="85" width="70" height="6" rx="3" fill="var(--foreground)" opacity="0.2" />
					<circle cx="212" cy="85" r="10" fill="var(--surface-2)" stroke="var(--hairline)" />
					<circle cx="238" cy="85" r="10" fill="var(--surface-2)" stroke="var(--hairline)" />
					<rect x="205" y="105" width="50" height="20" rx="10" fill="var(--orange)" />
					<rect x="222" y="111" width="18" height="7" rx="3" fill="var(--foreground-orange)" />
				{:else if index === 4}
					<!-- right chats panel -->
					<rect width="300" height="170" rx="10" fill="var(--surface)" stroke="var(--hairline)" />
					<rect width="40" height="170" rx="10" fill="var(--surface-2)" />
					<rect x="34" width="6" height="170" fill="var(--surface-2)" />
					{#each [0, 1, 2] as i}
						<rect x="52" y={16 + i * 44} width="150" height="36" rx="9" fill="var(--background)" stroke="var(--hairline)" opacity="0.7" />
					{/each}
					<rect x="216" y="12" width="72" height="146" rx="10" fill="var(--surface-2)" stroke="var(--hairline)" />
					<rect x="224" y="20" width="40" height="8" rx="4" fill="var(--foreground)" />
					{#each [0, 1, 2, 3, 4] as i}
						<rect x="222" y={36 + i * 24} width="60" height="18" rx="9" fill="var(--background)" />
						<circle cx="232" cy={45 + i * 24} r="6" fill="var(--orange)" opacity="0.7" />
						<rect x="242" y={42 + i * 24} width="32" height="6" rx="3" fill="var(--foreground)" opacity="0.5" />
					{/each}
					<rect x="222" y="36" width="60" height="18" rx="9" fill="var(--orange)" />
					<circle cx="232" cy="45" r="6" fill="var(--foreground-orange)" />
					<rect x="242" y="42" width="32" height="6" rx="3" fill="var(--foreground-orange)" />
				{:else if index === 5}
					<!-- phone mock -->
					<rect width="300" height="170" rx="10" fill="var(--surface)" stroke="var(--hairline)" />
					<rect x="105" y="8" width="90" height="154" rx="12" fill="var(--background)" stroke="var(--hairline)" stroke-width="2" />
					<rect x="109" y="12" width="82" height="16" rx="6" fill="var(--surface-2)" />
					<rect x="116" y="17" width="40" height="6" rx="3" fill="var(--foreground)" />
					{#each [0, 1, 2] as i}
						<rect x="111" y={34 + i * 32} width="78" height="26" rx="8" fill="var(--surface)" stroke="var(--hairline)" />
						<circle cx="121" cy={47 + i * 32} r="7" fill="var(--orange)" opacity="0.7" />
						<rect x="133" y={42 + i * 32} width="40" height="5" rx="2" fill="var(--foreground)" />
						<rect x="133" y={51 + i * 32} width="48" height="4" rx="2" fill="var(--foreground)" opacity="0.4" />
					{/each}
					<rect x="109" y="132" width="82" height="26" rx="8" fill="var(--surface-2)" />
					{#each [0, 1, 2, 3, 4] as i}
						<circle cx={122 + i * 15} cy="145" r="5" fill={i === 0 ? "var(--orange)" : "var(--foreground)"} opacity={i === 0 ? 1 : 0.4} />
					{/each}
				{:else}
					<!-- final: logo check -->
					<rect width="300" height="170" rx="10" fill="var(--surface)" stroke="var(--hairline)" />
					<circle cx="150" cy="75" r="40" fill="var(--orange)" opacity="0.15" />
					<circle cx="150" cy="75" r="30" fill="var(--orange)" opacity="0.25" />
					<circle cx="150" cy="75" r="22" fill="var(--orange)" />
					<path d="M140 75 l7 7 l14 -14" stroke="var(--foreground-orange)" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round" />
					<rect x="105" y="130" width="90" height="8" rx="4" fill="var(--foreground)" opacity="0.3" />
				{/if}
			</svg>
			<h3>{slides[index].title}</h3>
			<p>{slides[index].text}</p>
		</div>

		<div class="dots" role="tablist" aria-label="Tour slides">
			{#each slides as _, i}
				<button
					class="dot"
					class:active={i === index}
					on:click={() => (index = i)}
					aria-label="Slide {i + 1}"
				/>
			{/each}
		</div>

		<div class="tour-footer">
			<button class="nav-btn" on:click={prev} disabled={index === 0}>
				Previous
			</button>
			<button
				class="nav-btn"
				on:click={next}
				disabled={index === slides.length - 1}
			>
				Next
			</button>
			<button
				class="primary"
				on:click={() => setModernLayout(!$modernLayout)}
			>
				{$modernLayout ? "Disable new layout" : "Enable new layout"}
			</button>
			<button class="nav-btn" on:click={close}>Close</button>
		</div>
	</div>
</Modal>

<style>
	h2 {
		margin: 0;
	}
	h3 {
		margin: 0.4em 0 0.2em;
	}
	p {
		margin: 0;
		font-size: 0.9em;
		opacity: 0.85;
	}
	.tour {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.6em;
		user-select: none;
	}
	.slide {
		width: 100%;
		text-align: center;
	}
	.mock {
		display: block;
		width: 100%;
		max-width: 24em;
		height: auto;
		margin: 0 auto;
	}
	.dots {
		display: flex;
		gap: 0.4em;
	}
	.dot {
		width: 0.55em;
		height: 0.55em;
		padding: 0;
		border: none;
		border-radius: 50%;
		background: var(--foreground);
		opacity: 0.3;
		cursor: pointer;
	}
	.dot.active {
		background: var(--orange);
		opacity: 1;
	}
	.tour-footer {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.4em;
		width: 100%;
	}
	.nav-btn {
		padding: 0.4em 0.9em;
		border: solid 1px var(--hairline);
		border-radius: 999px;
		background: none;
		color: var(--foreground);
		font-family: inherit;
		cursor: pointer;
	}
	.nav-btn:disabled {
		opacity: 0.4;
		cursor: default;
	}
	.primary {
		padding: 0.4em 1.1em;
		border: none;
		border-radius: 999px;
		background: var(--orange);
		color: var(--foreground-orange);
		font-family: inherit;
		font-weight: bold;
		cursor: pointer;
	}
</style>
