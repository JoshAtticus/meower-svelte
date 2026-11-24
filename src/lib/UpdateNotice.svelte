<!-- Small dismissible notice shown when a newer client build has been deployed. -->
<script>
	import {onMount} from "svelte";
	import {mobile} from "./responsiveness.js";

	let available = false;
	let forced = false;
	let dismissedFor = sessionStorage.getItem("meower_update_dismissed");

	async function check() {
		try {
			const resp = await fetch(`/version.json?t=${Date.now()}`, {cache: "no-store"});
			if (!resp.ok) return;
			const {id, critical} = await resp.json();
			if (!id || id === __BUILD_ID__) return;
			// a critical update (e.g. a security fix) refreshes the page by itself, once per version
			if (critical && sessionStorage.getItem("meower_forced_reload") !== id) {
				sessionStorage.setItem("meower_forced_reload", id);
				forced = true;
				available = true;
				setTimeout(() => location.reload(), 3000);
				return;
			}
			if (id !== dismissedFor) available = true;
		} catch {}
	}

	function dismiss() {
		available = false;
		fetch(`/version.json?t=${Date.now()}`, {cache: "no-store"})
			.then(r => r.json())
			.then(({id}) => {
				dismissedFor = id;
				sessionStorage.setItem("meower_update_dismissed", id);
			})
			.catch(() => {});
	}

	onMount(() => {
		if (!import.meta.env.PROD) return;
		const interval = setInterval(check, 5 * 60 * 1000);
		const onVisible = () => document.visibilityState === "visible" && check();
		document.addEventListener("visibilitychange", onVisible);
		check();
		return () => {
			clearInterval(interval);
			document.removeEventListener("visibilitychange", onVisible);
		};
	});
</script>

{#if available}
	<div class="update-notice" class:mobile={$mobile} role="status">
		{#if forced}
			<span>Important update available. Refreshing...</span>
		{:else}
			<span>A new version of Meower is available.</span>
			<button type="button" class="refresh" on:click={() => location.reload()}>Refresh</button>
			<button type="button" class="close" title="Dismiss" aria-label="Dismiss" on:click={dismiss}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="icon"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg></button>
		{/if}
	</div>
{/if}

<style>
	.update-notice {
		position: fixed;
		left: 1em;
		bottom: 1em;
		z-index: 9000;
		display: flex;
		align-items: center;
		gap: 0.6em;
		max-width: min(24em, calc(100vw - 2em));
		padding: 0.5em 0.6em 0.5em 0.9em;
		font-size: 0.85rem;
		color: var(--foreground);
		background: var(--background);
		border: 1px solid var(--orange);
		border-radius: 999px;
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
	}
	.update-notice.mobile {
		left: 50%;
		transform: translateX(-50%);
		bottom: 5.5em;
		width: max-content;
	}
	button {
		margin: 0;
		border: none;
		cursor: pointer;
		font: inherit;
	}
	.refresh {
		padding: 0.25em 0.8em;
		border-radius: 999px;
		color: var(--foreground-orange, #fff);
		background: var(--orange);
		font-weight: 600;
	}
	.update-notice .close {
		flex: 0 0 auto;
		width: 2em;
		height: 2em;
		min-width: 0;
		padding: 0;
		border-radius: 50%;
		color: var(--foreground);
		background: rgba(128, 128, 128, 0.2);
		opacity: 0.7;
		font-size: 1.1em;
		line-height: 1;
	}
	.close {
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}
	.icon {
		width: 1em;
		height: 1em;
		stroke: currentColor;
	}
	.close:hover {
		opacity: 1;
	}
</style>
