<!-- The individual post page, with surrounding context. -->
<script>
	import Post from "../../lib/Post.svelte";
	import Loading from "../../lib/Loading.svelte";

	import {apiUrl} from "../../lib/urls.js";
	import {authHeader} from "../../lib/stores.js";

	import {params} from "@roxi/routify";
	import {tick} from "svelte";

	const PAGE = 10;

	let id = 0;

	let post = null;
	let before = []; // newer posts, closest-first (rendered reversed above)
	let after = []; // older posts, newest-first (rendered below)
	let hasNewer = false;
	let hasOlder = false;
	let loadingNewer = false;
	let loadingOlder = false;
	let error = null;
	let noContext = false; // chat doesn't share surrounding messages
	let listEl;

	function scrollParent(node) {
		for (let el = node.parentElement; el; el = el.parentElement) {
			const oy = getComputedStyle(el).overflowY;
			if (
				(oy === "auto" || oy === "scroll") &&
				el.scrollHeight > el.clientHeight
			)
				return el;
		}
		return document.scrollingElement;
	}

	function mapPost(post) {
		return {
			id: id++,
			post_id: post._id,
			post_origin: post.post_origin,
			user: post.u,
			content: post.p,
			attachments: post.attachments,
			stickers: post.stickers,
			reply_to: post.reply_to,
			date: post.t.e,
			edited_at: post.edited_at,
			pinned: post.pinned,
			isDeleted: post.isDeleted,
			mod_deleted: post.mod_deleted,
			deleted_at: post.deleted_at,
		};
	}

	async function fetchContext(postId) {
		const resp = await fetch(
			`${apiUrl}posts/${postId}/context?limit=${PAGE}`,
			{headers: $authHeader}
		);
		if (!resp.ok) {
			throw new Error(
				"Response code is not OK; code is " + resp.status
			);
		}
		return resp.json();
	}

	async function loadInitial(postId) {
		post = null;
		before = [];
		after = [];
		error = null;
		noContext = false;
		try {
			const json = await fetchContext(postId);
			post = mapPost(json.post);
			before = json.before.map(mapPost);
			after = json.after.map(mapPost);
			hasNewer = json.before.length === PAGE;
			hasOlder = json.after.length === PAGE;
		} catch (e) {
			// context may be unavailable to non-members even when the
			// post itself is shared — fall back to the lone post
			try {
				const resp = await fetch(
					`${apiUrl}posts?id=${postId}`,
					{headers: $authHeader}
				);
				if (!resp.ok) throw new Error("not found");
				const json = await resp.json();
				post = mapPost(json);
				noContext = true;
			} catch {
				error = e;
			}
		}
	}

	async function loadNewer() {
		if (!before.length || loadingNewer) return;
		loadingNewer = true;
		const anchor = listEl && listEl.querySelector(".ctx-item");
		const anchorTop = anchor ? anchor.getBoundingClientRect().top : 0;
		try {
			const json = await fetchContext(before[before.length - 1].post_id);
			before = [...before, ...json.before.map(mapPost)];
			hasNewer = json.before.length === PAGE;
			loadingNewer = false;
			await tick();
			if (anchor) {
				scrollParent(anchor).scrollTop +=
					anchor.getBoundingClientRect().top - anchorTop;
			}
		} catch (e) {
			console.error(e);
		}
		loadingNewer = false;
	}

	async function loadOlder() {
		if (!after.length || loadingOlder) return;
		loadingOlder = true;
		try {
			const json = await fetchContext(after[after.length - 1].post_id);
			after = [...after, ...json.after.map(mapPost)];
			hasOlder = json.after.length === PAGE;
		} catch (e) {
			console.error(e);
		}
		loadingOlder = false;
	}

	$: loadInitial($params.postid);

	function scrollHere(node) {
		requestAnimationFrame(() =>
			node.scrollIntoView({block: "center", behavior: "smooth"})
		);
	}
</script>

<div>
	{#if error}
		<div class="fullcenter">
			<p>Post not found.</p>
		</div>
	{:else if !post}
		<div class="fullcenter">
			<Loading />
		</div>
	{:else}
		{#if noContext}
			<p class="no-context">
				This chat doesn't share the surrounding messages.
			</p>
		{/if}
		{#if hasNewer}
			<button
				class="context-jump"
				disabled={loadingNewer}
				on:click={loadNewer}
			>
				<svg
					class="jump-icon"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="3"
					stroke-linecap="round"
					stroke-linejoin="round"
					><polyline points="18 15 12 9 6 15" /></svg
				>
				{loadingNewer ? "Loading..." : "Load newer posts"}
			</button>
		{/if}
		<div bind:this={listEl}>
			{#each [...before].reverse() as p (p.id)}
				<div class="ctx-item"><Post post={p} /></div>
			{/each}

			{#key post.post_id}
				<div class="highlighted ctx-item" use:scrollHere>
					<p class="highlight-label">Highlighted Post</p>
					<Post {post} />
				</div>
			{/key}
		</div>

		{#each after as p (p.id)}
			<Post post={p} />
		{/each}
		{#if hasOlder}
			<button
				class="context-jump"
				disabled={loadingOlder}
				on:click={loadOlder}
			>
				<svg
					class="jump-icon"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="3"
					stroke-linecap="round"
					stroke-linejoin="round"
					><polyline points="6 9 12 15 18 9" /></svg
				>
				{loadingOlder ? "Loading..." : "Load older posts"}
			</button>
		{/if}
	{/if}
</div>

<style>
	.fullcenter {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 50%;
	}
	.no-context {
		font-size: 0.85em;
		opacity: 0.7;
		text-align: center;
		margin: 0.5em 0;
	}
	.highlighted {
		scroll-margin: 1em;
	}
	.highlight-label {
		font-size: 0.8em;
		font-weight: bold;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--orange);
		margin: 0.75em 0 0.3em 0.2em;
	}
	.context-jump {
		display: flex;
		align-items: center;
		gap: 0.4em;
		margin: 0.5em auto;
	}
	.jump-icon {
		width: 1.1em;
		height: 1.1em;
	}
</style>
