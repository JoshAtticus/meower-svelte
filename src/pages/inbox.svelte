<!--
	Home but it's the inbox.
-->
<script>
	import Container from "../lib/Container.svelte";
	import PostList from "../lib/PostList.svelte";

	import {user} from "../lib/stores.js";
	import * as clm from "../lib/clmanager.js";

	const CATEGORIES = [
		{value: null, label: "All"},
		{value: "friends", label: "Friends"},
		{value: "chats", label: "Group chats"},
		{value: "security", label: "Security"},
		{value: "moderation", label: "Moderation"},
		{value: "announcement", label: "Announcements"},
		{value: "account", label: "Account"},
	];
	let category = null;
	$: queryParams = category ? {category} : {};
</script>

<div class="messages">
	<Container>
		<h1>Inbox</h1>
	</Container>
	<div class="inbox-categories">
		{#each CATEGORIES as cat}
			<button
				class="inbox-category-chip"
				class:active={category === cat.value}
				on:click={() => (category = cat.value)}>{cat.label}</button
			>
		{/each}
	</div>
	{#key category}
	<PostList
		on:loaded={() => {
			// Mark inbox as read
			if ($user.unread_inbox) clm.updateProfile({unread_inbox: false});
		}}
		fetchUrl={"inbox"}
		{queryParams}
		postOrigin={"inbox"}
		canPost={false}
	>
		<Container slot="error" let:error>
			Error loading messages. Please try again.
			<pre><code>{error}</code></pre>
		</Container>
		<Container slot="empty">No messages here. Check back later!</Container>
	</PostList>
	{/key}
</div>

<style>
	.messages {
		height: 100%;
	}
	.inbox-categories {
		display: flex;
		gap: 0.4em;
		margin: -0.2em 0 0.6em;
		overflow-x: auto;
		scrollbar-width: thin;
	}
	.inbox-category-chip {
		flex-shrink: 0;
		padding: 0.3em 0.9em;
		border: solid 1px var(--hairline, #7775);
		border-radius: 999px;
		background: none;
		color: inherit;
		font: inherit;
		font-size: 0.85em;
		cursor: pointer;
	}
	.inbox-category-chip.active {
		background-color: var(--orange);
		border-color: var(--orange);
		color: var(--foreground-orange, #fff);
	}
</style>
