<script>
	import {createEventDispatcher, onDestroy} from "svelte";
	import {scale, fade, fly} from "svelte/transition";
	import {mobile} from "./responsiveness.js";
	import {expoOut} from "svelte/easing";

	const dispatch = createEventDispatcher();
	const close = () => dispatch("close");

	export let showClose = false;

	let modal;

	// Swipe down to dismiss (mobile sheets)
	let dragStart = null;
	let dragY = 0;
	// true if the touch is inside something that can scroll vertically and is
	// not at its top: pulling down there scrolls it, it must not dismiss
	function insideScrolledArea(el) {
		while (el && el !== modal.parentElement) {
			if (el.scrollHeight > el.clientHeight + 1 && el.scrollTop > 0) {
				const oy = getComputedStyle(el).overflowY;
				if (oy === "auto" || oy === "scroll") return true;
			}
			el = el.parentElement;
		}
		return false;
	}
	function onTouchStart(e) {
		dragStart = null;
		if (!$mobile || insideScrolledArea(e.target)) return;
		dragStart = e.touches[0].clientY;
		dragY = 0;
	}
	function onTouchMove(e) {
		if (dragStart === null) return;
		// content scrolled meanwhile (or the finger went back up): not a dismiss
		if (insideScrolledArea(e.target)) {
			dragStart = null;
			dragY = 0;
			return;
		}
		dragY = Math.max(0, e.touches[0].clientY - dragStart);
	}
	function onTouchEnd() {
		if (dragStart === null) return;
		if (dragY > 100) close();
		dragStart = null;
		dragY = 0;
	}

	// Slide up from the bottom on mobile, pop in on desktop
	const appear = (node, opts) =>
		$mobile
			? fly(node, {y: 400, duration: 250, easing: expoOut})
			: scale(node, {start: 0.8, duration: 200, easing: expoOut});

	const handle_keydown = e => {
		if (e.key === "Escape") {
			close();
			return;
		}

		if (e.key === "Tab") {
			// trap focus
			const nodes = modal.querySelectorAll("*");
			const tabbable = Array.from(nodes).filter(n => n.tabIndex >= 0);

			let index = tabbable.indexOf(document.activeElement);
			if (index === -1 && e.shiftKey) index = 0;

			index += tabbable.length + (e.shiftKey ? -1 : 1);
			index %= tabbable.length;

			tabbable[index].focus();
			e.preventDefault();
		}
	};

	const previously_focused =
		typeof document !== "undefined" && document.activeElement;

	if (previously_focused) {
		onDestroy(() => {
			// @ts-ignore
			previously_focused.focus();
		});
	}
</script>

<svelte:window on:keydown={handle_keydown} />

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
	class="modal-background"
	on:click={close}
	transition:fade={{duration: 100, easing: expoOut}}
/>

<div
	class="modal"
	role="dialog"
	aria-modal="true"
	bind:this={modal}
	class:sheet={$mobile}
	style:transform={$mobile && dragY ? `translateY(${dragY}px)` : null}
	on:touchstart={onTouchStart}
	on:touchmove={onTouchMove}
	on:touchend={onTouchEnd}
	transition:appear
>
	{#if $mobile}
		<div class="sheet-handle" />
	{/if}
	<div class="settings-controls">
		{#if showClose}
			<button class="circle close" title="Close modal" on:click={close} />
		{/if}
	</div>

	<slot name="header" />
	<hr />
	<slot />
</div>

<style>
	.modal-background {
		z-index: 9999;
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.5);
	}

	.modal {
		z-index: 9999;
		position: fixed;
		left: 50%;
		top: 50%;
		width: calc(100vw - 4em);
		max-width: 32em;
		max-height: calc(100vh - 4em);
		overflow: auto;
		transform: translate(-50%, -50%);
		padding: 1em;
		background-color: var(--background);
		border: solid 2px var(--orange);
		border-radius: 5px;
	}

	/* Mobile: bottom sheet */
	.modal.sheet {
		top: auto;
		bottom: 0;
		left: 0;
		transform: none;
		width: 100%;
		max-width: none;
		max-height: 85vh;
		box-sizing: border-box;
		border-radius: 1em 1em 0 0;
		border-bottom: none;
		padding-bottom: calc(1em + env(safe-area-inset-bottom));
	}
	.sheet-handle {
		width: 2.5em;
		height: 0.3em;
		border-radius: 1em;
		background-color: var(--orange);
		opacity: 0.6;
		margin: -0.4em auto 0.6em;
	}
</style>
