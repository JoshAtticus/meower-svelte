<!--
	Home but it's a group chat.
-->
<script>
	import BasicModal from "../../lib/modals/Basic.svelte";
	import ConfirmDMRequestModal from "../../lib/modals/chats/ConfirmDMRequest.svelte";
	import ChangeChatNicknameModal from "../../lib/modals/chats/ChangeChatNickname.svelte";
	import GCMemberModal from "../../lib/modals/chats/GCMember.svelte";
	import ChatIcon from "../../lib/ChatIcon.svelte";
	import FormattedDate from "../../lib/FormattedDate.svelte";
	import ViewPinsModal from "../../lib/modals/chats/ViewPins.svelte";
	import AddMemberModeModal from "../../lib/modals/chats/AddMember_Mode.svelte";
	import AccountBannedModal from "../../lib/modals/safety/AccountBanned.svelte";
	import ModerateChatModal from "../../lib/modals/moderation/ModerateChat.svelte";

	import {authHeader, chats, user, chat} from "../../lib/stores.js";
	import {
		adminPermissions,
		hasPermission,
		userRestrictions,
		isRestricted,
	} from "../../lib/bitField.js";
	import {apiUrl} from "../../lib/urls.js";
	import {has as hasChatPerm, highestRole, nameColorStyle} from "../../lib/chatPermissions.js";
	import {portal} from "../../lib/portal.js";
	import {swipeDismiss} from "../../lib/swipeDismiss.js";
	import * as modals from "../../lib/modals.js";
	import {mobile} from "../../lib/responsiveness.js";
	import {markChatRead} from "../../lib/unread.js";
	import ProfileView from "../../lib/ProfileView.svelte";
	import Member from "../../lib/Member.svelte";
	import Container from "../../lib/Container.svelte";
	import * as clm from "../../lib/clmanager.js";
	import PostList from "../../lib/PostList.svelte";

	import {params, goto} from "@roxi/routify";
	import {onMount, onDestroy} from "svelte/internal";

	let chatsStoreSubscription;

	let showMembers = !$mobile;
	let headerMenuOpen = false;

	let pendingInvites = [];
	let invitesEvent = null;

	$: myBan = ($chat.bans || []).find(
		ban => ban.username === $user.name
	);

	$: currentLastActive = ($chats.find(c => c._id === $chat._id) || {})
		.last_active;
	$: if (!$params.admin && $chat._id && $chat._id !== "livechat") {
		markChatRead(
			$chat._id,
			Math.max(Math.floor(Date.now() / 1000), currentLastActive || 0)
		);
	}

	const SETTINGS_PERMS = [
		"change_name", "change_color", "change_icon", "delete_icon",
		"add_emotes", "edit_emotes", "delete_emotes",
		"modify_roles", "create_roles", "delete_roles", "assign_roles",
		"change_settings", "toggle_invites", "ban_members",
	];
	$: isGroupChat = $chat.type === 0 && $chat._id !== "livechat";
	$: canOpenSettings =
		isGroupChat &&
		SETTINGS_PERMS.some(p => hasChatPerm($chat, $user.name, p));
	$: canSend = !isGroupChat || hasChatPerm($chat, $user.name, "send_messages");
	$: canInvite =
		isGroupChat &&
		hasChatPerm($chat, $user.name, "invite_members") &&
		($chat.invites_enabled !== false ||
			hasChatPerm($chat, $user.name, "toggle_invites"));

	$: dmRequest = $chat.type === 1 ? $chat.dm_request : null;
	$: dmOther = $chat.members.filter(m => m !== $user.name)[0];
	$: dmWaiting = dmRequest && dmRequest.from === $user.name;
	$: dmRecipient = dmRequest && dmRequest.from && dmRequest.to === $user.name;

	async function acceptDMRequest() {
		try {
			const resp = await fetch(
				`${apiUrl}chats/${$chat._id}/dm_request/accept`,
				{method: "POST", headers: $authHeader}
			);
			if (!resp.ok) {
				throw new Error(
					"Response code is not OK; code is " + resp.status
				);
			}
			chat.set(await resp.json());
		} catch (e) {
			modals.showModal(BasicModal, {
				title: "Failed to respond to message request",
				desc: `${e}`,
			});
		}
	}

	async function ignoreDMRequest() {
		modals.showModal(ConfirmDMRequestModal, {
			mode: "ignore",
			username: dmRequest.from,
			chatId: $chat._id,
		});
	}

	async function blockAndIgnoreDMRequest() {
		modals.showModal(ConfirmDMRequestModal, {
			mode: "block",
			username: dmRequest.from,
			chatId: $chat._id,
		});
	}

	async function loadInvites() {
		if (
			$params.admin ||
			!$chat._id ||
			$chat._id === "livechat" ||
			$chat.type !== 0 ||
			!showMembers
		) {
			pendingInvites = [];
			return;
		}
		try {
			const resp = await fetch(
				`${apiUrl}chats/${$chat._id}/invites`,
				{headers: $authHeader}
			);
			pendingInvites = resp.ok ? (await resp.json()).autoget : [];
		} catch (e) {
			pendingInvites = [];
		}
	}

	$: if (showMembers !== undefined && $chat._id && $chat.members)
		loadInvites();

	onMount(async () => {
		invitesEvent = clm.link.on("direct", cmd => {
			if (
				cmd.val.mode === "chat_invites_update" &&
				cmd.val.payload.chat_id === $chat._id
			) {
				loadInvites();
			}
		});

		if ($params.chatid === "livechat") {
			chat.set({
				_id: "livechat",
				type: 0,
				nickname: "Livechat",
				owner: "",
				members: [],
				created: 0,
				last_active: 0,
				deleted: false,
			});
		} else if ($params.admin) {
			try {
				const resp = await fetch(
					`${apiUrl}admin/chats/${$params.chatid}`,
					{
						headers: $authHeader,
					}
				);
				if (!resp.ok) {
					throw new Error(
						"Response code is not OK; code is " + resp.status
					);
				}
				chat.set(await resp.json());
			} catch (e) {
				modals.showModal(BasicModal, {
					title: "Failed getting chat",
					desc: `Error while getting chat ${$params.chatid}: ${e}`,
				});
			}
		} else {
			chatsStoreSubscription = chats.subscribe(async _chats => {
				let _chat = $chats.find(_chat => _chat._id === $params.chatid);
				if (_chat) {
					chat.set(_chat);
				} else if ($chat._id) {
					$goto("/chats");
				} else {
					try {
						const resp = await fetch(
							`${apiUrl}chats/${$params.chatid}`,
							{
								headers: $authHeader,
							}
						);
						if (!resp.ok) {
							if (resp.status === 404) {
								throw new Error(
									`The chat you requested (${$params.chatid}) doesn't exist or you don't have access to it.`
								);
							}
							throw new Error(
								"Response code is not OK; code is " +
									resp.status
							);
						}
						chat.set(await resp.json());
					} catch (e) {
						modals.showModal(BasicModal, {
							title: "Failed getting chat",
							desc: e,
						});
						$goto("/chats");
					}
				}
			});
		}
	});

	onDestroy(() => {
		if (chatsStoreSubscription) chatsStoreSubscription();
		if (invitesEvent) clm.link.off(invitesEvent);

		chat.set({
			_id: "",
			type: 0,
			nickname: "",
			owner: "",
			members: [],
			created: 0,
			last_active: 0,
			deleted: false,
		});
	});
</script>

<!--
	so {cmd: direct, val: {cmd: add_to_chat, val: {chatid: "", username: ""}}}?
	also  remove_from_chat
-->

<div class="groupchat">
	<div id="chat" class:active={!showMembers}>
		{#if $chat.type === 0}
			<Container>
				<h1 class="chat-name">
					<ChatIcon chat={$chat} size={0.7} />
					{$chat.nickname}
					{#if $params.admin}
						<span class="chat-id">(<code>{$params.chatid}</code>)</span>
					{/if}
				</h1>
				{#if $params.admin && $chat.deleted}
					<p style="margin-bottom: 0; color: crimson;">
						<b
							>This chat is currently soft-deleted! No one can
							access it other than admins while it's soft-deleted.
							To restore it, open the chat mod panel and click
							'Restore chat'.</b
						>
					</p>
				{/if}
				{#if $chat._id !== "livechat"}
					{#if $mobile}
						<button
							class="circle more mobile-more"
							title="More"
							on:click={() => (headerMenuOpen = true)}
						/>
						{#if headerMenuOpen}
							<div
								class="sheet-overlay"
								use:portal
								on:click={() => (headerMenuOpen = false)}
							/>
						{/if}
					{/if}
					<div
						class="settings-controls"
						class:action-sheet={$mobile}
						use:portal={$mobile}
						use:swipeDismiss={{
							enabled: $mobile && headerMenuOpen,
							onDismiss: () => (headerMenuOpen = false),
						}}
						class:open={headerMenuOpen}
						on:click={() => {
							if ($mobile) setTimeout(() => (headerMenuOpen = false));
						}}
					>
						{#if $params.admin}
							<button
								class="circle admin"
								title="Moderate chat"
								disabled={!$chat._id}
								on:click={() =>
									modals.showModal(ModerateChatModal)}
							/>
						{/if}
						{#if canOpenSettings || ($params.admin && hasPermission(adminPermissions.EDIT_CHATS))}
							<button
								class="circle settings"
								title="Group chat settings"
								on:click={() => {
									if (
										isRestricted(
											userRestrictions.EDITING_CHAT_NICKNAMES
										) &&
										!$params.admin
									) {
										modals.showModal(AccountBannedModal, {
											ban: $user.ban,
											feature:
												"editing group chat nicknames",
										});
									} else {
										modals.showModal(
											ChangeChatNicknameModal
										);
									}
								}}
							/>
						{/if}
						{#if !$params.admin}
							<button
								class="circle pin"
								title="View pinned posts"
								on:click={() =>
									modals.showModal(ViewPinsModal)}
							/>
						{/if}
						<button
							class="circle members"
							title="Members"
							on:click={() => (showMembers = !showMembers)}
						/>
					</div>
				{/if}
			</Container>
		{:else if $chat.type === 1}
			{#if $params.admin}
				<Container>
					<h1 class="chat-name">
						DM between {$chat.members[0]} & {$chat.members[1]}
						<span class="chat-id"
							>(<code>{$params.chatid}</code>)</span
						>
					</h1>
					{#if $chat.deleted}
						<p style="margin-bottom: 0; color: crimson;">
							<b
								>This chat is currently soft-deleted! No one can
								access it other than admins while it's
								soft-deleted. To restore it, open the chat mod
								panel and click 'Restore chat'.</b
							>
						</p>
					{/if}
					<div class="settings-controls">
						<button
							class="circle admin"
							disabled={!$chat._id}
							on:click={() => modals.showModal(ModerateChatModal)}
						/>
					</div>
				</Container>
			{:else}
				<ProfileView
					username={$chat.members.filter(
						username =>
							username !==
							($params.user ? $params.user : $user.name)
					)[0]}
					small={true}
					canClick={true}
				/>
			{/if}
		{/if}
		{#if myBan}
			<Container>
				<p style="margin: 0; color: crimson;">
					<b>You have been banned from this chat.</b>
					{#if myBan.expires}
						The ban expires <FormattedDate date={myBan.expires} />.
					{/if}
					You can still view messages, but you cannot post.
				</p>
			</Container>
		{/if}
		{#if dmRecipient}
			<Container>
				<p class="dm-request">
					<b>@{dmRequest.from}</b> sent you a message request.
				</p>
				<div class="dm-request-actions">
					<button on:click={ignoreDMRequest}>Ignore</button>
					<button on:click={blockAndIgnoreDMRequest}>Block</button>
					<button on:click={acceptDMRequest}>Accept</button>
				</div>
			</Container>
		{:else if dmRequest && !dmRequest.from}
			<Container>
				<p class="dm-request">
					You can send 1 message (no images) as a message request.
					<b>@{dmOther}</b> will need to accept it before you can keep
					chatting.
				</p>
			</Container>
		{:else if dmWaiting}
			<Container>
				<p class="dm-request">
					Message request sent. You can keep chatting once
					<b>@{dmOther}</b> accepts.
				</p>
			</Container>
		{/if}
		{#if $chat.type === 1 && $chat.block_notice && $chat.block_notice !== $user.name}
			<p class="block-notice">
				You can no longer send messages to this user because
				they've blocked you.
			</p>
		{/if}
		{#if isGroupChat && !canSend}
			<p class="block-notice">
				You don't have permission to send messages here.
			</p>
		{/if}
		<PostList
			fetchUrl={$params.chatid === "livechat"
				? null
				: $params.admin
				? `admin/chats/${$params.chatid}/posts`
				: `posts/${$params.chatid}`}
			postOrigin={$params.admin ? "" : $params.chatid}
			chatName={$chat.nickname}
			textOnly={!!(dmRequest && !dmRequest.from)}
			canPost={($chat._id === "livechat" || !$params.admin) &&
				!myBan &&
				!dmWaiting &&
				canSend &&
				!($chat.block_notice && $chat.block_notice !== $user.name)}
		/>
	</div>
	{#if showMembers && $chat._id !== "livechat" && $chat.type === 0}
		{#if $mobile}
			<div class="sheet-overlay" on:click={() => (showMembers = false)} />
		{/if}
		<div
			id="members"
			use:swipeDismiss={{
				enabled: $mobile,
				onDismiss: () => (showMembers = false),
			}}
		>
			<div id="members-inner">
				{#each $chat.members as chatmember}
					{@const memberRole = highestRole($chat, chatmember)}
					<button
						class="member-button"
						on:click={() => {
							modals.showModal(GCMemberModal, {
								username: chatmember,
							});
						}}
					>
						<Member
							member={chatmember}
							owner={chatmember === $chat.owner}
							nameStyle={nameColorStyle($chat, chatmember)}
							role={memberRole && memberRole._id !== "default"
								? memberRole.name
								: ""}
						/>
					</button>
				{/each}
				{#if pendingInvites.length}
					<h3 class="invites-title">
						Pending <span class="small"
							>({pendingInvites.length})</span
						>
					</h3>
					{#each pendingInvites as invite}
						<div class="member-button pending-invite">
							<Member member={invite.to} owner={false} />
							{#if invite.from === $user.name || hasChatPerm($chat, $user.name, "remove_members")}
								<button
									class="circle close revoke-invite"
									title="Revoke invite"
									on:click={async () => {
										await fetch(
											`${apiUrl}invites/${invite._id}`,
											{
												method: "DELETE",
												headers: $authHeader,
											}
										);
										loadInvites();
									}}
								/>
							{/if}
						</div>
					{/each}
				{/if}
			</div>
			<div class="top">
				<h2 class="members-title">
					Members <span class="small">({$chat.members.length})</span>
				</h2>
				<div class="settings-controls">
					{#if !$params.admin && canInvite}
						<button
							class="circle plus"
							on:click={() => {
								if (
									isRestricted(userRestrictions.NEW_CHATS)
								) {
									modals.showModal(AccountBannedModal, {
										ban: $user.ban,
										feature:
											"adding members to group chats",
									});
								} else if ($chat.members.length >= 256) {
									modals.showModal(BasicModal, {
										title: "Too many cats!",
										desc: "This chat has reached the maximum member limit of 256! You may not add anymore members until there are fewer than 256 members.",
									});
								} else {
									modals.showModal(AddMemberModeModal);
								}
							}}
						/>
					{/if}
					{#if $mobile && $chat._id !== "livechat"}
						<button
							class="circle join"
							on:click={() => (showMembers = !showMembers)}
						/>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.member-button {
		padding: 0;
		margin: 0;

		width: 100%;

		background-color: transparent;
		color: var(--foreground);
		border: none;

		position: relative;
		text-align: left;
	}

	/* repetition because of CSS specificity */
	:global(main.input-hover) .member-button.member-button:hover,
	.member-button.member-button:focus-visible {
		background-color: #7773;
	}
	:global(#main) .member-button.member-button:active {
		background-color: #7776;
	}
	.pending-invite {
		opacity: 0.65;
		display: flex;
		align-items: center;
	}
	.revoke-invite {
		margin-left: auto;
		margin-right: 0.25em;
		flex-shrink: 0;
		min-width: 1.6em;
		min-height: 1.6em;
	}
	.dm-request {
		margin: 0;
	}
	.dm-request-actions {
		display: flex;
		gap: 0.5em;
		margin-top: 0.5em;
	}
	.block-notice {
		margin: 0.4em 0;
		font-size: 0.85em;
		opacity: 0.75;
		text-align: center;
	}

	.invites-title {
		margin: 0.5em 0 0.25em 0.25em;
		font-size: 1.1em;
		opacity: 0.8;
	}

	.groupchat {
		display: flex;
		flex-wrap: nowrap;
		flex-direction: row;
		gap: 0.4em;
	}
	#chat {
		flex-shrink: 1;
		flex-grow: 1;
		overflow: hidden;
	}
	#members {
		height: var(--view-height);
		width: min(45%, 12em);

		background-color: var(--background);
		border: solid 2px var(--orange);
		border-radius: 5px;
		box-sizing: border-box;

		position: sticky;
		top: 0;

		flex-shrink: 0;
		flex-grow: 0;
	}
	/* Mobile: members slide up as a bottom sheet over the chat */
	:global(#main.layout-mobile) #members {
		position: fixed;
		top: auto;
		left: 0;
		right: 0;
		bottom: 0;
		width: 100%;
		height: 70vh;
		z-index: 10003;
		border-bottom: none;
		border-radius: 1em 1em 0 0;
		animation: members-up 0.25s ease;
	}
	@keyframes members-up {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}
	#members-inner {
		position: relative;

		overflow-y: auto;
		overflow-x: hidden;
		overscroll-behavior: none;

		height: calc(100% - 2.25em);
		margin-top: 2.25em;
	}

	.top {
		position: absolute;
		top: 0;
		width: 100%;
	}

	.chat-name {
		margin: 0;
		display: flex;
		align-items: center;
		gap: 0.4em;
	}
	.chat-id {
		font-weight: normal;
		color: #7f7f7f;
		font-size: 1rem;
	}

	.settings-controls {
		position: absolute;
		top: 0.25em;
		right: 0.25em;
		display: flex;
		gap: 0.25em;
	}
	.members-title {
		margin: 0.25em;
	}

	.small {
		font-size: 75%;
	}
	:global(#main.layout-mobile) #members::before {
		content: "";
		position: absolute;
		top: 0.3em;
		left: 50%;
		transform: translateX(-50%);
		z-index: 2;
		width: 2.5em;
		height: 0.3em;
		border-radius: 1em;
		background-color: var(--orange);
		opacity: 0.6;
	}
</style>
