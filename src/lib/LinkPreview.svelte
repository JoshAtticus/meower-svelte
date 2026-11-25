<!-- Link preview card for a URL in a post (scraped by the Meower server). -->
<script>
	import LoadingImage from "./LoadingImage.svelte";
	import {authHeader, user} from "./stores.js";
	import {apiUrl} from "./urls.js";

	export let url;

	const cache = LinkPreview_cache();
	function LinkPreview_cache() {
		const w = window;
		w.__linkPreviews = w.__linkPreviews || new Map();
		return w.__linkPreviews;
	}

	let preview = null;

	$: if (url && $user.name) load(url);

	async function load(u) {
		if (!cache.has(u)) {
			cache.set(
				u,
				fetch(`${apiUrl}embed/?url=${encodeURIComponent(u)}`, {headers: $authHeader})
					.then(r => (r.ok ? r.json() : null))
					.catch(() => null)
			);
		}
		const result = await cache.get(u);
		if (u === url) preview = result && !result.error ? result : null;
	}

	function open(e) {
		e.preventDefault();
		window.confirmLink(btoa(preview.url || url));
	}
</script>

{#if preview}
	<a class="link-preview" href={preview.url || url} target="_blank" rel="noreferrer noopener" on:click={open}>
		{#if preview.image && preview.large}
			<LoadingImage src={preview.image} alt="" maxWidth="100%" maxHeight="12em" radius="0" />
		{/if}
		<span class="body">
			{#if preview.image && !preview.large}
				<img class="thumb" src={preview.image} alt="" loading="lazy" referrerpolicy="no-referrer" />
			{/if}
			<span class="text">
				<span class="site">{preview.site_name}</span>
				{#if preview.title}<b class="title">{preview.title}</b>{/if}
				{#if preview.description}<span class="desc">{preview.description}</span>{/if}
			</span>
		</span>
	</a>
{/if}

<style>
	.link-preview {
		display: flex;
		flex-direction: column;
		gap: 0.5em;
		width: min(100%, 28em);
		min-width: 0;
		margin-top: 0.5em;
		padding: 0.6em 0.8em 0.7em;
		box-sizing: border-box;
		border: 1px solid rgba(128, 128, 128, 0.4);
		border-top: 4px solid var(--orange);
		border-radius: 0;
		color: inherit;
		text-decoration: none;
		overflow: hidden;
	}
	.body {
		display: flex;
		gap: 0.7em;
		min-width: 0;
	}
	.thumb {
		width: 4.5em;
		height: 4.5em;
		flex: 0 0 auto;
		object-fit: cover;
		border-radius: 0;
	}
	.text {
		display: flex;
		flex-direction: column;
		min-width: 0;
		gap: 0.1em;
	}
	.site {
		font-size: 0.75em;
		opacity: 0.65;
	}
	.title {
		overflow-wrap: anywhere;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.desc {
		font-size: 0.85em;
		opacity: 0.8;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
		overflow-wrap: anywhere;
	}
</style>
