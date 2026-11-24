<!-- Fullscreen image viewer with gallery navigation (arrows, keys, swipe). -->
<script>
	import {viewer, closeViewer} from "./imageViewer.js";
	import {onMount} from "svelte";
	import {fade} from "svelte/transition";

	let loaded = false;
	let lastSrc = null;
	$: current = $viewer ? $viewer.items[$viewer.index] : null;
	$: if (current && current.src !== lastSrc) {
		lastSrc = current.src;
		loaded = false;
	}
	$: count = $viewer ? $viewer.items.length : 0;

	function go(delta) {
		if (!$viewer || count < 2) return;
		viewer.update(v => ({
			...v,
			index: (v.index + delta + v.items.length) % v.items.length,
		}));
	}

	function onKey(e) {
		if (!$viewer) return;
		if (e.key === "Escape") closeViewer();
		else if (e.key === "ArrowLeft") go(-1);
		else if (e.key === "ArrowRight") go(1);
	}

	let touchX = null;
	function touchStart(e) {
		touchX = e.touches.length === 1 ? e.touches[0].clientX : null;
	}
	function touchEnd(e) {
		if (touchX === null) return;
		const dx = e.changedTouches[0].clientX - touchX;
		touchX = null;
		if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
	}

	onMount(() => {
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	});
</script>

{#if $viewer && current}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<div
		class="viewer"
		role="dialog"
		aria-modal="true"
		aria-label="Image viewer"
		transition:fade={{duration: 150}}
		on:click={closeViewer}
		on:touchstart={touchStart}
		on:touchend={touchEnd}
	>
		<div class="top" on:click|stopPropagation>
			<a
				class="btn"
				href={current.downloadUrl || current.src}
				target="_blank"
				rel="noreferrer"
				title="Open original"
				aria-label="Open original">&#8599;</a
			>
			<button type="button" class="btn" title="Close" aria-label="Close" on:click={closeViewer}>&times;</button>
		</div>

		<div class="stage">
			{#if !loaded}<span class="spinner" />{/if}
			{#key current.src}
				<!-- svelte-ignore a11y-click-events-have-key-events -->
				<img
					src={current.src}
					alt={current.alt || ""}
					class:loaded
					draggable="false"
					on:load={() => (loaded = true)}
					on:click|stopPropagation
				/>
			{/key}
		</div>

		{#if count > 1}
			<button type="button" class="nav prev" aria-label="Previous image" on:click|stopPropagation={() => go(-1)}>&#8249;</button>
			<button type="button" class="nav next" aria-label="Next image" on:click|stopPropagation={() => go(1)}>&#8250;</button>
			<div class="counter" on:click|stopPropagation>{$viewer.index + 1} / {count}</div>
		{/if}
	</div>
{/if}

<style>
	.viewer {
		position: fixed;
		inset: 0;
		z-index: 10010;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.88);
		color: #fff;
	}
	.top {
		position: absolute;
		top: 0;
		right: 0;
		display: flex;
		gap: 0.4em;
		padding: 0.75em;
	}
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.4rem;
		height: 2.4rem;
		margin: 0;
		padding: 0;
		border: none;
		border-radius: 50%;
		color: #fff;
		background: rgba(255, 255, 255, 0.14);
		font-size: 1.5rem;
		line-height: 1;
		text-decoration: none;
		cursor: pointer;
	}
	.btn:hover {
		background: rgba(255, 255, 255, 0.26);
	}
	.stage {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: calc(100% - 5.5rem);
		margin-top: 2.5rem;
		pointer-events: none;
	}
	.stage img {
		max-width: min(96vw, 1600px);
		max-height: 100%;
		border-radius: 14px;
		object-fit: contain;
		opacity: 0;
		transition: opacity 0.2s ease;
		pointer-events: auto;
		user-select: none;
	}
	.stage img.loaded {
		opacity: 1;
	}
	.spinner {
		position: absolute;
		width: 2.4rem;
		height: 2.4rem;
		border: 3px solid rgba(255, 255, 255, 0.25);
		border-top-color: #fff;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	.nav {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		width: 3rem;
		height: 3rem;
		margin: 0;
		padding: 0 0 0.15em;
		border: none;
		border-radius: 50%;
		color: #fff;
		background: rgba(255, 255, 255, 0.14);
		font-size: 2rem;
		line-height: 1;
		cursor: pointer;
	}
	.nav:hover {
		background: rgba(255, 255, 255, 0.26);
	}
	.prev {
		left: 0.75rem;
	}
	.next {
		right: 0.75rem;
	}
	.counter {
		position: absolute;
		bottom: 1rem;
		font-size: 1.3rem;
		letter-spacing: 0.05em;
		opacity: 0.9;
	}
	@media (max-width: 600px) {
		.nav {
			display: none;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.spinner {
			animation-duration: 2s;
		}
	}
</style>
