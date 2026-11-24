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
	import EmojiPopup from "./EmojiPopup.svelte";
	import ServerPostGroup from "./ServerPostGroup.svelte";
	import emojiIcon from "../assets/emoji.svg";

	import {replyBus} from "./replyBus.js";
	import {addFancyElements} from "./postFormat.js";
	import {
		relationships,
		authHeader,
		user,
		lastTyped,
		chat,
		reconnectedAt,
	} from "./stores.js";
	import {userRestrictions, isRestricted} from "../lib/bitField.js";
	import {has as hasChatPerm} from "./chatPermissions.js";
	import {shiftHeld} from "./keyDetect.js";
	import {mobile} from "./responsiveness.js";
	import {modernLayout} from "./modernLayout.js";
	import {playNotification} from "./sounds.js";
	import * as modals from "./modals.js";
	import PagedList from "./PagedList.svelte";
	import Container from "./Container.svelte";
	import Post from "./Post.svelte";
	import PFP from "./PFP.svelte";
	import TypingIndicator from "./TypingIndicator.svelte";
	import ProfileView from "./ProfileView.svelte";
	import * as clm from "./clmanager.js";
	import {apiUrl, encodeApiURLParams, uploadsUrl} from "./urls.js";
	import {chatEmotes, loadEmotes} from "./emotes.js";
	import {profileCache} from "./loadProfile.js";

	import {createEventDispatcher} from "svelte";
	const dispatch = createEventDispatcher();

	// @ts-ignore
	import {richInput} from "./richInput.js";

	import {params} from "@roxi/routify";
	import {onMount, onDestroy} from "svelte";

	export let fetchUrl = "home";
	export let postOrigin = "home";
	export let chatName = "Home";
	export let canPost = true;
	export let textOnly = false;
	export let showJump = false;
	export let queryParams = {};
	export let addToChat = false;
	export let adminView = false;

	let id = 0;
	let postErrors = {};

	// group chats gate posting and replying separately (feed groups)
	$: isGroupPostOrigin =
		postOrigin && !["home", "inbox", "livechat"].includes(postOrigin);
	$: canReplyPosts =
		!!$user.name &&
		(!isGroupPostOrigin ||
			hasChatPerm($chat, $user.name, "reply_to_posts") ||
			hasChatPerm($chat, $user.name, "send_messages"));

	// the "also send as a post" choice only exists in feeds; in chats every reply is a normal message
	$: showAlsoPost =
		postOrigin === "home" ||
		(isGroupPostOrigin && $chat.type === 0 && $chat.mode === "feed");

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
	let postInput, submitBtn, fileInput;

	// Instant image attachments: uploaded as soon as they are picked,
	// pasted or dropped into the composer
	let pendingAttachments = [];
	let attachmentId = 0;
	let attachError = "";
	let inputMultiline = false;
	function updateInputMultiline() {
		if (!postInput) return;
		const lh = parseFloat(getComputedStyle(postInput).lineHeight) || 20;
		inputMultiline = postInput.scrollHeight > lh * 1.6;
	}
	$: uploadsInProgress = pendingAttachments.some(
		attachment => !attachment.id && !attachment.error
	);

	function attachmentsAllowed() {
		return !textOnly && !userRestricted && !recipientBlocked;
	}

	function addAttachments(files) {
		if (!attachmentsAllowed()) return;
		if (isRestricted(userRestrictions.UPLOADING)) {
			modals.showModal(AccountBannedModal, {
				ban: $user.ban,
				feature: "uploading files",
			});
			return;
		}
		for (const file of files) {
			if (pendingAttachments.length >= 10) {
				attachError = "You can only attach up to 10 files.";
				break;
			}
			if (
				!file.type.startsWith("image/") &&
				!file.type.startsWith("video/")
			) {
				attachError = "Only images and videos can be attached.";
				continue;
			}
			if (file.size > 25 << 20) {
				attachError = `${file.name} is too large! Files must be 25 MiB or smaller.`;
				continue;
			}
			const attachment = {
				key: ++attachmentId,
				file,
				isVideo: file.type.startsWith("video/"),
				url: URL.createObjectURL(file),
				progress: 0,
				id: null,
				error: null,
				xhr: null,
			};
			pendingAttachments = [...pendingAttachments, attachment];
			startUpload(attachment);
		}
	}

	function startUpload(attachment) {
		attachment.error = null;
		attachment.progress = 0;
		const xhr = new XMLHttpRequest();
		attachment.xhr = xhr;
		xhr.open("POST", `${uploadsUrl}attachments`);
		xhr.setRequestHeader("Authorization", $authHeader.token);
		xhr.upload.onprogress = ev => {
			if (ev.total) {
				attachment.progress = ev.loaded / ev.total;
				pendingAttachments = pendingAttachments;
			}
		};
		xhr.onload = () => {
			attachment.progress = 1;
			try {
				const resp = JSON.parse(xhr.response);
				if (xhr.status >= 200 && xhr.status < 300 && resp.id) {
					attachment.id = resp.id;
				} else {
					attachment.error = true;
				}
			} catch (e) {
				attachment.error = true;
			}
			pendingAttachments = pendingAttachments;
		};
		xhr.onerror = () => {
			attachment.error = true;
			pendingAttachments = pendingAttachments;
		};
		xhr.onabort = () => {
			attachment.error = true;
		};
		const formData = new FormData();
		formData.append("file", attachment.file);
		xhr.send(formData);
	}

	function removeAttachment(attachment) {
		if (attachment.xhr) attachment.xhr.abort();
		URL.revokeObjectURL(attachment.url);
		pendingAttachments = pendingAttachments.filter(
			other => other.key !== attachment.key
		);
	}

	let pendingReplies = [];
	let showEmojiPopup = false;
	let alsoPostReply = false;

	// Collapse runs of 3+ server posts by the same person within 5 minutes
	const GROUP_MIN = 3;
	const GROUP_WINDOW = 5 * 60;
	function serverActor(post) {
		if (!post || post.user !== "Server" || !post.content) return null;
		const m = post.content.match(/^@([A-Za-z0-9_-]{1,20})\b/);
		return m ? m[1] : null;
	}
	function groupServerPosts(list) {
		const heads = {}; // head post id -> {actor, posts}
		const members = new Set(); // non-head post ids hidden inside a group
		if (["home", "inbox"].includes(postOrigin)) return {heads, members};
		let i = 0;
		while (i < list.length) {
			const actor = serverActor(list[i]);
			if (!actor) {
				i++;
				continue;
			}
			let j = i + 1;
			while (
				j < list.length &&
				serverActor(list[j]) === actor &&
				list[i].date - list[j].date <= GROUP_WINDOW
			)
				j++;
			if (j - i >= GROUP_MIN) {
				const run = list.slice(i, j);
				heads[run[0].id] = {actor, posts: run};
				run.slice(1).forEach(p => members.add(p.id));
			}
			i = j;
		}
		return {heads, members};
	}
	$: serverGroups = groupServerPosts(items);
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
				category: post.category,
				content: post.p,
				attachments: post.attachments,
				stickers: post.stickers,
				reply_to: post.reply_to,
				reply_count: post.reply_count || 0,
				author: post.author,
				reactions: post.reactions || [],
				emojis: post.emojis || [],
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

	function sendPost(content, stickers = [], replyTo = [], attachments = [], replyOnly = false) {
		/**
		 * @type {import('src/lib/types.js').ListPost}
		 */
		const pendingPost = {
			id: id++,
			nonce: Math.random().toString(),
			post_origin: postOrigin,
			user: $user.name,
			content,
			attachments,
			stickers,
			reply_to: replyTo,
			date: Math.floor(new Date().getTime() / 1000),
			isDeleted: false,
			pending: true,
		};
		if (!replyOnly) list.addItem(pendingPost);

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
							reply_only: replyOnly,
							attachments: attachments.map(
								attachment => attachment.id
							),
						}),
					}
				);
				const json = await resp.json();

				if (resp.ok) {
					// the live event normally delivers the post; if it hasn't
					// shown up, use the server's reply so a sent post is never
					// left pending
					if (!replyOnly && json && json._id && !items.some(p => p.post_id === json._id)) {
						list.addItem({
							id: id++,
							post_id: json._id,
							post_origin: json.post_origin,
							user: json.u,
							content: json.p,
							attachments: json.attachments,
							stickers: json.stickers,
							reply_to: json.reply_to,
							author: json.author,
							reactions: json.reactions || [],
							emojis: json.emojis || [],
							date: json.t.e,
							edited_at: json.edited_at,
							pinned: json.pinned,
							isDeleted: json.isDeleted,
							mod_deleted: json.mod_deleted,
							deleted_at: json.deleted_at,
						});
					}
					items = items.filter(p => p.nonce !== pendingPost.nonce);
					resolve();
				} else {
					reject(json.type);
				}
			} catch (e) {
				reject(e);
			}
		});
		postProm.then(() => {
			// clear the tray entries that went into this post
			const sent = new Set(attachments.map(attachment => attachment.id));
			pendingAttachments = pendingAttachments.filter(
				attachment => !sent.has(attachment.id)
			);
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
				if (
					cmd.val.mode === "post_reaction_add" ||
					cmd.val.mode === "post_reaction_remove"
				) {
					const {post_id, emoji, username} = cmd.val.payload;
					const adding = cmd.val.mode === "post_reaction_add";
					const index = items.findIndex(p => p.post_id === post_id);
					if (index !== -1) {
						const mine = username === $user.name;
						let reactions = (items[index].reactions || []).map(r => ({...r}));
						const existing = reactions.find(r => r.emoji === emoji);
						if (existing) {
							// our own clicks are applied optimistically already
							if (!(mine && existing.user_reacted === adding)) {
								existing.count += adding ? 1 : -1;
								if (mine) existing.user_reacted = adding;
								existing.users = adding
									? [username, ...(existing.users || [])
										.filter(u => u !== username)].slice(0, 3)
									: (existing.users || [])
										.filter(u => u !== username);
							}
							reactions = reactions.filter(r => r.count > 0);
						} else if (adding && !mine) {
							reactions.push({emoji, count: 1, user_reacted: false, users: [username]});
						} else if (adding && mine) {
							reactions.push({emoji, count: 1, user_reacted: true, users: [username]});
						}
						items[index] = {...items[index], reactions};
					}
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
							reply_count: post.reply_count || 0,
							author: post.author,
							reactions: post.reactions || [],
							emojis: post.emojis || [],
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
						reply_count: cmd.val.reply_count || 0,
						author: cmd.val.author,
						reactions: cmd.val.reactions || [],
						emojis: cmd.val.emojis || [],
						date: cmd.val.t.e,
						edited_at: cmd.val.edited_at,
						pinned: cmd.val.pinned,
						isDeleted: cmd.val.isDeleted,
						mod_deleted: cmd.val.mod_deleted,
						deleted_at: cmd.val.deleted_at,
					};
					if (cmd.val.reply_only) {
						if (cmd.val.nonce) {
							items = items.filter(p => p.nonce !== cmd.val.nonce);
						}
						if (post.reply_to && post.reply_to.length)
							replyBus.set({post});
						return;
					}
					if (items.some(p => p.post_id === cmd.val._id)) {
						if (cmd.val.nonce) {
							items = items.filter(p => p.nonce !== cmd.val.nonce);
						}
						return;
					}
					list.addItem(post);
					if (cmd.val.nonce) {
						items = items.filter(post => post.nonce !== cmd.val.nonce);
					}
					if (post.reply_to && post.reply_to.length)
						replyBus.set({post});
					// only when sound effects are explicitly on
					if ($user.sfx === true && cmd.val.u !== $user.name)
						playNotification();
				}
			});
			destroy = () => clm.link.off(evId);
		}
	});

	let destroy = () => {};
	onDestroy(() => destroy());

	// After a reconnect, fetch the newest page and merge in anything missed
	// while offline. The list isn't remounted, so drafts and scroll survive.
	let resyncReady = false;
	const unsubResync = reconnectedAt.subscribe(async t => {
		if (!resyncReady) {
			resyncReady = true;
			return;
		}
		if (!t || !fetchUrl) return;
		try {
			const {result} = await loadPage(1);
			const byId = {};
			result.forEach(p => {
				if (p.post_id) byId[p.post_id] = p;
			});
			const known = new Set(items.map(p => p.post_id));
			const fresh = result.filter(p => p.post_id && !known.has(p.post_id));
			items = [
				...fresh,
				...items.map(p =>
					p.post_id && byId[p.post_id]
						? {...byId[p.post_id], id: p.id}
						: p
				),
			];
		} catch (e) {
			console.error("Failed to resync posts after reconnect:", e);
		}
	});
	onDestroy(unsubResync);
</script>

<div>
	<!-- I think we discussed that guest posting will not be in
		the official client, due to moderation reasons -->
	{#if canPost && $user.name}
		{#if pendingReplies.length}
			<div class="pending-replies">
				{#each pendingReplies as reply, i}
					<div class="pending-reply">
						<PFP
							icon={($profileCache[reply.user] || {}).pfp_data ||
								-1}
							avatar={($profileCache[reply.user] || {}).avatar}
							avatarColor={($profileCache[reply.user] || {})
								.avatar_color}
							alt="{reply.user}'s profile picture"
							size={0.45}
						/>
						<span class="pending-reply-label"
							>Replying to <b>{reply.user}</b></span
						>
						<span class="pending-reply-text">{#await addFancyElements((reply.content || "").replace(/\s*\n+\s*/g, " "), $chatEmotes[postOrigin] || {}, reply.emojis || []) then html}{@html html}{/await}</span>
						<button
							type="button"
							class="circle close"
							title="Cancel reply"
							on:click={() =>
								(pendingReplies = pendingReplies.filter(
									(_, j) => j !== i
								))}
						/>
					</div>
				{/each}
				{#if showAlsoPost}
					<label class="also-post">
						<input type="checkbox" bind:checked={alsoPostReply} />
						Also send as a post
					</label>
				{/if}
			</div>
		{/if}
		<div
			class="composer"
			on:dragover|preventDefault={() => {}}
			on:drop|preventDefault={e => addAttachments(e.dataTransfer.files)}
		>
		<input
			type="file"
			accept="image/*,video/*"
			multiple
			hidden
			bind:this={fileInput}
			on:change={e => {
				addAttachments(e.target.files);
				e.target.value = "";
			}}
		/>
		<form
				class="createpost"
				autocomplete="off"
				on:submit|preventDefault={/** @type {SubmitEvent} */ e => {
					const input = postInput;
					const content = postInput.value.trim();
					const sentAttachments = pendingAttachments.filter(
						attachment => attachment.id
					);
					if (!content && !sentAttachments.length) {
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
						const sentAttachmentIds = sentAttachments.map(attachment => ({
							id: attachment.id,
							mime: attachment.file.type,
							filename: attachment.file.name,
							size: attachment.file.size,
						}));
						sendPost(
							content,
							[],
							pendingReplies.map(r => r.post_id),
							sentAttachmentIds,
							pendingReplies.length > 0 && showAlsoPost && !alsoPostReply
						);
						pendingReplies = [];
						alsoPostReply = false;
					}
	
					input.value = "";
				}}
			>
				{#if pendingAttachments.length}
					<div class="attach-tray">
						{#each pendingAttachments as attachment (attachment.key)}
							<div
								class="attach-item"
								class:uploading={!attachment.id && !attachment.error}
								class:failed={attachment.error}
							>
								{#if attachment.isVideo}
									<video
										src={attachment.url}
										muted
										preload="metadata"
									/>
									<span class="attach-play" aria-hidden="true"
										><svg
											viewBox="0 0 24 24"
											width="18"
											height="18"
											fill="currentColor"
											><path d="M8 5v14l11-7z" /></svg
										></span
									>
								{:else}
									<img
										src={attachment.url}
										alt={attachment.file.name}
									/>
								{/if}
								{#if !attachment.id && !attachment.error}
									<span
										class="attach-progress"
										style:--p={attachment.progress}
									/>
								{:else if attachment.error}
									<button
										class="attach-retry"
										title="Retry upload"
										aria-label="Retry upload"
										on:click|preventDefault={() =>
											startUpload(attachment)}
										>Retry</button
									>
								{/if}
								<button
									class="attach-remove"
									title="Remove attachment"
									aria-label="Remove attachment"
									on:click|preventDefault={() =>
										removeAttachment(attachment)}
									><svg
										viewBox="0 0 24 24"
										width="12"
										height="12"
										fill="none"
										stroke="currentColor"
										stroke-width="3"
										stroke-linecap="round"
										aria-hidden="true"
										><path d="M5 5l14 14M19 5L5 19" /></svg
									></button
								>
							</div>
						{/each}
					</div>
				{/if}
				{#if attachError}
					<p class="attach-error">{attachError}</p>
				{/if}
				<div class="composer-row" class:multiline={inputMultiline}>
				{#if $modernLayout}
					<span class="composer-pfp mpfp">
						<PFP
							raw
							size={0.5}
							icon={$user.name ? $user.pfp_data : -3}
							avatar={$user.name ? $user.avatar : ""}
							avatarColor={$user.avatar_color}
							alt="Your profile picture"
						/>
					</span>
				{/if}
				<div
					class="composer-input"
					role="textbox"
					aria-multiline="true"
					tabindex="0"
					data-placeholder={userRestricted
						? "Your account is currently restricted."
						: recipientBlocked
						? `You have blocked ${dmWith}.`
						: "Write something..."}
					use:richInput={{
						uploadsUrl,
						disabled: userRestricted || recipientBlocked,
						onFiles: files => addAttachments(files),
					}}
					on:input={() => {
						updateInputMultiline();
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
					{#if !textOnly}
						<button
							class="send-files"
							title="Attach images"
							on:click|preventDefault={() => fileInput.click()}
							>+</button
						>
					{/if}
					<button
						type="button"
						class="send-files emoji-trigger"
						class:active={showEmojiPopup}
						title="Emoji & stickers"
						on:click={() => (showEmojiPopup = !showEmojiPopup)}
					>
						<span
							class="emoji-icon"
							style:--icon={`url(${emojiIcon})`}
							role="img"
							aria-label="Emoji"
						/>
					</button>
					<button
						bind:this={submitBtn}
						name="submit"
						disabled={!postInput || uploadsInProgress}
						title={uploadsInProgress ? "Waiting for uploads…" : ""}
						>Post</button
					>
				{/if}
				</div>
			</form>
			{#if showEmojiPopup}
				<div
					class="popup-overlay"
					on:click={() => (showEmojiPopup = false)}
				/>
				<EmojiPopup
					chatId={$chat._id}
					onEmoji={(name, emote) => {
						postInput.insert(`<:${emote._id}>`);
					}}
					onUnicode={ch => {
						postInput.insert(ch);
					}}
					onSticker={textOnly
						? null
						: id => {
								sendPost(
									"",
									[id],
									pendingReplies.map(r => r.post_id)
								);
								pendingReplies = [];
							}}
					onClose={() => (showEmojiPopup = false)}
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
				{#if serverGroups.heads[post.id]}
					<div class="item">
						<ServerPostGroup
							posts={serverGroups.heads[post.id].posts}
							actor={serverGroups.heads[post.id].actor}
						/>
					</div>
				{:else if !serverGroups.members.has(post.id)}
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
							{showJump}
							input={postInput}
							onReply={canPost
								? post => {
										if (
											pendingReplies.length < 10 &&
											!pendingReplies.find(
												r =>
													r.post_id === post.post_id
											)
										) {
											pendingReplies = [
												...pendingReplies,
												post,
											];
											postInput.focus();
										}
									}
								: undefined}
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
				{/if}
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
		flex-direction: column;
		align-items: stretch;
		margin-bottom: 0.5em;
		gap: 0.25em;
	}
	.composer-row {
		display: flex;
		align-items: stretch;
		gap: 0.25em;
	}
	/* the global -0.15rem bottom margin made the buttons taller than the box */
	.createpost > :global(*),
	.composer-row > :global(*) {
		margin: 0;
	}
	.composer-row > :global(button) {
		flex-shrink: 0;
		min-width: 2.75rem;
	}
	.composer-input {
		flex-grow: 1;
		min-width: 5em;
		min-height: 45px;
		max-height: 300px;
		overflow-y: auto;
		box-sizing: border-box;
		padding: 0.6em 1em;
		border: solid 2px var(--orange);
		border-radius: 5px;
		background-color: var(--background);
		color: var(--foreground);
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		outline: none;
		cursor: text;
		line-height: 1.4;
	}
	.composer-input:focus {
		border-radius: 2px;
	}
	.composer-input:global(.empty)::before {
		content: attr(data-placeholder);
		opacity: 0.5;
		pointer-events: none;
		display: block;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.composer-input:global(.disabled) {
		opacity: 0.6;
		cursor: default;
	}
	.composer-input :global(img.composer-emoji) {
		width: 1.35em;
		height: 1.35em;
		object-fit: contain;
		vertical-align: -0.3em;
		margin: 0 0.05em;
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
	.emoji-icon {
		display: inline-block;
		width: 1.6rem;
		height: 1.6rem;
		background-color: currentColor;
		-webkit-mask-image: var(--icon);
		mask-image: var(--icon);
		-webkit-mask-size: contain;
		mask-size: contain;
		-webkit-mask-repeat: no-repeat;
		mask-repeat: no-repeat;
		-webkit-mask-position: center;
		mask-position: center;
	}
	/* Narrow screens: slimmer buttons so the message box keeps its width */
	:global(main.layout-mobile) .send-files {
		padding-left: 0;
		padding-right: 0;
		font-size: 1.3rem;
	}
	:global(main.layout-mobile) .emoji-icon {
		width: 1.3rem;
		height: 1.3rem;
	}
	:global(main.layout-mobile) .createpost button[name="submit"] {
		padding-left: 0.6rem;
		padding-right: 0.6rem;
	}
	:global(main.layout-mobile) .createpost {
		gap: 0.2em;
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
		contain: inline-size;
		min-width: 0;
		max-width: 100%;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		gap: 0.5em;
		padding: 0.3em 0.3em 0.3em 0.5em;
		background-color: var(--background);
		border: solid 2px var(--orange);
		border-radius: 5px;
		font-size: 0.9em;
	}
	.pending-reply-label {
		flex-shrink: 0;
	}
	.pending-reply-text :global(*) {
		display: inline;
		margin: 0;
		padding: 0;
		white-space: nowrap;
		font-size: inherit;
		border: none;
	}
	.pending-reply-text :global(br) {
		display: none;
	}
	.pending-reply-text :global(img) {
		height: 1.2em;
		width: auto;
		vertical-align: middle;
	}
	.pending-reply-text {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		opacity: 0.8;
	}
	.pending-reply button.circle {
		flex-shrink: 0;
		width: 1.6em;
		height: 1.6em;
		min-width: 1.6em;
		min-height: 1.6em;
		margin: 0;
		border: none;
	}
	.also-post {
		display: inline-flex;
		align-items: center;
		gap: 0.4em;
		font-size: 85%;
		color: var(--gray, #888);
		cursor: pointer;
		user-select: none;
	}
	.also-post input {
		margin: 0;
		accent-color: var(--orange, #f97720);
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

	/* ---- new layout (opt-in): one composer card ---- */
	:global(main.layout-modern) .composer-pfp {
		display: inline-flex;
		align-items: center;
		align-self: center;
		flex-shrink: 0;
		border-radius: 35%;
		overflow: hidden;
	}
	:global(main.layout-modern) .createpost {
		align-items: stretch;
		gap: 0.4em;
		padding: 0.55em 0.7em;
		background-color: var(--surface);
		border: solid 1px var(--hairline);
		border-radius: 16px;
		transition: border-color 0.15s;
	}
	:global(main.layout-modern) .createpost:focus-within {
		border-color: var(--orange);
	}
	:global(main.layout-modern) .composer-row {
		align-items: center;
		gap: 0.4em;
	}
	:global(main.layout-modern) .composer-row > :global(button),
	:global(main.layout-modern) .composer-row > :global(*),
	:global(main.layout-modern) .composer-pfp {
		align-self: center;
		margin-top: 0;
		margin-bottom: 0;
	}
	:global(main.layout-modern) .composer-row.multiline > :global(button),
	:global(main.layout-modern) .composer-row.multiline .composer-pfp {
		align-self: flex-end;
	}
	:global(main.layout-modern.mode-light) .createpost {
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
	}
	:global(main.layout-modern) .composer-input {
		min-height: 1.6em;
		padding: 0.3em 0.2em;
		border: none;
		border-radius: 0;
		background: transparent;
	}
	:global(main.layout-modern) .composer-input:focus {
		border-radius: 0;
		outline: none !important;
		border: none !important;
		box-shadow: none !important;
	}
	:global(main.layout-modern) .send-files,
	:global(main.layout-modern) .emoji-trigger {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.2em;
		height: 2.2em;
		min-width: 0;
		padding: 0;
		border: none;
		border-radius: 50%;
		background: transparent;
		color: var(--foreground);
		font-size: 1.4rem;
	}
	:global(main.layout-modern.layout-mobile) .composer-pfp {
		display: none;
	}
	:global(main.layout-modern.layout-mobile) .send-files,
	:global(main.layout-modern.layout-mobile) .emoji-trigger {
		width: 1.9em;
		height: 1.9em;
		font-size: 1.15rem;
	}
	:global(main.layout-modern.layout-mobile) .createpost button[name="submit"] {
		padding: 0.3em 0.8em;
	}
	:global(main.layout-modern) .send-files:hover,
	:global(main.layout-modern) .emoji-trigger:hover,
	:global(main.layout-modern) .emoji-trigger.active {
		background-color: var(--surface-2);
	}
	:global(main.layout-modern) .emoji-icon {
		width: 1.3rem;
		height: 1.3rem;
	}
	:global(main.layout-modern) .createpost button[name="submit"] {
		min-width: 0;
		padding: 0.35em 1.1em;
		border: none;
		border-radius: 999px;
		background-color: var(--orange);
		color: var(--foreground-orange);
		font-weight: bold;
	}
	:global(main.layout-modern) .createpost button[name="submit"]:disabled {
		opacity: 0.5;
	}

	/* Attachment tray (instant image uploads) */
	.attach-tray {
		flex: 0 0 100%;
		display: flex;
		gap: 0.5em;
		overflow-x: auto;
		padding: 0.25em 0.5em;
		scrollbar-width: thin;
	}
	.attach-item {
		position: relative;
		flex: 0 0 auto;
		width: 64px;
		height: 64px;
		border-radius: 8px;
		border: solid 2px var(--orange);
		overflow: visible;
	}
	.attach-item img,
	.attach-item video {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: 6px;
		display: block;
	}
	.attach-play {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		text-shadow: 0 0 4px rgba(0, 0, 0, 0.7);
		pointer-events: none;
	}
	.attach-item.uploading img,
	.attach-item.uploading video {
		opacity: 0.55;
	}
	.attach-progress {
		position: absolute;
		inset: -2px;
		border-radius: 50%;
		background: conic-gradient(
			var(--orange) calc(var(--p) * 1turn),
			transparent 0
		);
		-webkit-mask: radial-gradient(
			farthest-side,
			transparent calc(100% - 5px),
			#000 calc(100% - 4px)
		);
		mask: radial-gradient(
			farthest-side,
			transparent calc(100% - 5px),
			#000 calc(100% - 4px)
		);
		pointer-events: none;
	}
	.attach-item.failed img,
	.attach-item.failed video {
		opacity: 0.35;
	}
	.attach-retry {
		position: absolute;
		inset: 0;
		margin: auto;
		height: fit-content;
		width: fit-content;
		font-size: 0.6em;
		padding: 0.3em 0.5em;
		border: none;
		border-radius: 1em;
		background-color: var(--orange);
		color: var(--foreground-orange);
		cursor: pointer;
	}
	.attach-remove {
		position: absolute;
		top: -6px;
		right: -6px;
		width: 18px;
		height: 18px;
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
		border-radius: 50%;
		background-color: var(--orange);
		color: var(--foreground-orange);
		cursor: pointer;
	}
	.attach-error {
		flex: 0 0 100%;
		margin: 0.2em 0.5em;
		font-size: 0.85em;
		color: crimson;
	}
	:global(main.layout-modern) .attach-tray {
		padding: 0.6em 0.85em 0;
	}
	:global(main.layout-modern) .attach-item {
		border: solid 1px var(--hairline);
		border-radius: 12px;
		background-color: var(--surface-2);
	}
	:global(main.layout-modern) .attach-item img {
		border-radius: 11px;
	}
	:global(main.layout-modern) .attach-remove {
		background-color: var(--surface-2);
		color: var(--foreground);
		border: solid 1px var(--hairline);
	}
	:global(main.layout-modern) .attach-error {
		margin: 0.3em 1em 0;
	}
</style>
