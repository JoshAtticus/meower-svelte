<!-- A post. Profile pictures not appearing while not logged in is intentional. -->
<script>
	import Container from "../lib/Container.svelte";
	import PFP from "../lib/PFP.svelte";
	import FormattedDate from "./FormattedDate.svelte";
	import {relativeDate, now} from "./relativeDate.js";
	import Badge from "./Badge.svelte";
	import LiText from "./LiText.svelte";
	import Attachment from "./Attachment.svelte";
	import ExternalImage from "./ExternalImage.svelte";

	import ConfirmHyperlinkModal from "./modals/ConfirmHyperlink.svelte";
	import DeletePostModal from "./modals/DeletePost.svelte";
	import ReportPostModal from "./modals/safety/ReportPost.svelte";
	import ModeratePostModal from "./modals/moderation/ModeratePost.svelte";
	import SharePostModal from "./modals/SharePost.svelte";
	import PinPostModal from "./modals/PinPost.svelte";
	import EmojiPopup from "./EmojiPopup.svelte";
	import {portal} from "./portal.js";
	import {swipeDismiss} from "./swipeDismiss.js";

	import {authHeader, user, chat, ulist} from "../lib/stores.js";
	import {adminPermissions, hasPermission} from "../lib/bitField.js";
	import {apiUrl, uploadsUrl} from "./urls.js";
	import {has as hasChatPerm, outranks, rank as chatRank, ADMIN_TIER, nameColorStyle} from "./chatPermissions.js";
	import {chatEmotes, loadEmotes} from "../lib/emotes.js";
	import {shiftHeld} from "../lib/keyDetect.js";
	import {mobile} from "../lib/responsiveness.js";
	import * as modals from "./modals.js";

	import {IMAGE_HOST_WHITELIST} from "./hostWhitelist.js";

	import {default as loadProfile, profileCache} from "../lib/loadProfile.js";

	// @ts-ignore
	import {richInput} from "./richInput.js";
	import MarkdownIt from "markdown-it";
	import hljs from "highlight.js/lib/common";
	import "highlight.js/styles/github-dark.css";
	import twemoji from "twemoji";
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

	$: postProfile = $profileCache[post.user] || {};

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

	function confirmLink(link) {
		link = atob(link); // we now base64 encode the link to prevent XSS
		if (!link.startsWith("https:") && !link.startsWith("http:") && !link.startsWith("/")) {
			link = "https://" + link;
		}
		let url = new URL(link, location.href);
		if (url.host === location.host) {
			$goto(url.pathname);
		} else {
			modals.showModal(ConfirmHyperlinkModal, {link});
		}
		return false;
	}
	// @ts-ignore
	window.confirmLink = confirmLink;

	function addFancyElements(content, emotes) {
		// markdown (which has HTML escaping built-in)
		try {
			const md = new MarkdownIt("default", {
				breaks: true,
				linkify: true,
				typographer: true,
				highlight: function (str, lang) {
					if (lang && hljs.getLanguage(lang)) {
						try {
							return (
								'<pre><code class="hljs">' +
								hljs.highlight(str, {
									language: lang,
									ignoreIllegals: true,
								}).value +
								"</code></pre>"
							);
						} catch {}
					}
					return ""; // use default escaping
				},
			});
			md.linkify.add("@", {
				validate: function (text, pos) {
					var tail = text.slice(pos);
					return tail.match(/[a-zA-Z0-9-_]{0,20}/gs)[0].length;
				},
				normalize: function (match) {
					match.url =
						window.location.host +
						"/users/" +
						match.url.replace(/^@/, "");
				},
			});
			const tokens = md.parse(
				content
					.replaceAll(/\[([^\]]+?): (https:\/\/[^\]]+?)\]/gs, "")
					.replaceAll(/\*\*\*\*/gs, "\\*\\*\\*\\*"),
				{}
			);
			for (const token of tokens) {
				if (token.children) {
					for (const childToken of token.children) {
						if (childToken.type === "text") {
							childToken.type = "html_inline";
							childToken.content = renderTextEmojis(
								md.utils.escapeHtml(childToken.content),
								emotes
							);
						}
						if (childToken.type === "image") {
							const srcPos = childToken.attrs.findIndex(
								attr => attr[0] === "src"
							);
							if (
								!IMAGE_HOST_WHITELIST.some(o =>
									childToken.attrs[srcPos][1]
										.toLowerCase()
										.startsWith(o.toLowerCase())
								)
							) {
								childToken.attrs[srcPos][1] = "about:blank";
								console.log(childToken);
							}
						}
						if (childToken.type === "link_open") {
							const href = childToken.attrs.find(
								attr => attr[0] === "href"
							)[1];
							const b64href = btoa(href);
							childToken.attrs.push([
								"onclick",
								`return confirmLink('${b64href}')`,
							]);
						}
					}
				}
			}
			content = md.renderer.render(tokens, md.options);

			// add quote containers to blockquotes (although, quotes are currently broken)
			content = content.replaceAll(
				/<blockquote>(.+?)<\/blockquote>/gms,
				'<div class="quote-container"><blockquote>$1</blockquote></div>'
			);
		} catch (e) {
			// this is to stop any possible XSS attacks by bypassing the markdown lib
			// which is responsible for escaping HTML
			return `Failed rendering post: ${e}`;
		}

		return content;
	}

	// Takes already-escaped text from a markdown text token, never rendered
	// HTML, so emoji markup can't land inside an attribute value.
	// Custom emojis are written <:EMOJI_ID>; the server sends their details
	// with the post (post.emojis), so they work outside their own chat too.
	function renderTextEmojis(escapedText, emotes) {
		escapedText = escapedText.replaceAll(
			/&lt;:([a-zA-Z0-9]{24})&gt;/g,
			(match, id) => {
				const known =
					(post.emojis || []).find(e => (e._id || e) === id) ||
					((emotes && emotes.emojis) || []).find(e => e._id === id);
				const name = known && known.name ? `:${known.name.replace(/[^a-zA-Z0-9_-]/g, "")}:` : "emoji";
				return `<img class="custom-emoji" src="${uploadsUrl}emojis/${id}" alt="${name}" title="${name}">`;
			}
		);

		return twemoji.parse(escapedText, {
			folder: "svg",
			ext: ".svg",
			size: 20,
		});
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
		} else {
			reactions.push({emoji, count: 1, user_reacted: true});
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
				{#await addFancyElements(post.content, postEmotes) then content}
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
					{#if !editing && onReply && post.post_origin !== "inbox" && post.post_origin !== "livechat"}
						<button
							class="circle reply"
							title="Reply"
							on:click={() => onReply(post)}
						/>
					{/if}
					{#if showJump && post.post_id && !post.pending}
						<button
							class="circle join"
							title="Jump to post"
							on:click={() => $goto(`/posts/${post.post_id}`)}
						/>
					{/if}
					{#if !editing && canReact}
						<button
							class="circle react"
							title="React"
							bind:this={reactButton}
							on:click={openReactPopup}
						/>
					{/if}
					{#if !editing && post.post_origin !== "inbox"}
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
						{#if post.user === $user.name && !($chat.dm_request && $chat.dm_request.from === $user.name)}
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
		</button>
		<div class="creatordate">
			<div class="creator">
				<h2>
					<span style={isGroupPost ? nameColorStyle($chat, post.user) : ""}
						><LiText text={post.user} /></span
					>
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

			<FormattedDate date={post.date} />
			{#if post.pinned}
				<i>(pinned)</i>
			{/if}
			{#if post.edited_at}
				<i
					>(<FormattedDate
						date={post.edited_at}
						customText="edited"
					/>)</i
				>
			{/if}
			{#if post.isDeleted && post.mod_deleted}
				<i
					>(<FormattedDate
						date={post.deleted_at}
						customText="deleted by moderator"
					/>)</i
				>
			{:else if post.isDeleted}
				<i
					>(<FormattedDate
						date={post.deleted_at}
						customText="self-deleted"
					/>)</i
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
					<b class="reply-user">{reply.u}</b>
					<span class="reply-text"
						>{reply.p ||
							(reply.attachments && reply.attachments.length
								? "Attachment"
								: "Sticker")}</span
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
			{#await addFancyElements(post.content, postEmotes) then content}
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
				<img
					class="post-sticker"
					src="{uploadsUrl}stickers/{sticker._id || sticker}"
					alt={sticker.name || "Sticker"}
					draggable="false"
				/>
			{/each}
			{#each post.attachments as attachment}
				<Attachment
					id={attachment.id}
					filename={attachment.filename}
					mime={attachment.mime}
				/>
			{/each}
			{#each images as { title, url }}
				<ExternalImage {title} {url} />
			{/each}
		</div>
		{#if (post.reactions || []).length}
			<div class="reactions">
				{#each post.reactions as reaction (reaction.emoji)}
					<button
						type="button"
						class="reaction"
						class:mine={reaction.user_reacted}
						disabled={!(canReact || (reaction.user_reacted && $user.name))}
						title={reactorTitles[reaction.emoji] || ""}
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
								>{@html twemoji.parse(reaction.emoji, {
									folder: "svg",
									ext: ".svg",
								})}</span
							>
						{/if}
						<span class="reaction-count">{reaction.count}</span>
					</button>
				{/each}
			</div>
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
	}
	.reply-box {
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
	.reply-text {
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
</style>
