<!-- A run of server posts by the same person, collapsed into one line -->
<script>
	import Post from "./Post.svelte";
	import {relativeDate} from "./relativeDate.js";

	import {goto} from "@roxi/routify";

	/** newest-first list of server posts */
	export let posts = [];
	export let actor = "";

	let expanded = false;
</script>

<div class="server-group">
	<button
		type="button"
		class="group-line"
		title={expanded ? "Hide changes" : "Show changes"}
		on:click={() => (expanded = !expanded)}
	>
		{#if expanded}
			Hide changes
		{:else}
			<a
				href="/users/{actor}"
				on:click|preventDefault|stopPropagation={() =>
					$goto(`/users/${actor}`)}>@{actor}</a
			>
			made {posts.length} changes to this group chat. Click to expand
		{/if}
		<i class="group-date">{relativeDate(posts[0].date)}</i>
	</button>
	{#if expanded}
		<div class="group-posts">
			{#each posts as post (post.id)}
				<Post {post} />
			{/each}
		</div>
	{/if}
</div>

<style>
	.server-group {
		margin-bottom: 0.4em;
	}
	.group-line {
		display: block;
		width: 100%;
		padding: 0.3em 0.6em;
		margin: 0;
		background: none !important;
		border: none;
		color: inherit;
		font: inherit;
		font-size: 0.85em;
		opacity: 0.75;
		text-align: center;
		cursor: pointer;
	}
	:global(main.input-hover) .group-line:hover {
		opacity: 1;
	}
	.group-date {
		font-size: 0.85em;
		margin-left: 0.5em;
		font-style: normal;
	}
	.group-posts {
		margin-top: 0.2em;
	}
</style>
