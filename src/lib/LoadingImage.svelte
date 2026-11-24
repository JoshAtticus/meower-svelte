<!--
	An image with a loading placeholder and sane size limits. When the original
	dimensions are known the space is reserved up front (no layout jumping), and
	extremely tall or wide images are cropped to a reasonable shape in the feed
	(the full image is available in the viewer).
-->
<script>
	export let src;
	export let alt = "";
	export let width = 0;
	export let height = 0;
	export let maxWidth = "28em";
	export let maxHeight = "15em";
	export let clickable = false;

	let loaded = false;
	let failed = false;
	let lastSrc;
	$: if (src !== lastSrc) {
		lastSrc = src;
		loaded = false;
		failed = false;
	}

	$: known = width > 0 && height > 0;
	$: natural = known ? width / height : 0;
	$: ratio = known ? Math.min(Math.max(natural, 0.6), 2.4) : 0;
	$: cropped = known && Math.abs(ratio - natural) > 0.01;
</script>

<span
	class="li"
	class:known
	class:loaded
	class:failed
	class:clickable
	style:--r={ratio || null}
	style:--mw={maxWidth}
	style:--mh={maxHeight}
	style:aspect-ratio={known ? ratio : null}
>
	<img
		{src}
		{alt}
		class:crop={cropped}
		loading="lazy"
		decoding="async"
		draggable="false"
		on:load={() => (loaded = true)}
		on:error={() => (failed = true)}
	/>
	{#if failed}
		<span class="err">Couldn't load image</span>
	{/if}
</span>

<style>
	.li {
		position: relative;
		display: inline-block;
		max-width: min(100%, var(--mw));
		border-radius: 8px;
		overflow: hidden;
		vertical-align: top;
		background: linear-gradient(
			100deg,
			rgba(128, 128, 128, 0.12) 30%,
			rgba(128, 128, 128, 0.26) 50%,
			rgba(128, 128, 128, 0.12) 70%
		);
		background-size: 200% 100%;
		animation: li-shimmer 1.3s linear infinite;
		min-width: 6em;
		min-height: 6em;
	}
	.li.loaded {
		animation: none;
		background: none;
		min-width: 0;
		min-height: 0;
	}
	.li.known {
		width: min(var(--mw), calc(var(--mh) * var(--r)));
	}
	.li.clickable {
		cursor: zoom-in;
	}
	img {
		display: block;
		max-width: 100%;
		max-height: var(--mh);
		opacity: 0;
		transition: opacity 0.25s ease;
	}
	.li.loaded img {
		opacity: 1;
	}
	.li.known img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		max-height: none;
		object-fit: contain;
	}
	.li.known img.crop {
		object-fit: cover;
	}
	.err {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.5em;
		text-align: center;
		font-size: 0.8em;
		opacity: 0.7;
	}
	.li.failed {
		animation: none;
	}
	@keyframes li-shimmer {
		from {
			background-position: 200% 0;
		}
		to {
			background-position: -200% 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.li {
			animation: none;
		}
		img {
			transition: none;
		}
	}
</style>
