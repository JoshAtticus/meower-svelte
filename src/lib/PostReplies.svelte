<!-- Collapsed replies under a feed-context post. Recursive to depth 3. -->
<script>
	import PFP from "./PFP.svelte";
	import Attachment from "./Attachment.svelte";
	import {relativeDate, now} from "./relativeDate.js";
	import {authHeader, user, chat} from "./stores.js";
	import {apiUrl, uploadsUrl} from "./urls.js";
	import {has as hasChatPerm, outranks, rank as chatRank, ADMIN_TIER} from "./chatPermissions.js";
	import {adminPermissions, hasPermission} from "./bitField.js";
	import * as modals from "./modals.js";
	import DeletePostModal from "./modals/DeletePost.svelte";
	import ReportPostModal from "./modals/safety/ReportPost.svelte";
	import ModeratePostModal from "./modals/moderation/ModeratePost.svelte";
	import SharePostModal from "./modals/SharePost.svelte";
	import PinPostModal from "./modals/PinPost.svelte";
	import {replyBus} from "./replyBus.js";
	import {addFancyElements} from "./postFormat.js";
	import {goto} from "@roxi/routify";
	import {portal} from "./portal.js";
	import {swipeDismiss} from "./swipeDismiss.js";
	import {mobile} from "./responsiveness.js";
	import twemoji from "twemoji";
	import {tick} from "svelte";
	import loadProfile, {profileCache} from "./loadProfile.js";

	export let post;
	export let depth = 0;
	export let onReply = null;
	export let chatPermChat = null; // optional override for non-$chat contexts

	export let bare = false;
	export let total = 0;

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
	let alsoPost = false;
	let composeInput;

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
	$: canPostHere =
		$user.name &&
		(!isGroupPost ||
			(theChat && hasChatPerm(theChat, $user.name, "send_messages")));
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
			fresh.forEach(r => r.user && loadProfile(r.user));
		} finally {
			loading = false;
		}
	}

	if (bare) {
		expanded = true;
		tick().then(() => load(1));
	}

	function toggle() {
		expanded = !expanded;
		if (expanded && !replies.length) load(1);
	}

	// open the inline composer (used by the post's reply button)
	export async function openCompose() {
		if (!expanded) {
			expanded = true;
			if (!replies.length) load(1);
		}
		await tick();
		composeInput?.focus();
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

	let menuFor = null;
	let editingId = null;
	let editText = "";

	const canShareR = r =>
		r.post_origin !== "inbox" && (!isGroupPost || hasChatPerm(theChat, $user.name, "share_posts"));
	const canPinR = r =>
		isGroupPost && theChat && r.post_origin === theChat._id &&
		(hasPermission(adminPermissions.EDIT_CHATS) ||
			hasChatPerm(theChat, $user.name, r.pinned ? "unpin_messages" : "pin_messages"));
	const canEditR = r =>
		r.user === $user.name && (!isGroupPost || hasChatPerm(theChat, $user.name, "edit_messages"));
	const canDeleteR = r =>
		r.user === $user.name
			? !isGroupPost || hasChatPerm(theChat, $user.name, "delete_own_messages")
			: isGroupPost && theChat &&
				(r.user === "Server"
					? chatRank(theChat, $user.name) >= ADMIN_TIER
					: hasChatPerm(theChat, $user.name, "delete_others_messages") &&
						outranks(theChat, $user.name, r.user));

	function startEdit(r) {
		editingId = r.post_id;
		editText = r.content || "";
	}

	async function saveEdit(r) {
		const content = editText.trim();
		if (!content) return;
		try {
			const resp = await fetch(`${apiUrl}posts?id=${r.post_id}`, {
				method: "PATCH",
				headers: {"Content-Type": "application/json", ...$authHeader},
				body: JSON.stringify({content}),
			});
			if (!resp.ok) throw new Error(resp.status === 429 ? "Too many requests! Try again later." : "Edit failed");
			r.content = content;
			editingId = null;
			replies = replies;
		} catch (e) {
			sendError = e.message;
		}
	}

	function removeReply(r) {
		replies = replies.filter(x => x.post_id !== r.post_id);
		liveExtra -= 1;
	}

	let replyingTo = null;
	let openThreads = {};
	let nestedInput = "";
	let nestedAlsoPost = false;

	async function sendReply(target = post) {
		const nested = target !== post;
		const content = (nested ? nestedInput : replyInput).trim();
		const useAlso = !nested && alsoPost && !(post.reply_to || []).length;
		if (!content || sending) return;
		sending = true;
		sendError = "";
		const nonce = Math.random().toString();
		const endpoint = `${apiUrl}${post.post_origin === "home" ? "home" : `posts/${post.post_origin}`}`;
		try {
			const resp = await fetch(endpoint, {
				method: "POST",
				headers: {"Content-Type": "application/json", ...$authHeader},
				body: JSON.stringify({content, nonce, reply_to: [target.post_id], stickers: [], attachments: [], reply_only: !(useAlso && canPostHere)}),
			});
			const json = await resp.json();
			if (!resp.ok) throw new Error(json.type || "Send failed");
			if (nested) {
				nestedInput = "";
				nestedAlsoPost = false;
			} else {
				replyInput = "";
				alsoPost = false;
			}
			if (nested) {
				target.reply_count = (target.reply_count || 0) + 1;
				replyingTo = null;
				replies = replies;
				return;
			}
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

{#if total > 0 && !bare}
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
				<button type="button" class="reply-pfp" title="View profile" on:click={() => $goto(`/users/${reply.user}`)}>
					<PFP
						icon={reply.author ? reply.author.pfp_data : rp.pfp_data ?? -1}
						avatar={reply.author ? reply.author.avatar : rp.avatar}
						avatarColor={reply.author ? reply.author.avatar_color : rp.avatar_color}
						alt="{reply.user}'s profile picture"
						size={0.55}
					/>
				</button>
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
					{#if editingId === reply.post_id}
						<form class="reply-compose" on:submit|preventDefault={() => saveEdit(reply)}>
							<input type="text" bind:value={editText} maxlength="4000" />
							<button type="submit" disabled={!editText.trim()}>Save</button>
							<button type="button" on:click={() => (editingId = null)}>Cancel</button>
						</form>
					{:else if reply.content}
						<p class="reply-content">{@html fmt(reply.content, reply.emojis)}</p>
					{/if}
					{#if reply.attachments?.length}
						<div class="reply-attachments">
							{#each reply.attachments as a}
								<Attachment id={a.id} filename={a.filename} mime={a.mime} size={a.size} width={a.width} height={a.height} thumbhash={a.thumbhash} siblings={reply.attachments} />
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
						{#if canReplyHere}
							<button
								type="button"
								class="lite-btn"
								title="Reply"
								on:click={() => (replyingTo = replyingTo === reply.post_id ? null : reply.post_id)}
							>
								<svg class="lite-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 10l-5 5 5 5"/><path d="M4 15h11a4 4 0 0 0 0-8h-1"/></svg>
							</button>
						{/if}
						{#if $user.name}
							<span class="reply-menu-wrap">
								<button type="button" class="circle more" title="More" on:click={() => (menuFor = menuFor === reply.post_id ? null : reply.post_id)} />
								{#if menuFor === reply.post_id}
									{#if $mobile}<div class="sheet-overlay" use:portal on:click={() => (menuFor = null)} />{:else}<div class="menu-backdrop" on:click={() => (menuFor = null)} />{/if}
									<div
										class="settings-controls reply-menu"
										class:action-sheet={$mobile}
										class:icon-menu={!$mobile}
										class:open={$mobile}
										use:portal={$mobile}
										use:swipeDismiss={{enabled: $mobile, onDismiss: () => (menuFor = null)}}
										on:click={() => setTimeout(() => (menuFor = null))}
									>
										{#if canShareR(reply)}<button type="button" class="circle share" title="Share" on:click={() => modals.showModal(SharePostModal, {post: reply})} />{/if}
										{#if canPinR(reply)}<button type="button" class="circle pin" class:filled={reply.pinned} title={reply.pinned ? "Unpin" : "Pin"} on:click={() => modals.showModal(PinPostModal, {post: reply, onDone: p => { reply.pinned = p; replies = replies; }})} />{/if}
										{#if canEditR(reply)}<button type="button" class="circle pen" title="Edit" on:click={() => startEdit(reply)} />{/if}
										{#if canDeleteR(reply)}
											<button type="button" class="circle trash" title="Delete" on:click={() => modals.showModal(DeletePostModal, {post: reply, onDone: () => removeReply(reply)})} />
										{:else if reply.user !== $user.name}
											<button type="button" class="circle report" title="Report" on:click={() => modals.showModal(ReportPostModal, {post: reply})} />
										{/if}
										{#if hasPermission(adminPermissions.VIEW_POSTS)}<button type="button" class="circle admin" title="Moderate" on:click={() => modals.showModal(ModeratePostModal, {postid: reply.post_id})} />{/if}
									</div>
								{/if}
							</span>
						{/if}
						{#if depth + 1 < MAX_DEPTH && (reply.reply_count || 0) > 0}
							<button type="button" class="lite-btn" on:click={() => (openThreads[reply.post_id] = !openThreads[reply.post_id])}>
								<svg class="lite-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style:transform={openThreads[reply.post_id] ? "rotate(180deg)" : ""}><polyline points="6 9 12 15 18 9"/></svg>
								{reply.reply_count} {reply.reply_count === 1 ? "reply" : "replies"}
							</button>
						{:else if (reply.reply_count || 0) > 0}
							<a class="lite-btn thread-link" href="/posts/{reply.post_id}" on:click|preventDefault={() => $goto(`/posts/${reply.post_id}`)}>
								{reply.reply_count} {reply.reply_count === 1 ? "reply" : "replies"}
							</a>
						{/if}
					</div>
					{#if openThreads[reply.post_id] && depth + 1 < MAX_DEPTH}
						<svelte:self post={reply} depth={depth + 1} {onReply} chatPermChat={theChat} bare />
					{/if}
					{#if replyingTo === reply.post_id}
						<div class="nested-compose">
							<form class="reply-compose" on:submit|preventDefault={() => sendReply(reply)}>
								<input
									type="text"
									bind:value={nestedInput}
									placeholder="Reply to {reply.user}..."
									maxlength="360"
									disabled={sending}
									autofocus
								/>
								<button type="submit" disabled={sending || !nestedInput.trim()}>Reply</button>
							</form>
							{#if sendError}<p class="replies-note err">{sendError}</p>{/if}
						</div>
					{/if}
				</div>
			</div>
		{/each}
		{#if loading}
			<p class="replies-note">Loading...</p>
		{/if}
		{#if page < pages}
			<button type="button" class="load-more" on:click={() => load(page + 1, true)}>
				Load more replies
			</button>
		{/if}
		{#if canReplyHere && !bare}
			<form class="reply-compose" on:submit|preventDefault={() => sendReply()}>
				<input
					type="text"
					bind:this={composeInput}
					bind:value={replyInput}
					placeholder="Write a reply..."
					maxlength="360"
					disabled={sending}
				/>
				<button type="submit" disabled={sending || !replyInput.trim()}>Reply</button>
			</form>
			{#if canPostHere && !(post.reply_to || []).length}
				<label class="also-post">
					<input type="checkbox" bind:checked={alsoPost} disabled={sending} />
					Also send as a post
				</label>
			{/if}
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
	.replies-toggle:focus,
	.replies-toggle:active {
		background: transparent;
		color: var(--gray, #888);
		outline: none;
	}
	@media (hover: hover) {
		.replies-toggle:hover {
			background: rgba(255, 255, 255, 0.1);
			color: inherit;
		}
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
		box-sizing: border-box;
		min-width: 0;
		max-width: 100%;
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
		display: inline-flex;
		align-items: flex-start;
		align-self: flex-start;
		padding: 0;
		margin: 0;
		border: none;
		background: none;
		cursor: pointer;
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
	.lite-btn:focus,
	.lite-btn:active {
		background: transparent;
		outline: none;
	}
	@media (hover: hover) {
		.lite-btn:hover:not(:disabled) {
			background: rgba(255, 255, 255, 0.1);
			color: inherit;
		}
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
	.also-post {
		display: inline-flex;
		align-items: center;
		gap: 0.4em;
		margin-top: 0.35em;
		font-size: 85%;
		color: var(--gray, #888);
		cursor: pointer;
		user-select: none;
	}
	.also-post input {
		margin: 0;
		accent-color: var(--orange, #f97720);
	}
	.reply-menu-wrap {
		position: relative;
	}
	.reply-menu-wrap :global(button.circle),
	.reply-menu-wrap :global(button.circle:hover),
	.reply-menu-wrap :global(button.circle:active) {
		transform: none !important;
	}
	.menu-backdrop {
		position: fixed;
		inset: 0;
		z-index: 49;
	}
	.reply-menu-wrap {
		display: inline-flex;
		align-items: center;
	}
	.reply-menu-wrap > button.circle {
		width: 28px;
		height: 28px;
		min-width: 28px;
		margin: 0;
		padding: 0;
		background-size: 16px;
		background-position: center;
		background-repeat: no-repeat;
		opacity: 0.55;
		border: none;
		background-color: transparent;
	}
	.reply-menu-wrap > button.circle:hover {
		opacity: 1;
		background-color: rgba(255, 255, 255, 0.12);
	}
	.reply-menu:not(.action-sheet) {
		position: absolute;
		left: 0;
		top: calc(100% + 4px);
		z-index: 50;
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 150px;
		padding: 4px;
		background: var(--background);
		border: 2px solid var(--orange);
		border-radius: 0.8em;
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
	}
	.reply-menu:not(.action-sheet) button.circle {
		width: 100%;
		height: auto;
		min-height: 2.4em;
		margin: 0;
		border: none;
		border-radius: 6px;
		background-position: 0.7em center;
		background-size: 1.1em;
		padding-left: 2.6em;
		text-align: left;
		color: inherit;
		background-color: transparent;
		font-size: 0.95em;
	}
	.reply-menu:not(.action-sheet) button.circle::after {
		content: attr(title);
	}
	.reply-menu:not(.action-sheet) button.circle:hover,
	.reply-menu:not(.action-sheet) button.circle:focus-visible {
		background-color: rgba(255, 255, 255, 0.12);
		outline: none;
	}
	.nested-compose {
		display: flex;
		flex-direction: column;
		gap: 0.2em;
		margin-top: 6px;
	}
</style>
