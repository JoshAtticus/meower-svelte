<!-- Small dismissible notice shown when a newer client build has been deployed. -->
<script>
	import {onMount} from "svelte";
	import {mobile} from "./responsiveness.js";

	let available = false;
	let dismissedFor = sessionStorage.getItem("meower_update_dismissed");

	async function check() {
		try {
			const resp = await fetch(`/version.json?t=${Date.now()}`, {cache: "no-store"});
			if (!resp.ok) return;
			const {id} = await resp.json();
			if (id && id !== __BUILD_ID__ && id !== dismissedFor) available = true;
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
		<span>A new version of Meower is available.</span>
		<button type="button" class="refresh" on:click={() => location.reload()}>Refresh</button>
		<button type="button" class="close" title="Dismiss" aria-label="Dismiss" on:click={dismiss}>&times;</button>
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
	.close {
		width: 1.8em;
		height: 1.8em;
		border-radius: 50%;
		color: inherit;
		background: transparent;
		opacity: 0.7;
		font-size: 1.1em;
		line-height: 1;
	}
	.close:hover {
		opacity: 1;
	}
</style>
