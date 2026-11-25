<!-- Explore: top home posts + unified search -->
<script>
	import Container from "../lib/Container.svelte";
	import Post from "../lib/Post.svelte";
	import PostList from "../lib/PostList.svelte";
	import Loading from "../lib/Loading.svelte";
	import LargeCount from "../lib/LargeCount.svelte";
	import ChatIcon from "../lib/ChatIcon.svelte";
	import PFP from "../lib/PFP.svelte";

	import {apiUrl} from "../lib/urls.js";
	import {authHeader, user} from "../lib/stores.js";
	import loadProfile, {profileCache} from "../lib/loadProfile.js";

	import {params, goto} from "@roxi/routify";
	import {tick} from "svelte";

	const RANGES = [
		["week", "This week"],
		["month", "This month"],
		["year", "This year"],
		["all", "All time"],
	];
	const TYPES = [
		["all", "All"],
		["users", "People"],
		["posts", "Posts"],
		["chats", "Chats"],
	];

	let query = $params.q || "";
	let type = "all";
	let searchTimer;
	let statsOpen = false;
	let results = [];
	let counts = null;
	let page = 0;
	let pages = 1;
	let loading = false;
	let searchError = "";

	async function runSearch(p = 1, append = false) {
		loading = true;
		searchError = "";
		try {
			const resp = await fetch(
				`${apiUrl}search/?q=${encodeURIComponent($params.q)}&type=${type}&page=${p}`,
				{headers: $authHeader}
			);
			if (!resp.ok) throw new Error("Response code " + resp.status);
			const json = await resp.json();
			const items = (json.autoget || []).map(item => {
				if (item.type === "post" && item.post) {
					item.post = {
						post_id: item.post._id,
						post_origin: item.post.post_origin,
						user: item.post.u,
						content: item.post.p,
						attachments: item.post.attachments || [],
						stickers: item.post.stickers || [],
						forwarded_from: item.post.forwarded_from ,
						reply_to: item.post.reply_to || [],
						reply_count: item.post.reply_count || 0,
						reactions: item.post.reactions || [],
						emojis: item.post.emojis || [],
						author: item.post.author,
						date: item.post.t?.e,
						pinned: item.post.pinned,
						isDeleted: item.post.isDeleted,
						mod_deleted: item.post.mod_deleted,
					};
				}
				return item;
			});
			results = append ? [...results, ...items] : items;
			counts = json.counts;
			page = json["page#"] || p;
			pages = json.pages || 1;
		} catch (e) {
			searchError = "Search failed: " + e;
		} finally {
			loading = false;
		}
	}
	function loadMore() { runSearch(page + 1, true); }
	$: if ($params.q || type) { results = []; counts = null; runSearch(1); }

	$: range = $params.range || "week";

	function setQuery(q) {
		query = q;
		clearTimeout(searchTimer);
		searchTimer = setTimeout(() => {
			$goto("/explore", q ? {q} : {range});
		}, 300);
	}
	function setRange(r) {
		$goto("/explore", {range: r});
	}
</script>

<div class="explore">
	<Container>
		<h1>Explore</h1>
		<p class="subtitle">Top posts and search</p>
		<form
			class="explore-search"
			autocomplete="off"
			on:submit|preventDefault={() => $goto("/explore", query ? {q: query} : {range})}
		>
			<input
				type="search"
				class="white"
				placeholder="Search posts, people and chats"
				maxlength="200"
				value={query}
				on:input={e => setQuery(e.target.value)}
			/>
		</form>
	</Container>

	{#if $params.q}
		<Container>
			<div class="type-chips">
				{#each TYPES as [value, label]}
					<button
						class="chip"
						class:selected={type === value}
						on:click={() => (type = value)}>
						{label}{#if counts && (type === "all" || type === value.toLowerCase().replace("people","users"))}
							{@const n = value === "all" ? counts.users + counts.posts + counts.chats : counts[value]}
							{typeof n === "number" ? ` (${n})` : ""}
						{/if}
					</button>
				{/each}
			</div>
		</Container>
		<Container>
			{#if loading}<Loading />{/if}
			{#if searchError}<p class="explore-empty" style="color:crimson">{searchError}</p>{/if}
			{#if !loading && !searchError && results.length === 0}
				<p class="explore-empty">Nothing found for "{$params.q}".</p>
			{/if}
			<div class="results">
				{#each results as item (item.type + ":" + (item.user?._id || item.chat?._id || item.post?._id))}
					{#if item.type === "user"}
						<button class="result-row user-row" on:click={() => $goto(`/users/${item.user._id}`)}>
							<PFP raw icon={item.user.pfp_data ?? -1} avatar={item.user.avatar || ""} avatarColor={item.user.avatar_color} size={0.8} />
							<span class="result-main">
								{#if item.user.display_name}
									<b>{item.user.display_name}</b>
									<span class="result-sub">@{item.user._id}</span>
								{:else}
									<b>@{item.user._id}</b>
								{/if}
								{#if item.user.quote}<span class="result-sub quote">{item.user.quote}</span>{/if}
							</span>
						</button>
					{:else if item.type === "chat"}
						<button class="result-row chat-row" on:click={() => $goto(`/chats/${item.chat._id}`)}>
							<ChatIcon chat={item.chat} size={0.5} />
							<span class="result-main">
								<b>{item.chat.nickname || "Group chat"}</b>
								<span class="result-sub">{item.chat.members} member{item.chat.members === 1 ? "" : "s"}</span>
							</span>
						</button>
					{:else if item.type === "post"}
						<div class="post-result">
							{#if item.origin}
								<button
									class="origin"
									on:click={() =>
										$goto(item.origin.id === "home" ? "/home" : `/chats/${item.origin.id}`)}
									>in {item.origin.name}</button
								>
							{/if}
							<Post post={item.post} showJump={true} />
						</div>
					{/if}
				{/each}
			</div>
			{#if page < pages}
				<button class="load-more-btn" on:click={loadMore} disabled={loading}>Load more</button>
			{/if}
		</Container>
	{:else}
		<Container>
			<div class="type-chips">
				{#each RANGES as [value, label]}
					<button
						class="chip"
						class:selected={range === value}
						on:click={() => setRange(value)}>{label}</button
					>
				{/each}
			</div>
		</Container>
		{#key range}
			<PostList
				fetchUrl="explore/"
				queryParams={{range}}
				postOrigin="home"
				canPost={false}
				showJump={true}
			>
				<Container slot="error" let:error>
					Error loading Explore. Please try again.
					<pre><code>{error}</code></pre>
				</Container>
				<Container slot="empty">
					<p class="explore-empty">No posts in this range yet.</p>
				</Container>
			</PostList>
		{/key}
	{/if}

	<Container>
		<button class="stats-toggle" class:open={statsOpen} on:click={() => (statsOpen = !statsOpen)}>
			<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
			Meower stats
		</button>
		{#if statsOpen}
			{#await fetch(apiUrl + "statistics") then resp}
				{#await resp.json() then stats}
					<p class="stats-line">
						There {stats.posts == 1 ? "is" : "are"}
						<LargeCount num={stats.posts} /> post{stats.posts == 1 ? "" : "s"},
						<LargeCount num={stats.chats} /> chats and
						<LargeCount num={stats.users} /> users on Meower.
					</p>
				{/await}
			{/await}
		{/if}
	</Container>
</div>

<style>
	.subtitle {
		color: var(--gray, #888);
		margin-top: -0.5em;
	}
	.explore-search {
		display: flex;
		margin-top: 0.5em;
	}
	.explore-search input {
		flex: 1;
	}
	.type-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4em;
		overflow: hidden;
	}
	.chip {
		border: 1px solid var(--hairline, var(--gray, #ccc));
		border-radius: 999px;
		background: transparent;
		color: inherit;
		padding: 0.3em 0.9em;
		font-weight: 600;
		white-space: nowrap;
		cursor: pointer;
	}
	.post-result {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.2em;
		margin-bottom: 0.5em;
	}
	.post-result > :global(*:last-child) {
		width: 100%;
	}
	.origin {
		margin: 0;
		padding: 0.1em 0.7em;
		border: 1px solid var(--hairline, var(--gray, #ccc));
		border-radius: 999px;
		background: transparent;
		color: inherit;
		font-size: 0.8em;
		opacity: 0.8;
		cursor: pointer;
	}
	.chip.selected {
		background: var(--orange, #f97720);
		border-color: var(--orange, #f97720);
		color: white;
	}
	.explore-empty {
		color: var(--gray, #888);
	}
	.stats-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.4em;
		border: none;
		background: none;
		color: var(--gray, #888);
		font-weight: 600;
		cursor: pointer;
	}
	.result-row {
		display: flex;
		align-items: center;
		gap: 0.7em;
		width: 100%;
		padding: 0.6em 0.4em;
		border: none;
		border-radius: 8px;
		background: transparent;
		color: inherit;
		text-align: left;
		cursor: pointer;
	}
	.result-row:hover {
		background: var(--orange-light, rgba(249, 119, 32, 0.08));
	}
	.result-main {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.result-sub {
		color: var(--gray, #888);
		font-size: 85%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.load-more-btn {
		margin-top: 0.8em;
		border: 1px solid var(--hairline, var(--gray, #ccc));
		border-radius: 999px;
		background: transparent;
		color: inherit;
		padding: 0.4em 1.2em;
		font-weight: 600;
		cursor: pointer;
	}
	.stats-toggle.open svg {
		transform: rotate(180deg);
	}
</style>
