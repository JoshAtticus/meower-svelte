<!-- The individual post page, with surrounding context. -->
<script>
	import Post from "../../lib/Post.svelte";
	import Loading from "../../lib/Loading.svelte";

	import {apiUrl} from "../../lib/urls.js";
	import {authHeader} from "../../lib/stores.js";

	import {params, goto} from "@roxi/routify";

	let id = 0;

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

	async function loadContext() {
		const resp = await fetch(
			`${apiUrl}posts/${$params.postid}/context?limit=5`,
			{headers: $authHeader}
		);
		if (!resp.ok) {
			throw new Error(
				"Response code is not OK; code is " + resp.status
			);
		}
		const json = await resp.json();
		return {
			before: json.before.map(mapPost).reverse(),
			post: mapPost(json.post),
			after: json.after.map(mapPost),
		};
	}
</script>

<div>
	{#await loadContext()}
		<div class="fullcenter">
			<Loading />
		</div>
	{:then {before, post, after}}
		{@const originUrl =
			post.post_origin === "home"
				? "/home"
				: `/chats/${post.post_origin}`}

		{#if before.length}
			<button class="context-jump" on:click={$goto(originUrl)}>
				Jump to newer posts →
			</button>
			{#each before as post (post.id)}
				<Post {post} />
			{/each}
		{/if}

		<p class="highlight-label">Highlighted Post</p>
		<Post {post} />

		{#each after as post (post.id)}
			<Post {post} />
		{/each}
		{#if after.length}
			<button class="context-jump" on:click={$goto(originUrl)}>
				← Jump to older posts
			</button>
		{/if}
	{:catch}
		<div class="fullcenter">
			<p>Post not found.</p>
		</div>
	{/await}
</div>

<style>
	.fullcenter {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 50%;
	}
	.highlight-label {
		font-size: 0.8em;
		font-weight: bold;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--orange);
		margin: 0.5em 0 -0.5em 0.5em;
	}
	.context-jump {
		display: block;
		margin: 0.5em auto;
	}
</style>
