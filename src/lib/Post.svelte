<!-- A post. Profile pictures not appearing while not logged in is intentional. -->
<script>
	import Container from "../lib/Container.svelte";
	import PFP from "../lib/PFP.svelte";
	import catIconFriends from "../assets/friends.svg";
	import catIconChats from "../assets/chat.svg";
	import catIconSecurity from "../assets/lock.svg";
	import catIconModeration from "../assets/gavel.svg";
	import catIconAnnouncement from "../assets/info.svg";
	import catIconAccount from "../assets/profile.svg";
	import FormattedDate from "./FormattedDate.svelte";
	import {relativeDate, now} from "./relativeDate.js";
	import Badge from "./Badge.svelte";
	import LiText from "./LiText.svelte";
	import Attachment from "./Attachment.svelte";
	import ExternalImage from "./ExternalImage.svelte";
	import LoadingImage from "./LoadingImage.svelte";

	import ConfirmHyperlinkModal from "./modals/ConfirmHyperlink.svelte";
	import DeletePostModal from "./modals/DeletePost.svelte";
	import ReportPostModal from "./modals/safety/ReportPost.svelte";
	import ModeratePostModal from "./modals/moderation/ModeratePost.svelte";
	import SharePostModal from "./modals/SharePost.svelte";
	import PinPostModal from "./modals/PinPost.svelte";
	import EmojiPopup from "./EmojiPopup.svelte";
	import PostReplies from "./PostReplies.svelte";
	import {portal} from "./portal.js";
	import {swipeDismiss} from "./swipeDismiss.js";

	import {authHeader, user, chat, chats, ulist} from "../lib/stores.js";
	import {adminPermissions, hasPermission} from "../lib/bitField.js";
	import {apiUrl, uploadsUrl} from "./urls.js";
	import {has as hasChatPerm, outranks, rank as chatRank, ADMIN_TIER, nameColorStyle} from "./chatPermissions.js";
	import {chatEmotes, loadEmotes} from "../lib/emotes.js";
	import {shiftHeld} from "../lib/keyDetect.js";
	import {mobile} from "../lib/responsiveness.js";
	import * as modals from "./modals.js";

	import {IMAGE_HOST_WHITELIST} from "./hostWhitelist.js";
	import {addFancyElements} from "./postFormat.js";

	import {default as loadProfile, profileCache} from "../lib/loadProfile.js";

	// @ts-ignore
	import {richInput} from "./richInput.js";
	import MarkdownIt from "markdown-it";
	import hljs from "highlight.js/lib/common";
	import "highlight.js/styles/github-dark.css";
	import twemoji from "twemoji";
	import {parseOptions} from "./emoji.js";
	import {goto} from "@roxi/routify";
	import {onMount, tick} from "svelte";

	/**
	 * @type {import('src/lib/types.js').ListPost}
	 */
	export let post;
	export let buttons = true;
	export let input = null;
	export let adminView = false;
	export let error = "";
	export let retryPost;
	export let removePost;
	export let onReply;
	export let showJump = false;

	let bridged = false;
	let webhook = false;
	let postReplies;
	let repliesTotal = 0;

	let images = [];

	let editing = false;
	let editContentInput, editSaveButton, editEmojiButton;
	let editPopupAnchor = null;
	function openEditEmojiPopup() {
		const rect = editEmojiButton.getBoundingClientRect();
		const right = Math.max(8, window.innerWidth - rect.right);
		editPopupAnchor =
			window.innerHeight - rect.bottom > 380
				? {top: rect.bottom + 4, right}
				: {bottom: window.innerHeight - rect.top + 4, right};
	}

	let deleteButton;
	let pinButton;

	const INBOX_CATEGORY_META = {
		friends: {label: "Friends", icon: catIconFriends},
		chats: {label: "Group chats", icon: catIconChats},
		security: {label: "Security", icon: catIconSecurity},
		moderation: {label: "Moderation", icon: catIconModeration},
		announcement: {label: "Announcement", icon: catIconAnnouncement},
		account: {label: "Account", icon: catIconAccount},
	};
	$: inboxCategoryMeta =
		post.user === "Notification" && post.category
			? INBOX_CATEGORY_META[post.category]
			: null;
	// the cached profile can be missing or failed (e.g. a dropped request);
	// fall back to the author details that arrived with the post
	$: postProfile = (() => {
		const cached = $profileCache[post.user];
		const author = bridged || webhook ? null : post.author;
		if (cached && !cached.temporary && !cached.error)
			return author ? {...author, ...cached} : cached;
		return author || cached || {};
	})();

	$: postEmotes = $chatEmotes[post.post_origin] || {
		emojis: [],
		stickers: [],
	};
	$: if (post.post_origin) loadEmotes(post.post_origin);

	// 1-5 emojis (unicode or custom <:id> ones) and nothing else
	function isJumbo(content) {
		if (!content || content.length > 200) return false;
		let count = 0;
		const rest = content.replace(/<:[a-zA-Z0-9]{24}>/g, () => {
			count++;
			return "";
		});
		const segmenter = new Intl.Segmenter(undefined, {
			granularity: "grapheme",
		});
		for (const {segment} of segmenter.segment(rest)) {
			if (/^\s+$/.test(segment)) continue;
			if (!/\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(segment))
				return false;
			count++;
		}
		return count >= 1 && count <= 5;
	}
	$: jumbo = isJumbo(post.content);

	let adminDeleteButton, adminRestoreButton;

	$: isGroupPost =
		post.post_origin === $chat._id &&
		$chat.type === 0 &&
		post.post_origin !== "livechat";

	$: canPin =
		post.post_origin &&
		!["home", "inbox", "livechat"].includes(post.post_origin) &&
		post.post_origin === $chat._id &&
		(hasPermission(adminPermissions.EDIT_CHATS) ||
			(isGroupPost &&
				hasChatPerm(
					$chat,
					$user.name,
					post.pinned ? "unpin_messages" : "pin_messages"
				)));

	$: canShare =
		!isGroupPost || hasChatPerm($chat, $user.name, "share_posts");

	$: canDelete =
		post.user === $user.name
			? !isGroupPost ||
				hasChatPerm($chat, $user.name, "delete_own_messages")
			: isGroupPost &&
				(post.user === "Server"
					? chatRank($chat, $user.name) >= ADMIN_TIER
					: hasChatPerm($chat, $user.name, "delete_others_messages") &&
						outranks($chat, $user.name, post.user));

	function togglePin() {
		modals.showModal(PinPostModal, {
			post,
			onDone: pinned => (post.pinned = pinned),
		});
	}

	// TODO: make bridged tag a setting

	/**
	 * Initialize this post's special behavior (user profile, images)).
	 */
	export async function initPostUser() {
		if (!post.user) return;

		if (post.content.includes(":")) {
			bridged =
				post.user === "Discord" ||
				post.user === "revolt" ||
				post.user === "Revower";
			webhook = post.user == "Webhooks";
		}

		if ((bridged || webhook) && post.content) {
			if (webhook) {
				post.content = post.content.slice(
					post.content.indexOf(": ") + 2
				);
			}
			post.user = post.content.split(": ")[0];
			post.content = post.content.slice(post.content.indexOf(": ") + 2);
		}

		if (!webhook) loadProfile(post.user);
	}

	$: {
		// Match image syntax
		// ([title: https://url])
		const iterator = post.content.matchAll(
			/\[([^\]]+?): (https:\/\/[^\]]+?)\]/gs
		);
		images = [];
		while (true) {
			const result = iterator.next();
			if (result.done) break;

			try {
				new URL(result.value[2]);
			} catch (e) {
				continue;
			}

			if (
				IMAGE_HOST_WHITELIST.some(o =>
					result.value[2].toLowerCase().startsWith(o.toLowerCase())
				)
			) {
				images.push({
					title: result.value[1],
					url: result.value[2],
				});

				if (images.length >= 3) break;
			}
		}
	}



	async function adminDelete() {
		adminDeleteButton.disabled = true;
		try {
			const resp = await fetch(`${apiUrl}admin/posts/${post.post_id}`, {
				method: "DELETE",
				headers: $authHeader,
			});
			if (!resp.ok) {
				throw new Error(
					"Response code is not OK; code is " + resp.status
				);
			}
			post.isDeleted = true;
			post.mod_deleted = true;
			post.deleted_at = Math.floor(Date.now() / 1000);
		} catch (e) {
			error = e;
		}
		adminDeleteButton.disabled = false;
	}

	async function adminRestore() {
		adminRestoreButton.disabled = true;
		try {
			const resp = await fetch(
				`${apiUrl}admin/posts/${post.post_id}/restore`,
				{
					method: "POST",
					headers: $authHeader,
				}
			);
			if (!resp.ok) {
				throw new Error(
					"Response code is not OK; code is " + resp.status
				);
			}
			post.isDeleted = false;
			post.mod_deleted = null;
			post.deleted_at = null;
		} catch (e) {
			error = e;
		}
		adminRestoreButton.disabled = false;
	}

	// --- Reactions ---------------------------------------------------------
	let reactButton;
	let actionsOpen = false;
	let reactPopupAnchor = null;
	let reactorTitles = {};

	// custom emoji reactions are stored by emoji id
	const isCustomReaction = emoji => /^[A-Za-z0-9]{24}$/.test(emoji);

	$: canReact =
		$user.name &&
		post.post_id &&
		!post.pending &&
		!post.isDeleted &&
		!adminView &&
		post.user !== "Server" &&
		(!isGroupPost || hasChatPerm($chat, $user.name, "add_reactions"));

	// load profiles for the reaction avatar stacks
	$: (post?.reactions || []).forEach(r =>
		(r.users || []).forEach(u => u && loadProfile(u))
	);

	const LIKE_EMOJIS = ["❤️", "❤"];
	$: feedContext =
		post.post_origin === "home" ||
		(isGroupPost &&
			(($chat && $chat._id === post.post_origin
				? $chat.mode
				: ($chats || []).find(c => c._id === post.post_origin)?.mode) ||
				"chat") === "feed");
	$: likeReactions = (post.reactions || []).filter(r =>
		LIKE_EMOJIS.includes(r.emoji));
	$: likeCount = likeReactions.reduce((sum, r) => sum + (r.count || 0), 0);
	$: likedByMe = likeReactions.some(r => r.user_reacted);
	$: otherReactions = (post.reactions || []).filter(
		r => !LIKE_EMOJIS.includes(r.emoji));
	$: canLike =
		$user.name &&
		post.post_id &&
		!post.pending &&
		!post.isDeleted &&
		!adminView &&
		post.user !== "Server" &&
		(likedByMe ||
			(!isGroupPost ||
				hasChatPerm(
					$chat, $user.name,
					likeReactions.length ? "react" : "add_reactions")));

	// whether the current user may reply to this post
	$: canReply =
		$user.name &&
		post.post_id &&
		!post.pending &&
		!post.isDeleted &&
		!adminView &&
		(!isGroupPost ||
			hasChatPerm($chat, $user.name, "reply_to_posts") ||
			hasChatPerm($chat, $user.name, "send_messages"));

	// joining a reaction someone else already added
	$: canJoinReaction =
		$user.name &&
		post.post_id &&
		!post.pending &&
		!post.isDeleted &&
		!adminView &&
		post.user !== "Server" &&
		(!isGroupPost || hasChatPerm($chat, $user.name, "react"));

	function openReactPopup() {
		const rect = reactButton.getBoundingClientRect();
		const right = Math.max(8, window.innerWidth - rect.right);
		// open upwards when there isn't room below
		reactPopupAnchor =
			window.innerHeight - rect.bottom > 380
				? {top: rect.bottom + 4, right}
				: {bottom: window.innerHeight - rect.top + 4, right};
	}

	async function toggleReaction(emoji) {
		const reactions = (post.reactions || []).map(r => ({...r}));
		let existing = reactions.find(r => r.emoji === emoji);
		const adding = !(existing && existing.user_reacted);
		// optimistic update; the live event reconciles other clients
		if (existing) {
			existing.count += adding ? 1 : -1;
			existing.user_reacted = adding;
			existing.users = adding
				? [$user.name, ...(existing.users || [])
					.filter(u => u !== $user.name)].slice(0, 3)
				: (existing.users || []).filter(u => u !== $user.name);
		} else {
			reactions.push({emoji, count: 1, user_reacted: true, users: [$user.name]});
		}
		const previous = post.reactions;
		post.reactions = reactions.filter(r => r.count > 0);
		delete reactorTitles[emoji];
		try {
			const resp = await fetch(
				`${apiUrl}posts/${post.post_id}/reactions/${encodeURIComponent(emoji)}` +
					(adding ? "" : "/@me"),
				{method: adding ? "POST" : "DELETE", headers: $authHeader}
			);
			if (!resp.ok) {
				const json = await resp.json().catch(() => ({}));
				throw new Error(
					resp.status === 429
						? "Too many requests! Try again later."
						: json.type === "tooManyReactions"
						? "This post has too many reactions."
						: "Response code is not OK; code is " + resp.status
				);
			}
		} catch (e) {
			post.reactions = previous;
			error = e;
		}
	}

	async function loadReactors(emoji) {
		if (reactorTitles[emoji]) return;
		reactorTitles[emoji] = "...";
		try {
			const resp = await fetch(
				`${apiUrl}posts/${post.post_id}/reactions/${encodeURIComponent(emoji)}`,
				{headers: $authHeader}
			);
			const json = await resp.json();
			const names = (json.autoget || []).map(u => u._id);
			reactorTitles[emoji] = names.length ? names.join(", ") : "";
		} catch {
			delete reactorTitles[emoji];
		}
	}

	onMount(async () => {
		initPostUser();
	});

	$: noPFP =
		post.user === "Notification" ||
		post.user.startsWith("Notification to ") ||
		post.user === "Announcement" ||
		post.user === "Server" ||
		webhook;
</script>

{#if post.user === "Server" && !adminView}
	<div class="server-wrap">
		<Container>
			<p class="server-post">
				{#await addFancyElements(post.content, postEmotes, post.emojis || []) then content}
					{@html content.replace(/<\/?p>/g, "")}
				{/await}
				<i class="server-date">{relativeDate(post.date, $now)}</i>
			</p>
		</Container>
	</div>
{:else}
<Container>
	<div class="post-header">
		{#if buttons}
			{#if $mobile && !post.pending}
				<button
					class="circle more mobile-more"
					title="More"
					on:click={() => (actionsOpen = true)}
				/>
				{#if actionsOpen}
					<div
						class="sheet-overlay"
						use:portal
						on:click={() => (actionsOpen = false)}
					/>
				{/if}
			{/if}
			<div
				class="settings-controls"
				class:action-sheet={$mobile && !post.pending}
				use:portal={$mobile && !post.pending}
				use:swipeDismiss={{
					enabled: $mobile && actionsOpen,
					onDismiss: () => (actionsOpen = false),
				}}
				class:open={actionsOpen}
				on:click={() => {
					// any action closes the sheet
					if ($mobile) setTimeout(() => (actionsOpen = false));
				}}
			>
				{#if post.pending}
					{#if error}
						<button
							class="circle restore"
							title="Retry"
							on:click={retryPost}
						/>
						<button
							class="circle trash"
							title="Delete"
							on:click={removePost}
						/>
					{/if}
				{:else if adminView && hasPermission(adminPermissions.DELETE_POSTS)}
					{#if post.isDeleted}
						<button
							class="circle restore"
							title="Restore post"
							bind:this={adminRestoreButton}
							on:click={adminRestore}
						/>
					{:else}
						<button
							class="circle trash"
							title="Delete post"
							bind:this={adminDeleteButton}
							on:click={adminDelete}
						/>
					{/if}
				{:else if !adminView}
					{#if showJump && post.post_id && !post.pending}
						<button
							class="circle join"
							title="Jump to post"
							on:click={() => $goto(`/posts/${post.post_id}`)}
						/>
					{/if}
					{#if !editing && canReact && !feedContext}
						<button
							class="circle react"
							title="React"
							bind:this={reactButton}
							on:click={openReactPopup}
						/>
					{/if}
					{#if !editing && canShare && post.post_origin !== "inbox"}
						<button
							class="circle share"
							title="Share post"
							on:click={() =>
								modals.showModal(SharePostModal, {post})}
						/>
					{/if}
					{#if !editing && canPin}
						<button
							class="circle pin"
							class:filled={post.pinned}
							title={post.pinned ? "Unpin post" : "Pin post"}
							bind:this={pinButton}
							on:click={togglePin}
						/>
					{/if}
					{#if !editing && hasPermission(adminPermissions.VIEW_POSTS)}
						<button
							class="circle admin"
							title="Moderate post"
							on:click={() =>
								modals.showModal(ModeratePostModal, {
									postid: post.post_id,
								})}
						/>
					{/if}
					{#if input && !input.disabled && !noPFP && !editing}
						{#if post.user === $user.name && !($chat.dm_request && $chat.dm_request.from === $user.name) && (!isGroupPost || hasChatPerm($chat, $user.name, "edit_messages"))}
							{#if !bridged}
								<button
									class="circle pen"
									title="Edit post"
									on:click={async () => {
										error = "";
										editing = true;
										await tick();
										editContentInput.value = post.content;
										editContentInput.focus();
										editContentInput.caretToEnd();
									}}
								/>
							{:else}
								<button
									class="circle pen"
									disabled
									title="You cannot edit bridged messages."
								/>
							{/if}
						{/if}
						{#if canDelete}
							{#if !bridged}
								<button
									class="circle trash"
									title="Delete post"
									bind:this={deleteButton}
									on:click={async () => {
										if (shiftHeld) {
											deleteButton.disabled = true;
											try {
												const resp = await fetch(
													`${apiUrl}posts?id=${post.post_id}`,
													{
														method: "DELETE",
														headers: $authHeader,
													}
												);
												if (!resp.ok) {
													if (resp.status === 429) {
														throw new Error(
															"Too many requests! Try again later."
														);
													}
													throw new Error(
														"Response code is not OK; code is " +
															resp.status
													);
												}
											} catch (e) {
												error = e;
											}
											deleteButton.disabled = false;
										} else {
											modals.showModal(DeletePostModal, {
												post,
											});
										}
									}}
								/>
							{:else}
								<button
									class="circle trash"
									disabled
									title="You cannot delete bridged messages."
								/>
							{/if}
						{:else}
							<button
								class="circle report"
								title="Report post"
								on:click={() =>
									modals.showModal(ReportPostModal, {post})}
							/>
						{/if}
					{/if}
				{/if}
			</div>
		{/if}
		<button
			class="pfp"
			on:click={async () => {
				if (noPFP) return;
				$goto(`/users/${post.user}`);
			}}
		>
			{#if inboxCategoryMeta}
				<span
					class="inbox-avatar"
					role="img"
					aria-label={inboxCategoryMeta.label}
					style:--icon={`url(${inboxCategoryMeta.icon})`}
				/>
			{:else}
			<PFP
				icon={noPFP
					? post.user === "Server"
						? -4
						: post.post_origin === "inbox" &&
						  (post.user === "Announcement" ||
								post.user === "Notification" ||
								post.user.startsWith("Notification to"))
						? 101
						: -2
					: postProfile.error
					? -2
					: postProfile.pfp_data ?? -1}
				avatar={postProfile.avatar}
				avatarColor={postProfile.avatar_color}
				alt="{post.user}'s profile picture"
				online={$ulist.includes(post.user)}
			/>
			{/if}
		</button>
		<div
			class="creatordate"
			class:has-display-name={!inboxCategoryMeta && postProfile.display_name}
		>
			<div class="creator">
				<h2>
					{#if inboxCategoryMeta}
						<span>{inboxCategoryMeta.label}</span>
					{:else if postProfile.display_name}
						<span
							style={isGroupPost
								? nameColorStyle($chat, post.user)
								: ""}><LiText text={postProfile.display_name} /></span
						>
					{:else}
						<span
							style={isGroupPost
								? nameColorStyle($chat, post.user)
								: ""}><LiText text={post.user} /></span
						>
					{/if}
				</h2>

				{#if bridged}
					<Badge
						text="BRIDGED"
						title="This post is bridged from an external service by a bot"
					/>
				{/if}

				{#if webhook}
					<Badge
						text="WEBHOOK"
						title="This post was posted by the @Webhooks bot. The username may not mean the user actually posted it!"
					/>
				{/if}

				{#if postProfile.bot && !webhook}
					<Badge
						text="BOT"
						title={postProfile.bot_owner
							? `Bot owned by @${postProfile.bot_owner}`
							: "Bot account"}
					/>
				{/if}

				<!-- disabled until proper bot badges are added
				{#if post.isvbot && !webhook}
					<Badge
						text="BOT"
						title="This bot has been verified"
						checkmark={true}
					/>
				{/if}

				{#if post.isuvbot && !webhook}
					<Badge text="BOT" title="This bot has not been verified" />
				{/if}
				-->
			</div>

			{#if !inboxCategoryMeta && postProfile.display_name}
				<span class="author-username">@{post.user}</span>
			{/if}
			<FormattedDate date={post.date} />
			{#if post.pinned}
				<span class="post-tag">pinned</span>
			{/if}
			{#if post.edited_at}
				<span class="post-tag"
					><FormattedDate
						date={post.edited_at}
						customText="edited"
					/></span
				>
			{/if}
			{#if post.isDeleted && post.mod_deleted}
				<span class="post-tag deleted"
					><FormattedDate
						date={post.deleted_at}
						customText="deleted by moderator"
					/></span
				>
			{:else if post.isDeleted}
				<span class="post-tag deleted"
					><FormattedDate
						date={post.deleted_at}
						customText="self-deleted"
					/></span
				>
			{/if}
		</div>
	</div>
	{#if editing}
		<div class="edit-row">
			<div
				class="edit-input"
				role="textbox"
				aria-multiline="true"
				tabindex="0"
				use:richInput={{uploadsUrl}}
				bind:this={editContentInput}
				on:keydown={event => {
					if (event.key == "Enter" && !shiftHeld && !$mobile) {
						event.preventDefault();
						if (!editSaveButton.disabled) editSaveButton.click();
					} else if (event.key == "Escape") {
						editing = false;
					}
				}}
			/>
			<button
				type="button"
				class="circle react"
				title="Emoji"
				bind:this={editEmojiButton}
				on:click={openEditEmojiPopup}
			/>
		</div>
		{#if editPopupAnchor}
			<div class="react-overlay" on:click={() => (editPopupAnchor = null)} />
			<EmojiPopup
				chatId={post.post_origin}
				anchor={editPopupAnchor}
				onUnicode={ch => editContentInput.insert(ch)}
				onEmoji={(name, emote) =>
					emote && editContentInput.insert(`<:${emote._id}>`)}
				onSticker={null}
				onClose={() => (editPopupAnchor = null)}
			/>
		{/if}
		<div style="display: flex; justify-content: space-between;">
			<button on:click={() => (editing = false)}>Cancel</button>
			<button
				bind:this={editSaveButton}
				on:click={async () => {
					if (editContentInput.value.trim() === "") {
						modals.showModal(DeletePostModal, {post});
						return;
					}

					editing = false;
					try {
						const resp = await fetch(
							`${apiUrl}posts?id=${post.post_id}`,
							{
								method: "PATCH",
								headers: {
									"Content-Type": "application/json",
									...$authHeader,
								},
								body: JSON.stringify({
									content: editContentInput.value,
								}),
							}
						);
						if (!resp.ok) {
							if (resp.status === 429) {
								throw new Error(
									"Too many requests! Try again later."
								);
							}
							throw new Error(
								"Response code is not OK; code is " +
									resp.status
							);
						}
					} catch (e) {
						error = e;
					}
				}}>Save</button
			>
		</div>
	{:else}
		{#each post.reply_to || [] as reply}
			{#if reply && reply._id}
				<button
					class="reply-box"
					title="Go to replied post"
					on:click={() => $goto(`/posts/${reply._id}`)}
				>
					<PFP
						icon={reply.author ? reply.author.pfp_data : -1}
						avatar={reply.author ? reply.author.avatar : ""}
						avatarColor={reply.author
							? reply.author.avatar_color
							: ""}
						alt="{reply.u}'s profile picture"
						size={0.45}
					/>
					<b class="reply-user"
								>{reply.author && reply.author.display_name
									? reply.author.display_name
									: reply.u}</b
							>
					<span class="reply-text"
						>{#if reply.p}{#await addFancyElements(reply.p.replace(/\s*\n+\s*/g, " "), postEmotes, reply.emojis || []) then html}{@html html}{/await}{:else}{reply.attachments && reply.attachments.length
								? "Attachment"
								: "Sticker"}{/if}</span
					>
				</button>
			{:else}
				<div class="reply-box deleted">
					<i>Original post was deleted</i>
				</div>
			{/if}
		{/each}
		<p
			class="post-content"
			class:jumbo
			style="border-left-color: #4b5563; {post.pending
				? 'opacity: 0.5;'
				: ''}"
		>
			{#await addFancyElements(post.content, postEmotes, post.emojis || []) then content}
				{@html content}
			{/await}
		</p>
	{/if}
	{#if error}
		<p style="color: crimson;">{error}</p>
	{/if}
	{#if !editing}
		<div class="post-images">
			{#each post.stickers || [] as sticker}
				<LoadingImage
					src="{uploadsUrl}stickers/{sticker._id || sticker}"
					alt={sticker.name || "Sticker"}
					thumbhash={sticker.thumbhash}
					maxWidth="12em"
					maxHeight="12em"
				/>
			{/each}
			{#each post.attachments as attachment}
				<Attachment
					id={attachment.id}
					filename={attachment.filename}
					mime={attachment.mime}
					size={attachment.size}
					width={attachment.width}
					height={attachment.height}
					thumbhash={attachment.thumbhash}
					siblings={post.attachments}
				/>
			{/each}
			{#each images as { title, url }}
				<ExternalImage {title} {url} />
			{/each}
		</div>
		{#if feedContext && !post.isDeleted}
			<div class="post-footer">
				<div class="feed-left">
					<button
						type="button"
						class="feed-btn like-btn"
						class:liked={likedByMe}
						disabled={!likedByMe && !canLike}
						title={likedByMe ? "Unlike" : "Like"}
						on:click={() =>
							toggleReaction(
								// remove whichever heart variant this user used
								likeReactions.find(r => r.user_reacted)?.emoji || "❤️"
							)}
					>
						<svg class="feed-icon" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill={likedByMe ? "currentColor" : "none"}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
						{#if likeCount > 0}<span class="feed-count">{likeCount}</span>{/if}
					</button>
					{#if canReact}
						<button
							type="button"
							class="feed-btn react-btn"
							title="Add reaction"
							bind:this={reactButton}
							on:click={openReactPopup}
						>
							<svg class="feed-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
						</button>
					{/if}
				{#if otherReactions.length}
				<div class="reactions footer-chips">
				{#each feedContext ? otherReactions : post.reactions as reaction (reaction.emoji)}
					<button
						type="button"
						class="reaction"
						class:mine={reaction.user_reacted}
						disabled={!(
							(reaction.user_reacted && $user.name) ||
							canJoinReaction
						)}
						title={!(
							(reaction.user_reacted && $user.name) ||
							canJoinReaction
						)
							? "You can't react in this chat"
							: reactorTitles[reaction.emoji] || ""}
						on:mouseenter={() => loadReactors(reaction.emoji)}
						on:click={() => toggleReaction(reaction.emoji)}
					>
						{#if isCustomReaction(reaction.emoji)}
							<img
								class="reaction-emoji"
								src="{uploadsUrl}emojis/{reaction.emoji}"
								alt="Custom emoji"
								draggable="false"
							/>
						{:else}
							<span class="reaction-emoji"
								>{@html twemoji.parse(reaction.emoji, parseOptions)}</span
							>
						{/if}
						{#if reaction.users && reaction.users.length}
							<span class="reaction-pfps">
								{#each reaction.users.slice(0, 3) as reactor (reactor)}
									{@const reactorProfile = $profileCache[reactor] || {}}
									<span class="reaction-pfp">
										<PFP
											raw
											icon={reactorProfile.error
												? -2
												: reactorProfile.pfp_data ?? -1}
											avatar={reactorProfile.avatar}
											avatarColor={reactorProfile.avatar_color}
											alt="{reactor}'s profile picture"
											size={0.4}
										/>
									</span>
								{/each}
							</span>
						{/if}
						<span class="reaction-count">{reaction.count}</span>
					</button>
				{/each}
			</div>
		{/if}
				</div>
				<PostReplies {post} {onReply} bind:this={postReplies} bind:total={repliesTotal} />
				{#if canReply && !repliesTotal}
					<button
						type="button"
						class="feed-btn reply-btn"
						title="Reply"
						on:click={() => postReplies?.openCompose()}
					>
						<svg class="feed-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 10l-5 5 5 5"/><path d="M4 15h11a4 4 0 0 0 0-8h-1"/></svg>
					</button>
				{/if}
			</div>
		{:else}
		{#if (post.reactions || []).length}
			<div class="reactions">
				{#each post.reactions as reaction (reaction.emoji)}
					<button
						type="button"
						class="reaction"
						class:mine={reaction.user_reacted}
						disabled={!(
							(reaction.user_reacted && $user.name) ||
							canJoinReaction
						)}
						title={!(
							(reaction.user_reacted && $user.name) ||
							canJoinReaction
						)
							? "You can't react in this chat"
							: reactorTitles[reaction.emoji] || ""}
						on:mouseenter={() => loadReactors(reaction.emoji)}
						on:click={() => toggleReaction(reaction.emoji)}
					>
						{#if isCustomReaction(reaction.emoji)}
							<img
								class="reaction-emoji"
								src="{uploadsUrl}emojis/{reaction.emoji}"
								alt="Custom emoji"
								draggable="false"
							/>
						{:else}
							<span class="reaction-emoji"
								>{@html twemoji.parse(reaction.emoji, parseOptions)}</span
							>
						{/if}
						{#if reaction.users && reaction.users.length}
							<span class="reaction-pfps">
								{#each reaction.users.slice(0, 3) as reactor (reactor)}
									{@const reactorProfile = $profileCache[reactor] || {}}
									<span class="reaction-pfp">
										<PFP
											raw
											icon={reactorProfile.error
												? -2
												: reactorProfile.pfp_data ?? -1}
											avatar={reactorProfile.avatar}
											avatarColor={reactorProfile.avatar_color}
											alt="{reactor}'s profile picture"
											size={0.4}
										/>
									</span>
								{/each}
							</span>
						{/if}
						<span class="reaction-count">{reaction.count}</span>
					</button>
				{/each}
			</div>
		{/if}
		{#if canReply && onReply}
			<div class="post-footer-right">
				<button
					type="button"
					class="reply-btn-inline"
					title="Reply"
					on:click={() => onReply(post)}
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 10l-5 5 5 5"/><path d="M4 15h11a4 4 0 0 0 0-8h-1"/></svg>
					Reply
				</button>
			</div>
		{/if}
		{/if}
	{/if}
	{#if reactPopupAnchor}
		<div
			class="react-overlay"
			on:click={() => (reactPopupAnchor = null)}
		/>
		<EmojiPopup
			chatId={post.post_origin}
			anchor={reactPopupAnchor}
			onUnicode={ch => toggleReaction(ch)}
			onEmoji={(name, emote) => emote && toggleReaction(emote._id)}
			onSticker={null}
			onClose={() => (reactPopupAnchor = null)}
		/>
	{/if}
</Container>
{/if}

<style>
	.pfp {
		margin-right: 0.2em;
		padding: 0;
		border: none;
		background: none !important;
		color: inherit;
	}
	.post-header {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		max-width: 100%;
	}

	.post-tag {
		display: inline-flex;
		align-items: center;
		padding: 0.05em 0.6em;
		border-radius: 999px;
		border: 1px solid currentColor;
		font-size: 0.7em;
		line-height: 1.5;
		opacity: 0.65;
		white-space: nowrap;
	}
	.post-tag.deleted {
		color: crimson;
		opacity: 0.9;
	}
	.post-tag :global(.date) {
		font-style: normal;
		font-size: 1em !important;
		opacity: 1 !important;
	}
	.post-tag :global(.date)::before {
		content: none !important;
	}
	/* keep the name block beside the avatar on narrow screens */
	.creatordate {
		flex: 1 1 0;
		min-width: 0;
	}
	.creatordate {
		margin-left: 0.5em;
	}
	.creator {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5em;
	}
	.creator h2 {
		font-size: 200%;
		line-height: 1.05;
		margin: 0;
		overflow-wrap: anywhere;
	}
	:global(main.input-hover) .pfp:hover:not(:active) :global(.pfp),
	:global(main.input-touch) .pfp:active :global(.pfp),
	.pfp:focus-visible :global(.pfp) {
		transform: scale(1.1);
	}
	.settings-controls {
		position: absolute;
		top: 0.25em;
		right: 0.25em;
	}
	button.circle {
		border: none;
		margin: 0;
		margin-left: 0.125em;
	}
	/* Mobile: smaller header that leaves room for the more button */
	:global(main.layout-mobile) .post-header {
		padding-right: 2.2em;
	}
	:global(main.layout-mobile) .pfp :global(.pfp-container) {
		--size: 0.8 !important;
	}
	:global(main.layout-mobile) .creator h2 {
		font-size: 150%;
	}

	.edit-row {
		display: flex;
		align-items: flex-start;
		gap: 0.4em;
		margin: 0.6em 0 0.4em;
	}
	.edit-input {
		flex-grow: 1;
		min-width: 0;
		min-height: 2.6em;
		max-height: 300px;
		overflow-y: auto;
		box-sizing: border-box;
		padding: 0.5em 0.8em;
		border: solid 2px var(--orange);
		border-radius: 5px;
		background-color: var(--background);
		color: var(--foreground);
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		outline: none;
		line-height: 1.4;
		cursor: text;
	}
	.edit-input:focus {
		border-radius: 2px;
	}
	.edit-input :global(img.composer-emoji) {
		width: 1.35em;
		height: 1.35em;
		object-fit: contain;
		vertical-align: -0.3em;
		margin: 0 0.05em;
	}
	.edit-row button.circle {
		flex-shrink: 0;
		margin-top: 0.3em;
	}
	.post-footer {
		display: flex;
		align-items: center;
		justify-content: flex-start;
		flex-wrap: wrap;
		gap: 0.4em 0.4em;
		margin-top: 0.45em;
	}
	.feed-left {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.4em;
		min-width: 0;
	}
	.feed-btn {
		margin: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.35em;
		height: 32px;
		min-width: 32px;
		padding: 0 0.6em;
		border: none;
		border-radius: 16px;
		background: transparent;
		color: var(--gray, #888);
		font-weight: 600;
		cursor: pointer;
		transition: color 0.15s, background-color 0.15s, transform 0.1s;
	}
	.feed-btn:hover:not(:disabled) {
		background: var(--orange-light, rgba(249, 119, 32, 0.12));
		color: var(--orange, #f97720);
	}
	.feed-btn:disabled {
		opacity: 0.45;
		cursor: default;
	}
	.feed-btn:active:not(:disabled) .feed-icon {
		transform: scale(1.25);
	}
	.feed-icon {
		width: 18px;
		height: 18px;
		transition: transform 0.12s;
	}
	.like-btn.liked {
		color: var(--orange, #f97720);
	}
	.reply-btn {
		margin-left: auto;
	}
	.post-footer-right {
		display: flex;
		justify-content: flex-end;
		margin-top: 0.35em;
	}
	.reply-btn-inline {
		display: inline-flex;
		align-items: center;
		gap: 0.35em;
		margin: 0;
		padding: 0.25em 0.7em;
		border: none;
		border-radius: 999px;
		background: transparent;
		color: var(--gray, #888);
		font-weight: 600;
		cursor: pointer;
	}
	.reply-btn-inline:hover {
		background: var(--orange-light, rgba(249, 119, 32, 0.12));
		color: var(--orange, #f97720);
	}
	.reply-btn-inline svg {
		width: 16px;
		height: 16px;
	}
	.feed-count {
		font-variant-numeric: tabular-nums;
	}
	.reactions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3em;
	}
	.reactions.footer-chips {
		align-items: center;
		gap: 0.4em;
		margin-top: 0;
	}
	.reactions.footer-chips .reaction {
		height: 32px;
		box-sizing: border-box;
		padding: 0 0.6em;
		gap: 0.3em;
	}
	.reactions.footer-chips .reaction-emoji,
	.footer-chips .reaction-emoji :global(img.emoji) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
	}
	.reactions.footer-chips .reaction-pfps {
		display: inline-flex;
		align-items: center;
		line-height: 1;
	}
	.reactions.footer-chips .reaction-count {
		line-height: 1;
		display: inline-flex;
		align-items: center;
	}
	.reactions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3em;
		margin-top: 0.5em;
	}
	.reaction {
		display: inline-flex;
		align-items: center;
		gap: 0.3em;
		margin: 0;
		padding: 0.15em 0.5em;
		border-radius: 1em;
		border: solid 2px var(--orange);
		background-color: transparent;
		color: var(--foreground);
		font-size: 0.9em;
		line-height: 1.2;
	}
	.reaction.mine {
		background-color: var(--orange);
		color: white;
	}
	.reaction-emoji,
	.reaction-emoji :global(img.emoji) {
		width: 1.2em;
		height: 1.2em;
		display: inline-block;
		vertical-align: middle;
		object-fit: contain;
	}
	.reaction-pfps {
		display: inline-flex;
		align-items: center;
	}
	.reaction-pfp {
		width: 1.4em;
		height: 1.4em;
		flex: 0 0 auto;
		border-radius: 35%;
		overflow: hidden;
		/* white like other profile pictures, ringed in the chip colour */
		background: var(--pfp-bg, #fff);
		border: solid 2px var(--background);
		box-sizing: border-box;
	}
	.reaction-pfp :global(span),
	.reaction-pfp :global(img) {
		width: 100% !important;
		height: 100% !important;
		display: block;
		object-fit: cover;
	}
	.reaction-pfp + .reaction-pfp {
		margin-left: -0.55em;
	}
	.reaction.mine .reaction-pfp {
		border-color: var(--orange);
	}
	.reaction-count {
		font-weight: bold;
	}
	.react-overlay {
		position: fixed;
		inset: 0;
		z-index: 10001;
	}
	.post-images {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25em;
		max-width: 100%;
		min-width: 0;
	}
	.post-images > :global(*) {
		max-width: 100%;
		min-width: 0;
	}
	.reply-box {
		min-width: 0;
		max-width: 100%;
		contain: inline-size;
		display: flex;
		align-items: center;
		gap: 0.5em;
		width: 100%;
		box-sizing: border-box;
		margin: 0.5em 0 0;
		padding: 0.3em 0.5em;
		background: none !important;
		border: solid 2px var(--orange);
		border-radius: 5px;
		color: inherit;
		font-size: 0.9em;
		text-align: left;
		overflow: hidden;
	}
	.reply-box.deleted {
		opacity: 0.6;
	}
	.reply-user {
		flex-shrink: 0;
	}
	.reply-text :global(*) {
		display: inline;
		margin: 0;
		padding: 0;
		white-space: nowrap;
		font-size: inherit;
		border: none;
	}
	.reply-text :global(br) {
		display: none;
	}
	.reply-text :global(img) {
		height: 1.2em;
		width: auto;
		vertical-align: middle;
	}
	.reply-text {
		flex: 1 1 0;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		opacity: 0.8;
	}
	.server-wrap :global(> div) {
		padding: 0.3em 0.6em;
		border: none;
	}
	.server-post {
		font-size: 0.85em;
		opacity: 0.75;
		margin: 0;
		text-align: center;
	}
	.server-date {
		font-size: 0.75em;
		margin-left: 0.5em;
		font-style: normal;
	}
	.post-content :global(img:not(.emoji):not(.custom-emoji)) {
		max-width: 100%;
		height: auto;
	}
	.post-sticker {
		max-width: 12em;
		max-height: 12em;
	}
	.post-content.jumbo :global(img.emoji),
	.post-content.jumbo :global(img.custom-emoji) {
		width: auto;
		height: 3em;
		vertical-align: middle;
	}
	.post-content :global(img.custom-emoji) {
		height: 1.4em;
		vertical-align: -0.35em;
	}

	textarea {
		margin-top: 0.5em;
		margin-bottom: 0.5em;
		width: 100%;
	}

	/* ---- new layout (opt-in) ---- */
	/* 40px author avatar (PFP inner = --size * 3.75em of its font-size) */
	:global(main.layout-modern .post-header .pfp-container) {
		font-size: 10.7px;
	}
	/* mobile forces --size 0.8 -> 36px */
	:global(main.layout-modern.layout-mobile .post-header .pfp-container) {
		font-size: 12px;
	}
	:global(main.layout-modern) .creatordate {
		display: flex;
		align-items: baseline;
		gap: 0.5em;
		flex-wrap: wrap;
	}
	:global(main.layout-modern) .creatordate .creator h2 {
		display: inline;
		margin: 0;
		font-size: 1em;
	}
	:global(main.layout-modern) .creatordate :global(.date) {
		font-size: 0.8em;
		opacity: 0.6;
	}
	/* name and @username lines sit close together */
	:global(main.layout-modern) .creatordate.has-display-name {
		row-gap: 0;
	}
	:global(main.layout-modern) .creatordate .author-username {
		font-size: 0.8em;
	}
	:global(main.layout-modern) .creatordate .author-username::after {
		content: "";
	}
	:global(main.layout-modern) .creatordate :global(.date)::before {
		content: "· ";
	}
	/* floating action pill, desktop only (mobile keeps the ⋯ sheet) */
	:global(main.layout-modern:not(.layout-mobile))
		.post-header
		.settings-controls {
		position: absolute;
		top: 0.5em;
		right: 0.5em;
		z-index: 5;
		display: flex;
		gap: 0.15em;
		padding: 0.15em;
		background-color: var(--surface-2);
		border: solid 1px var(--hairline);
		border-radius: 999px;
		opacity: 0;
		transform: translateY(-4px);
		transition: opacity 0.15s, transform 0.15s;
		pointer-events: none;
	}
	:global(main.layout-modern:not(.layout-mobile))
		.post-header:hover
		.settings-controls,
	:global(main.layout-modern:not(.layout-mobile))
		.settings-controls:focus-within {
		opacity: 1;
		transform: none;
		pointer-events: auto;
	}
	:global(main.layout-modern:not(.layout-mobile))
		.settings-controls
		button.circle {
		border: none;
		background-color: transparent;
	}
	:global(main.layout-modern:not(.layout-mobile))
		.settings-controls
		button.circle:hover {
		background-color: var(--surface);
	}
	/* pill reaction chips */
	:global(main.layout-modern) .reaction {
		border: solid 1px var(--hairline);
		background-color: var(--surface-2);
	}
	:global(main.layout-modern) .reaction.mine {
		background-color: var(--orange);
	}
	:global(main.layout-modern) .reaction .reaction-pfp {
		border-color: var(--surface-2);
	}
	:global(main.layout-modern) .reaction.mine .reaction-pfp {
		border-color: var(--orange);
	}
	/* @username sits on the line under the display name, before the time */
	.author-username {
		font-size: 0.85em;
		font-weight: normal;
		opacity: 0.6;
	}
	.author-username::after {
		content: " ·";
	}
	.creatordate.has-display-name .creator {
		flex-basis: 100%;
	}
	/* inbox messages: a category tile instead of a profile picture */
	.inbox-avatar {
		display: block;
		position: relative;
		width: 3.75em;
		height: 3.75em;
		box-sizing: border-box;
		border-radius: 1.25em;
		background: var(--orange);
	}
	.inbox-avatar::after {
		content: "";
		position: absolute;
		inset: 0;
		background-color: var(--foreground-orange, #fff);
		-webkit-mask: var(--icon) center / 50% no-repeat;
		mask: var(--icon) center / 50% no-repeat;
	}
	:global(main.layout-modern) .inbox-avatar {
		width: 40px;
		height: 40px;
		border-radius: 12px;
	}
	:global(main.layout-modern.layout-mobile) .inbox-avatar {
		width: 36px;
		height: 36px;
	}
</style>
