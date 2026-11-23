<!-- Collapsed replies under a feed-context post. Recursive to depth 3. -->
<script>
	import PFP from "./PFP.svelte";
	import Attachment from "./Attachment.svelte";
	import {relativeDate, now} from "./relativeDate.js";
	import {authHeader, user, chat} from "./stores.js";
	import {apiUrl, uploadsUrl} from "./urls.js";
	import {has as hasChatPerm} from "./chatPermissions.js";
	import {replyBus} from "./replyBus.js";
	import {addFancyElements} from "./postFormat.js";
	import {goto} from "@roxi/routify";
	import twemoji from "twemoji";
	import loadProfile, {profileCache} from "./loadProfile.js";

	export let post;
	export let depth = 0;
	export let onReply = null;
	export let chatPermChat = null; // optional override for non-$chat contexts

	const MAX_DEPTH = 3;
	const LIKE_EMOJIS = ["\u2764\ufe0f", "\u2764"];

	let expanded = false;
	let replies = [];
	let page = 0;
	let pages = 1;
	let loading = false;
	let liveExtra = 0; // replies arrived live that aren't in the fetched page count
	let replyInput = "";
	let sending = false;
	let sendError = "";

	$: total = (post.reply_count || 0) + liveExtra;

	$: theChat = chatPermChat || $chat;
	$: isGroupPost =
		post.post_origin !== "home" &&
		post.post_origin !== "inbox" &&
		post.post_origin !== "livechat";
	$: canReplyHere =
		$user.name &&
		(!isGroupPost ||
			(theChat &&
				(hasChatPerm(theChat, $user.name, "reply_to_posts") ||
					hasChatPerm(theChat, $user.name, "send_messages"))));
	$: canReactHere =
		$user.name &&
		(!isGroupPost ||
			(theChat &&
				(hasChatPerm(theChat, $user.name, "react") ||
					hasChatPerm(theChat, $user.name, "add_reactions"))));

	const fmt = (content, emojis) => addFancyElements(content, null, emojis || []);

	const likeRows = r => (r.reactions || []).filter(x => LIKE_EMOJIS.includes(x.emoji));
	const likeCount = r => likeRows(r).reduce((s, x) => s + (x.count || 0), 0);
	const likedByMe = r => likeRows(r).some(x => x.user_reacted);

	async function toggleLike(reply) {
		if (!$user.name) return;
		const rows = (reply.reactions || []).map(r => ({...r}));
		let existing = rows.find(r => LIKE_EMOJIS.includes(r.emoji));
		const adding = !(existing && existing.user_reacted);
		if (existing) {
			existing.count += adding ? 1 : -1;
			existing.user_reacted = adding;
		} else {
			rows.push({emoji: "\u2764\ufe0f", count: 1, user_reacted: true});
		}
		const previous = reply.reactions;
		reply.reactions = rows.filter(r => r.count > 0);
		replies = replies;
		try {
			const resp = await fetch(
				`${apiUrl}posts/${reply.post_id}/reactions/${encodeURIComponent("\u2764\ufe0f")}` +
					(adding ? "" : "/@me"),
				{method: adding ? "POST" : "DELETE", headers: $authHeader}
			);
			if (!resp.ok) throw new Error("" + resp.status);
		} catch {
			reply.reactions = previous;
			replies = replies;
		}
	}

	async function load(p = 1, append = false) {
		if (loading) return;
		loading = true;
		try {
			const resp = await fetch(
				`${apiUrl}posts/${post.post_id}/replies?page=${p}`,
				{headers: $authHeader}
			);
			if (!resp.ok) return;
			const json = await resp.json();
			const fresh = (json.autoget || []).map(r => ({
				post_id: r._id || r.post_id,
				post_origin: r.post_origin,
				user: r.u || r.user,
				content: r.p ?? r.content,
				attachments: r.attachments || [],
				reactions: r.reactions || [],
				emojis: r.emojis || [],
				reply_to: r.reply_to || [],
				reply_count: r.reply_count || 0,
				author: r.author,
				date: r.t?.e || r.date,
				isDeleted: r.isDeleted,
			}));
			replies = append
				? [...replies, ...fresh.filter(r => !replies.some(x => x.post_id === r.post_id))]
				: fresh;
			page = json["page#"] || p;
			pages = json.pages || 1;
			fresh.forEach(r => (r.users || []).forEach(u => u && loadProfile(u)));
		} finally {
			loading = false;
		}
	}

	function toggle() {
		expanded = !expanded;
		if (expanded && !replies.length) load(1);
	}

	// Live: posts arriving whose reply_to contains this post bump the count and
	// append to the open section (deduped)
	$: if ($replyBus.post && ($replyBus.post.reply_to || []).includes(post.post_id)) {
		const p = $replyBus.post;
		liveExtra += 1;
		if (expanded && !replies.some(r => r.post_id === p.post_id))
			replies = [...replies, p];
		$replyBus.post = null;
	}

	async function sendReply() {
		const content = replyInput.trim();
		if (!content || sending) return;
		sending = true;
		sendError = "";
		const nonce = Math.random().toString();
		try {
			const resp = await fetch(
				`${apiUrl}${post.post_origin === "home" ? "home" : `posts/${post.post_origin}`}`,
				{
					method: "POST",
					headers: {"Content-Type": "application/json", ...$authHeader},
					body: JSON.stringify({content, nonce, reply_to: [post.post_id], stickers: [], attachments: []}),
				}
			);
			const json = await resp.json();
			if (!resp.ok) throw new Error(json.type || "Send failed");
			replyInput = "";
			const newReply = {
				post_id: json._id,
				post_origin: json.post_origin,
				user: json.u,
				content: json.p,
				attachments: json.attachments || [],
				reactions: json.reactions || [],
				emojis: json.emojis || [],
				reply_to: json.reply_to || [post.post_id],
				reply_count: 0,
				author: json.author,
				date: json.t?.e || Math.floor(Date.now() / 1000),
			};
			liveExtra += 1;
			if (expanded && !replies.some(r => r.post_id === newReply.post_id))
				replies = [...replies, newReply];
		} catch (e) {
			sendError = e.message || "Couldn't send reply.";
		} finally {
			sending = false;
		}
	}
</script>

{#if total > 0}
	<button
		type="button"
		class="replies-toggle"
		class:open={expanded}
		on:click={toggle}
	>
		<svg class="replies-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
		{total}
		{total === 1 ? "reply" : "replies"}
	</button>
{/if}

{#if expanded}
	<div class="replies-rail">
		{#each replies as reply (reply.post_id)}
			{@const rp = $profileCache[reply.user] || {}}
			{@const dn = reply.author?.display_name || rp.display_name || ""}
			<div class="reply-row">
				<span class="reply-pfp">
					<PFP
						raw
						icon={reply.author ? reply.author.pfp_data : rp.pfp_data ?? -1}
						avatar={reply.author ? reply.author.avatar : rp.avatar}
						avatarColor={reply.author ? reply.author.avatar_color : rp.avatar_color}
						alt="{reply.user}'s profile picture"
						size={0.7}
					/>
				</span>
				<div class="reply-body">
					<div class="reply-head">
						{#if dn}
							<span class="reply-names">
								<b class="reply-name">{dn}</b>
								<span class="reply-user">@{reply.user}</span>
							</span>
						{:else}
							<b class="reply-name">{reply.user}</b>
						{/if}
						<span class="reply-time">{relativeDate(reply.date, $now)}</span>
					</div>
					{#if reply.content}
						<p class="reply-content">{@html fmt(reply.content, reply.emojis)}</p>
					{/if}
					{#if reply.attachments?.length}
						<div class="reply-attachments">
							{#each reply.attachments as a}
								<Attachment id={a.id} filename={a.filename} mime={a.mime} />
							{/each}
						</div>
					{/if}
					<div class="reply-actions">
						<button
							type="button"
							class="lite-btn like"
							class:liked={likedByMe(reply)}
							disabled={!likedByMe(reply) && !canReactHere}
							title={likedByMe(reply) ? "Unlike" : "Like"}
							on:click={() => toggleLike(reply)}
						>
							<svg class="lite-icon" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill={likedByMe(reply) ? "currentColor" : "none"}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
							{#if likeCount(reply) > 0}<span class="lite-count">{likeCount(reply)}</span>{/if}
						</button>
						{#if onReply}
							<button
								type="button"
								class="lite-btn"
								title="Reply"
								on:click={() => onReply(reply)}
							>
								<svg class="lite-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 10l-5 5 5 5"/><path d="M4 15h11a4 4 0 0 0 0-8h-1"/></svg>
							</button>
						{/if}
						{#if depth + 1 < MAX_DEPTH && (reply.reply_count || 0) > 0}
							<svelte:self post={reply} depth={depth + 1} {onReply} chatPermChat={theChat} />
						{:else if (reply.reply_count || 0) > 0}
							<a class="lite-btn thread-link" href="/posts/{reply.post_id}" on:click|preventDefault={() => $goto(`/posts/${reply.post_id}`)}>
								{reply.reply_count} {reply.reply_count === 1 ? "reply" : "replies"}
							</a>
						{/if}
					</div>
				</div>
			</div>
		{/each}
		{#if loading}
			<p class="replies-note">Loading…</p>
		{/if}
		{#if page < pages}
			<button type="button" class="load-more" on:click={() => load(page + 1, true)}>
				Load more replies
			</button>
		{/if}
		{#if canReplyHere}
			<form class="reply-compose" on:submit|preventDefault={sendReply}>
				<input
					type="text"
					bind:value={replyInput}
					placeholder="Write a reply…"
					maxlength="360"
					disabled={sending}
				/>
				<button type="submit" disabled={sending || !replyInput.trim()}>Reply</button>
			</form>
			{#if sendError}<p class="replies-note err">{sendError}</p>{/if}
		{/if}
	</div>
{/if}

<style>
	.replies-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.3em;
		height: 32px;
		padding: 0 0.8em;
		margin: 0;
		border: none;
		border-radius: 16px;
		background: transparent;
		color: var(--gray, #888);
		font-weight: 600;
		cursor: pointer;
	}
	.replies-toggle:hover {
		background: var(--orange-light, rgba(249, 119, 32, 0.12));
		color: var(--orange, #f97720);
	}
	.replies-chevron {
		width: 14px;
		height: 14px;
		transition: transform 0.15s;
	}
	.replies-toggle.open .replies-chevron {
		transform: rotate(180deg);
	}
	.replies-rail {
		flex-basis: 100%;
		margin-top: 0.5em;
		padding-left: 0.9em;
		border-left: 2px solid var(--hairline, var(--gray, #ddd));
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.reply-row {
		display: flex;
		gap: 0.5em;
		min-width: 0;
	}
	.reply-pfp {
		flex-shrink: 0;
		width: 28px;
		height: 28px;
		display: inline-flex;
		align-items: flex-start;
	}
	.reply-pfp :global(.pfp),
	.reply-pfp :global(img),
	.reply-pfp :global(span) {
		width: 28px !important;
		height: 28px !important;
	}
	@media (max-width: 560px) {
		.reply-pfp,
		.reply-pfp :global(.pfp),
		.reply-pfp :global(img),
		.reply-pfp :global(span) {
			width: 24px !important;
			height: 24px !important;
		}
	}
	.reply-body {
		min-width: 0;
		flex: 1;
	}
	.reply-head {
		display: flex;
		align-items: baseline;
		gap: 0.45em;
		min-width: 0;
	}
	.reply-names {
		display: inline-flex;
		align-items: baseline;
		gap: 0.4em;
		min-width: 0;
	}
	.reply-name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.reply-user {
		color: var(--gray, #888);
		font-size: 80%;
		white-space: nowrap;
	}
	.reply-time {
		color: var(--gray, #888);
		font-size: 80%;
		white-space: nowrap;
	}
	.reply-content {
		margin: 0.1em 0;
		font-size: 0.95em;
		overflow-wrap: anywhere;
	}
	.reply-attachments {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3em;
	}
	.reply-actions {
		display: flex;
		align-items: center;
		gap: 0.4em;
		margin-top: 6px;
	}
	.lite-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.3em;
		height: 28px;
		min-width: 28px;
		padding: 0 0.55em;
		margin: 0;
		border: none;
		border-radius: 14px;
		background: transparent;
		color: var(--gray, #888);
		font-weight: 600;
		font-size: 90%;
		line-height: 1;
		cursor: pointer;
		text-decoration: none;
	}
	.lite-btn:hover:not(:disabled) {
		background: var(--orange-light, rgba(249, 119, 32, 0.12));
		color: var(--orange, #f97720);
	}
	.lite-btn:disabled {
		opacity: 0.45;
		cursor: default;
	}
	.lite-btn.liked {
		color: var(--orange, #f97720);
	}
	.lite-icon {
		width: 16px;
		height: 16px;
	}
	.lite-count {
		font-variant-numeric: tabular-nums;
		line-height: 1;
	}
	.replies-note {
		margin: 0;
		color: var(--gray, #888);
		font-size: 85%;
	}
	.replies-note.err {
		color: crimson;
	}
	.load-more {
		align-self: flex-start;
		border: none;
		background: none;
		padding: 0;
		margin: 0;
		color: var(--orange, #f97720);
		font-weight: 600;
		cursor: pointer;
	}
	.reply-compose {
		display: flex;
		gap: 0.4em;
	}
	.reply-compose input {
		flex: 1;
		min-width: 0;
		border: 1px solid var(--hairline, var(--gray, #ccc));
		border-radius: 16px;
		padding: 0.35em 0.8em;
		background: transparent;
		color: inherit;
	}
	.reply-compose button {
		border: none;
		border-radius: 16px;
		padding: 0.35em 1em;
		background: var(--orange, #f97720);
		color: white;
		font-weight: 600;
		cursor: pointer;
	}
	.reply-compose button:disabled {
		opacity: 0.5;
	}
</style>
