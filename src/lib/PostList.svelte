<!--
	Component that powers lists of posts like home.
	Also customizable!

	Parameters:
	- fetchUrl: The API path to fetch (like "home" for /home). Adds ?autoget and ?page= by default.
		If falsy, a page won't be fetched by default (the list will start empty).
	- postOrigin: A post_origin to listen to for live post updates
		(for example, posts from home have the origin "home").
		If falsy, posts will not be listened to.
	- chatName: Only needed for group chats. Used for join/leave messages.
	- canPost: A boolean which indicates if this list can be posted in or not.
	- queryParams: Additional query parameters, as an object.

	Slots:
	- error and empty: These slots unction the same as PagedList (see its comment).
		There are no "loaded" or "item" slots.

	Events:
	- loaded: Fired when the list loads for the first time.
-->
<script>
	import BasicModal from "./modals/Basic.svelte";
	import AccountBannedModal from "./modals/safety/AccountBanned.svelte";
	import BlockUserModal from "./modals/safety/BlockUser.svelte";
	import SendFiles from "./modals/SendFiles.svelte";
	import EmojiPopup from "./EmojiPopup.svelte";
	import emojiIcon from "../assets/emoji.svg";

	import {
		relationships,
		authHeader,
		user,
		lastTyped,
		chat,
	} from "./stores.js";
	import {userRestrictions, isRestricted} from "../lib/bitField.js";
	import {shiftHeld} from "./keyDetect.js";
	import {mobile} from "./responsiveness.js";
	import {playNotification} from "./sounds.js";
	import * as modals from "./modals.js";
	import PagedList from "./PagedList.svelte";
	import Container from "./Container.svelte";
	import Post from "./Post.svelte";
	import TypingIndicator from "./TypingIndicator.svelte";
	import ProfileView from "./ProfileView.svelte";
	import * as clm from "./clmanager.js";
	import {apiUrl, encodeApiURLParams, uploadsUrl} from "./urls.js";
	import {chatEmotes, loadEmotes} from "./emotes.js";

	import {createEventDispatcher} from "svelte";
	const dispatch = createEventDispatcher();

	// @ts-ignore
	import {autoresize} from "svelte-textarea-autoresize";

	import {params} from "@roxi/routify";
	import {onMount, onDestroy} from "svelte";

	export let fetchUrl = "home";
	export let postOrigin = "home";
	export let chatName = "Home";
	export let canPost = true;
	export let queryParams = {};
	export let addToChat = false;
	export let adminView = false;

	let id = 0;
	let postErrors = {};

	// User restriction status
	let userRestricted = false;
	$: {
		if (
			postOrigin === "home" &&
			isRestricted(userRestrictions.HOME_POSTS)
		) {
			userRestricted = true;
		} else if (
			!["home", "inbox"].includes(postOrigin) &&
			isRestricted(userRestrictions.CHAT_POSTS)
		) {
			userRestricted = true;
		} else {
			userRestricted = false;
		}
	}

	// DM recipient
	let dmWith = "";
	let recipientBlocked = false;
	$: {
		if ($chat.type === 1) {
			dmWith = $chat.members.find(username => username !== $user.name);
			recipientBlocked = $relationships[dmWith] === 2;
		}
	}

	// Elements
	let postInput, submitBtn;

	let pendingStickers = [];
	let pendingReplies = [];
	let showEmojiPopup = false;
	$: chatEmoteData = $chatEmotes[$chat._id] || {emojis: [], stickers: []};
	$: if ($chat._id) loadEmotes($chat._id);

	let addToChatLoading = {};

	// PagedList stuff
	let list;
	export let items = [];
	let firstLoad = true;

	/**
	 * Loads a page.
	 * @param {number} page
	 * @returns {Promise<{
	 * 	numPages: number,
	 * 	result: Array<import("./types.js").ListPost | import("./types.js").User>
	 * }>}
	 */
	async function loadPage(page = 1) {
		if (!fetchUrl) {
			// don't load anything
			if (firstLoad) dispatch("loaded");
			firstLoad = false;
			return {
				numPages: 1,
				result: [],
			};
		}

		let result;

		const params = new URLSearchParams({
			autoget: "1",
			page: page.toString(),
			...queryParams,
		}).toString();

		let path = `${fetchUrl}?${params}`;
		if (encodeApiURLParams) path = encodeURIComponent(path);
		const resp = await fetch(`${apiUrl}${path}`, {
			headers: $authHeader,
		});

		if (!resp.ok) {
			throw new Error("Response code is not OK; code is " + resp.status);
		}
		/**
		 * @type {import("./types.js").ServerPostList}
		 */
		const json = await resp.json();

		let posts = [];
		if (json.autoget) {
			posts = json.autoget;
		} else {
			posts = [json];
		}

		/**
		 * @type {Array<import("./types.js").ListPost | import("./types.js").User>}
		 */
		result = posts.map(post => {
			if ("lower_username" in post) {
				/** @type import("./types.js").User */
				// @ts-ignore
				const user = {
					id: id++,
					...post,
				};
				return user;
			}
			if (post.post_origin === "inbox") {
				if (post.u === "Server") {
					post.u = "Announcement";
				} else {
					post.u =
						fetchUrl === "inbox"
							? "Notification"
							: `Notification to ${post.u}`;
				}
			}
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
		});
		if ($user.hide_blocked_users) {
			// @ts-ignore
			result = result.filter(
				post =>
					$relationships[post._id] !== 2 &&
					$relationships[post.u] !== 2
			);
		}
		const numPages = json["pages"];

		if (firstLoad) dispatch("loaded");
		firstLoad = false;
		return {
			numPages,
			result,
		};
	}

	function sendPost(content, stickers = [], replyTo = []) {
		/**
		 * @type {import('src/lib/types.js').ListPost}
		 */
		const pendingPost = {
			id: id++,
			nonce: Math.random().toString(),
			post_origin: postOrigin,
			user: $user.name,
			content,
			attachments: [],
			stickers,
			reply_to: replyTo,
			date: Math.floor(new Date().getTime() / 1000),
			isDeleted: false,
			pending: true,
		};
		list.addItem(pendingPost);

		const postProm = new Promise(async (resolve, reject) => {
			try {
				const resp = await fetch(
					`${apiUrl}${
						postOrigin === "home" ? "home" : `/posts/${$chat._id}`
					}`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							...$authHeader,
						},
						body: JSON.stringify({
							content,
							nonce: pendingPost.nonce,
							stickers,
							reply_to: replyTo,
						}),
					}
				);
				const json = await resp.json();

				if (resp.ok) {
					resolve();
				} else {
					reject(json.type);
				}
			} catch (e) {
				reject(e);
			}
		});
		postProm.catch(e => {
			postErrors[pendingPost.id] = e;
		});
	}

	onMount(() => {
		if (postOrigin) {
			const evId = clm.link.on("direct", cmd => {
				if (!cmd.val) return;

				const isGC = postOrigin !== "home";
				if (cmd.val.mode === "delete") {
					if (adminView) return;
					items = items.filter(post => post.post_id !== cmd.val.id);
				}
				if (cmd.val.mode === "update_post") {
					let itemIndex = items.findIndex(
						post => post.post_id === cmd.val.payload._id
					);
					if (itemIndex !== -1) {
						let post = cmd.val.payload;
						items[itemIndex] = {
							id: items[itemIndex].id,
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
				}
				if (!isGC || cmd.val.state === 2) {
					if (cmd.val.post_origin !== postOrigin) return;
					const post = {
						id: id++,
						post_id: cmd.val._id,
						post_origin: cmd.val.post_origin,
						user: cmd.val.u,
						content: cmd.val.p,
						attachments: cmd.val.attachments,
						stickers: cmd.val.stickers,
						reply_to: cmd.val.reply_to,
						date: cmd.val.t.e,
						edited_at: cmd.val.edited_at,
						pinned: cmd.val.pinned,
						isDeleted: cmd.val.isDeleted,
						mod_deleted: cmd.val.mod_deleted,
						deleted_at: cmd.val.deleted_at,
					};
					list.addItem(post);
					if (cmd.val.nonce) {
						items = items.filter(post => post.nonce !== cmd.val.nonce);
					}
					if ($user.sfx && cmd.val.u !== $user.name)
						playNotification();
				}
			});
			destroy = () => clm.link.off(evId);
		}
	});

	let destroy = () => {};
	onDestroy(() => destroy());
</script>

<div>
	<!-- I think we discussed that guest posting will not be in
		the official client, due to moderation reasons -->
	{#if canPost && $user.name}
		{#if pendingReplies.length}
			<div class="pending-replies">
				{#each pendingReplies as reply, i}
					<button
						class="pending-reply"
						title="Remove reply"
						on:click={() =>
							(pendingReplies = pendingReplies.filter(
								(_, j) => j !== i
							))}
					>
						Replying to <b>@{reply.user}</b>:
						{(reply.content || "").length > 50
							? reply.content.slice(0, 50) + "…"
							: reply.content}
					</button>
				{/each}
			</div>
		{/if}
		{#if pendingStickers.length}
			<div class="pending-stickers">
				{#each pendingStickers as stickerId, i}
					<button
						class="pending-sticker"
						title="Remove sticker"
						on:click={() =>
							(pendingStickers = pendingStickers.filter(
								(_, j) => j !== i
							))}
					>
						<img
							src="{uploadsUrl}stickers/{stickerId}"
							alt="Sticker"
						/>
					</button>
				{/each}
			</div>
		{/if}
		<div class="composer">
		<form
				class="createpost"
				autocomplete="off"
				on:submit|preventDefault={/** @type {SubmitEvent} */ e => {
					// @ts-ignore
					const input = e.target.elements.input;
					// @ts-ignore
					const content = e.target.elements.input.value.trim();
					if (!content && !pendingStickers.length) {
						return;
					}
	
					if (content.match(/^s\/.+\//gs)) {
						// substitute command
						let post = items.find(_post => _post.user === $user.name);
						if (!post) return;
	
						let toReplace = content.split("/")[1];
						let replaceWith = content.replace(`s/${toReplace}/`, "");
	
						let newContent = post.content;
						newContent = newContent
							.replace(toReplace, replaceWith)
							.trim();
	
						if (newContent) {
							fetch(`${apiUrl}posts?id=${post.post_id}`, {
								method: "PATCH",
								headers: {
									"Content-Type": "application/json",
									...$authHeader,
								},
								body: JSON.stringify({
									content: newContent,
								}),
							}).catch(e => {
								console.error(e);
								postErrors[post.id] = e;
							});
						} else {
							fetch(`${apiUrl}posts?id=${post.post_id}`, {
								method: "DELETE",
								headers: $authHeader,
							}).catch(e => (postErrors[post.id] = e));
						}
					} else {
						// normal post
						sendPost(
							content,
							pendingStickers,
							pendingReplies.map(r => r.post_id)
						);
						pendingStickers = [];
						pendingReplies = [];
					}
	
					input.value = "";
					input.rows = "1";
					input.style.height = "45px";
				}}
			>
				<textarea
					type="text"
					class="white"
					placeholder={userRestricted
						? "Your account is currently restricted."
						: recipientBlocked
						? `You have blocked ${dmWith}.`
						: "Write something..."}
					name="input"
					autocomplete="off"
					maxlength="4000"
					rows="1"
					disabled={userRestricted || recipientBlocked}
					use:autoresize
					on:input={() => {
						if ($lastTyped + 2000 < +new Date()) {
							lastTyped.set(+new Date());
							fetch(
								`${apiUrl}${
									postOrigin === "home"
										? "home"
										: `/chats/${$chat._id}`
								}/typing`,
								{
									method: "POST",
									headers: $authHeader,
								}
							);
						}
					}}
					on:keydown={event => {
						if (event.key == "Enter" && !shiftHeld && !$mobile) {
							event.preventDefault();
							if (!submitBtn.disabled) submitBtn.click();
						}
					}}
					bind:this={postInput}
				/>
				{#if userRestricted}
					<button
						on:click|preventDefault={() => {
							modals.showModal(AccountBannedModal, {
								ban: $user.ban,
								feature: `creating ${
									postOrigin === "home" ? "home" : "group chat"
								} posts`,
							});
						}}>View details</button
					>
				{:else if recipientBlocked}
					<button
						on:click|preventDefault={() =>
							modals.showModal(BlockUserModal, {username: dmWith})}
						>Unblock</button
					>
				{:else}
					<button
						class="send-files"
						title="Send files"
						on:click|preventDefault={() => {
							modals.closeAllModals();
							modals.showModal(SendFiles, {postOrigin});
						}}>+</button
					>
					<button
						type="button"
						class="send-files emoji-trigger"
						class:active={showEmojiPopup}
						title="Emoji & stickers"
						on:click={() => (showEmojiPopup = !showEmojiPopup)}
					>
						<img src={emojiIcon} alt="Emoji" draggable="false" />
					</button>
					<button
						bind:this={submitBtn}
						name="submit"
						disabled={!postInput}>Post</button
					>
				{/if}
			</form>
			{#if showEmojiPopup}
				<div
					class="popup-overlay"
					on:click={() => (showEmojiPopup = false)}
				/>
				<EmojiPopup
					chatId={$chat._id}
					onEmoji={name => {
						postInput.value += `:${name}:`;
						postInput.focus();
					}}
					onUnicode={ch => {
						postInput.value += ch;
						postInput.focus();
					}}
					onSticker={id => {
						if (
							pendingStickers.length < 10 &&
							!pendingStickers.includes(id)
						) {
							pendingStickers = [...pendingStickers, id];
						}
					}}
				/>
			{/if}
		</div>
	{/if}
	{#if postOrigin}
		<TypingIndicator forPage={postOrigin} />
	{/if}
	<PagedList maxItems={100} bind:items {loadPage} bind:this={list}>
		<svelte:fragment slot="loaded" let:items={_items}>
			{#each _items as post (post.id)}
				<div class="item">
					{#if "lower_username" in post}
						<ProfileView
							profile={post}
							small={true}
							canClick={true}
							canDoActions={!addToChat}
						/>
						{#if addToChat && !$chat.members.includes(post._id)}
							<div class="settings-controls">
								<button
									class="circle add"
									title="Add to chat"
									disabled={addToChatLoading[post._id]}
									on:click={async () => {
										addToChatLoading[post._id] = true;
										try {
											const resp = await fetch(
												`${apiUrl}${
													$params.admin
														? "admin/"
														: ""
												}chats/${$chat._id}/members/${
													post._id
												}`,
												{
													method: "PUT",
													headers: $authHeader,
												}
											);
											if (!resp.ok) {
												switch (resp.status) {
													case 403:
														throw new Error(
															`Someone's privacy settings are preventing you from adding ${post._id} to ${$chat.nickname}.`
														);
													case 404:
														throw new Error(
															`${post._id} not found.`
														);
													case 409:
														throw new Error(
															`${post._id} is already a member of ${$chat.nickname}.`
														);
													case 429:
														throw new Error(
															"Too many requests! Try again later."
														);
													default:
														throw new Error(
															"Response code is not OK; code is " +
																resp.status
														);
												}
											}
											if ($params.admin) {
												$chat = await resp.json();
											}
											delete addToChatLoading[post._id];
										} catch (e) {
											modals.showModal(BasicModal, {
												title: `Failed to add ${post._id} to ${$chat.nickname}`,
												desc: e,
											});
											delete addToChatLoading[post._id];
										}
									}}
								/>
							</div>
						{/if}
					{:else}
						<Post
							{post}
							{adminView}
							input={postInput}
							onReply={post => {
								if (
									pendingReplies.length < 10 &&
									!pendingReplies.find(
										r => r.post_id === post.post_id
									)
								) {
									pendingReplies = [...pendingReplies, post];
									postInput.focus();
								}
							}}
							error={postErrors[post.id]}
							retryPost={() => {
								sendPost(post.content);
								items = items.filter(v => v.id !== post.id);
							}}
							removePost={() =>
								(items = items.filter(v => v.id !== post.id))}
						/>
					{/if}
				</div>
			{/each}
		</svelte:fragment>
		<slot name="error" slot="error" let:error {error}>
			<Container>
				Error loading posts. Please try again.
				<pre><code>{error}</code></pre>
			</Container>
		</slot>
		<slot name="empty" slot="empty">
			{#if postOrigin !== "livechat"}
				<Container>
					{#if $user.name && canPost}
						No posts here. Check back later or be the first to post!
					{:else}
						No posts here. Check back later!
					{/if}
				</Container>
			{/if}
		</slot>
	</PagedList>
</div>

<style>
	.createpost {
		top: 0;
		display: flex;
		margin-bottom: 0.5em;
		gap: 0.25em;
	}
	.createpost textarea {
		flex-grow: 1;
		resize: none;
		max-height: 300px;
	}

	.send-files {
		padding: 0;
		padding-left: 0.8rem;
		padding-right: 0.8rem;
		font-size: 2rem;
	}

	.composer {
		position: relative;
	}
	.emoji-trigger {
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.emoji-trigger img {
		width: 1.6rem;
		height: 1.6rem;
	}
	.popup-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 99;
	}

	.pending-replies {
		display: flex;
		flex-direction: column;
		gap: 0.3em;
		margin-bottom: 0.4em;
	}
	.pending-reply {
		text-align: left;
		background: none;
		border: none;
		border-left: solid 3px var(--orange);
		padding: 0.15em 0.5em;
		font-size: 0.85em;
		opacity: 0.85;
	}

	.pending-stickers {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4em;
		margin-bottom: 0.4em;
	}
	.pending-sticker {
		padding: 0;
		background: none;
		border: none;
	}
	.pending-sticker img {
		width: 4em;
		height: 4em;
		object-fit: contain;
	}

	.settings-controls {
		position: absolute;
		top: 0.5em;
		right: 0.5em;
	}

	.item {
		position: relative;
	}

	button.circle {
		border: none;
		margin: 0;
		margin-left: 0.125em;
	}
</style>
