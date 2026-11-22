<script context="module">
	// Only one modal renders at a time, so confirmations opened from here
	// remount this modal; remember the tab so it reopens where it was.
	let lastTab = "general";
	let lastChatId = null;
</script>

<script>
	import Modal from "../../Modal.svelte";
	import ChatIcon from "../../ChatIcon.svelte";
	import Member from "../../Member.svelte";
	import FormattedDate from "../../FormattedDate.svelte";
	import BasicModal from "../Basic.svelte";
	import ConfirmActionModal from "../ConfirmAction.svelte";

	import {authHeader, chat, user} from "../../stores.js";
	import {apiUrl, uploadsUrl} from "../../urls.js";
	import {chatEmotes, refreshEmotes} from "../../emotes.js";
	import {adminPermissions, hasPermission} from "../../bitField.js";
	import {
		PERMISSIONS,
		OWNER_RANK,
		ADMIN_TIER,
		has as hasChatPerm,
		rank as chatRank,
		canManageRole,
		canGrantPerm,
		inheritsPerm,
		colorsStyle,
	} from "../../chatPermissions.js";
	import * as modals from "../../modals.js";

	import {focus, params} from "@roxi/routify";
	import {onMount} from "svelte";

	const isAdmin = () =>
		$params.admin && hasPermission(adminPermissions.EDIT_CHATS);
	const canPerm = perm =>
		isAdmin() || hasChatPerm($chat, $user.name, perm);
	const anyPerm = perms => isAdmin() || perms.some(canPerm);

	const GENERAL_PERMS = [
		"change_name", "change_color", "change_icon", "delete_icon",
		"change_settings", "toggle_invites",
	];
	const EMOTE_PERMS = ["add_emotes", "edit_emotes", "delete_emotes"];
	const ROLE_PERMS = ["modify_roles", "create_roles", "delete_roles"];

	// A plain function so it can run during component setup (reactive
	// declarations aren't evaluated until after the instance script runs)
	const computeTabVisible = () => ({
		general: anyPerm(GENERAL_PERMS),
		emojis: anyPerm(EMOTE_PERMS),
		stickers: anyPerm(EMOTE_PERMS),
		roles: anyPerm(ROLE_PERMS),
		bans: anyPerm(["ban_members"]),
	});
	const firstVisible = visible =>
		["general", "emojis", "stickers", "roles", "bans"].find(t => visible[t]) ||
		"general";
	$: tabVisible = ($chat, $user, computeTabVisible());
	$: firstVisibleTab = firstVisible(tabVisible);

	const initialVisible = computeTabVisible();
	let tab =
		$chat._id === lastChatId && initialVisible[lastTab]
			? lastTab
			: firstVisible(initialVisible);
	lastChatId = $chat._id;
	$: lastTab = tab;
	$: if (!tabVisible[tab]) tab = firstVisibleTab;

	let nickname = $chat.nickname;
	let loading, error;

	let fileInput, uploading;
	let emoteFileInput;
	let emoteName = "";
	let emoteFile = null;
	let emotePreview = "";

	$: emoteNameValid = /^[A-Za-z0-9_-]{1,32}$/.test(emoteName);

	function chooseEmoteFile() {
		const file = emoteFileInput.files[0];
		if (!file) return;
		if (emotePreview) URL.revokeObjectURL(emotePreview);
		emoteFile = file;
		emotePreview = URL.createObjectURL(file);
	}

	function clearEmoteFile() {
		if (emotePreview) URL.revokeObjectURL(emotePreview);
		emoteFile = null;
		emotePreview = "";
		emoteName = "";
		if (emoteFileInput) emoteFileInput.value = "";
	}
	let emoteUploading = false;

	$: emotes = $chatEmotes[$chat._id] || {emojis: [], stickers: []};

	$: {
		if (
			!$params.admin &&
			![...GENERAL_PERMS, ...EMOTE_PERMS, ...ROLE_PERMS, "ban_members"].some(canPerm)
		) {
			modals.closeLastModal();
		}
	}

	onMount(() => refreshEmotes($chat._id));

	async function patchChat(body) {
		const resp = await fetch(`${apiUrl}chats/${$chat._id}`, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				...$authHeader,
			},
			body: JSON.stringify(body),
		});
		if (!resp.ok) {
			if (resp.status === 429) {
				throw new Error("Too many requests! Try again later.");
			}
			throw new Error("Response code is not OK; code is " + resp.status);
		}
	}

	async function uploadIcon() {
		const file = fileInput.files[0];
		if (!file) return;
		uploading = true;
		try {
			const form = new FormData();
			form.append("file", file);
			const resp = await fetch(`${uploadsUrl}icons`, {
				method: "POST",
				headers: {Authorization: $authHeader.token},
				body: form,
			});
			if (!resp.ok) {
				if (resp.status === 413) {
					throw new Error("That image is too large.");
				}
				throw new Error(
					"Response code is not OK; code is " + resp.status
				);
			}
			const uploaded = await resp.json();
			await patchChat({icon: uploaded.id});
		} catch (e) {
			modals.showModal(BasicModal, {
				title: "Failed to upload chat icon",
				desc: `${e}`,
			});
		} finally {
			uploading = false;
		}
	}

	async function uploadEmote(type) {
		const file = emoteFile;
		if (!file || !emoteNameValid) return;
		emoteUploading = true;
		try {
			const form = new FormData();
			form.append("file", file);
			const resp = await fetch(`${uploadsUrl}${type}`, {
				method: "POST",
				headers: {Authorization: $authHeader.token},
				body: form,
			});
			if (!resp.ok) {
				if (resp.status === 413) {
					throw new Error("That image is too large.");
				}
				throw new Error(
					"Response code is not OK; code is " + resp.status
				);
			}
			const uploaded = await resp.json();
			const claim = await fetch(
				`${apiUrl}chats/${$chat._id}/${type}/${uploaded.id}`,
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						...$authHeader,
					},
					body: JSON.stringify({name: emoteName}),
				}
			);
			if (!claim.ok) {
				const json = await claim.json().catch(() => ({}));
				throw new Error(
					json.type === "nameTaken"
						? "That name is already used in this chat."
						: json.type ||
								"Response code is not OK; code is " + claim.status
				);
			}
			clearEmoteFile();
			await refreshEmotes($chat._id);
			$chat[type] = emotes[type];
		} catch (e) {
			modals.showModal(BasicModal, {
				title: `Failed to upload ${type.slice(0, -1)}`,
				desc: `${e}`,
			});
		} finally {
			emoteUploading = false;
		}
	}

	let renameErrors = {};

	let idCopied = false;
	async function copyChatId() {
		try {
			await navigator.clipboard.writeText($chat._id);
			idCopied = true;
			setTimeout(() => (idCopied = false), 2000);
		} catch {}
	}

	async function renameEmote(type, emote, name) {
		name = name.trim();
		if (name === emote.name) return;
		if (!/^[A-Za-z0-9_-]{1,32}$/.test(name)) {
			renameErrors = {...renameErrors, [emote._id]: true};
			return;
		}
		try {
			const resp = await fetch(
				`${apiUrl}chats/${$chat._id}/${type}/${emote._id}`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
						...$authHeader,
					},
					body: JSON.stringify({name}),
				}
			);
			if (!resp.ok) {
				const json = await resp.json().catch(() => ({}));
				throw new Error(
					json.type === "nameTaken"
						? "That name is already used in this chat."
						: "Response code is not OK; code is " + resp.status
				);
			}
			delete renameErrors[emote._id];
			renameErrors = renameErrors;
			await refreshEmotes($chat._id);
			$chat[type] = emotes[type];
		} catch (e) {
			modals.showModal(BasicModal, {
				title: `Failed to rename ${type.slice(0, -1)}`,
				desc: `${e}`,
			});
		}
	}

	async function deleteEmote(type, emoteId) {
		const resp = await fetch(
			`${apiUrl}chats/${$chat._id}/${type}/${emoteId}`,
			{method: "DELETE", headers: $authHeader}
		);
		if (!resp.ok) {
			throw new Error("Response code is not OK; code is " + resp.status);
		}
		await refreshEmotes($chat._id);
		$chat[type] = emotes[type];
	}

	// Roles tab
	let newRoleName = "";
	let newRoleTier = 0;
	let expandedRole = null;

	$: myRank = chatRank($chat, $user.name);
	$: creatableTiers = [-1, 0, 1, 2, 3].filter(
		t =>
			t === -1 ||
			isAdmin() ||
			$user.name === $chat.owner ||
			myRank >= ADMIN_TIER ||
			t < myRank
	);
	$: settableTiers = [-1, 0, 1, 2, 3, 4].filter(
		t => t === -1 || $user.name === $chat.owner || t < myRank
	);
	const tierLabel = t => (t === -1 ? "Cosmetic" : `Tier ${t}`);
	$: sortedRoles = ($chat.roles || [])
		.map((role, i) => ({role, i}))
		.sort((a, b) => b.role.tier - a.role.tier || a.i - b.i)
		.map(({role}) => role);
	const memberCount = role =>
		Object.values($chat.member_roles || {}).filter(list =>
			list.includes(role._id)
		).length;
	$: permsForTier = tier =>
		PERMISSIONS.filter(p => p.tier <= tier).reduce(
			(groups, perm) => {
				(groups[perm.tier] = groups[perm.tier] || []).push(perm);
				return groups;
			},
			{}
		);

	function friendlyRoleError(type, status) {
		return (
			{
				missingPermission: "You don't have permission to do that.",
				insufficientRank:
					"You can't manage someone ranked at or above you.",
				permissionAboveRoleTier:
					"That permission is above this role's tier.",
				notCosmetic:
					"Only cosmetic roles can override the display.",
				tierLocked: "The Administrator role's tier can't change.",
			}[type] || `Response code is not OK; code is ${status}`
		);
	}

	async function createRole() {
		const resp = await fetch(`${apiUrl}chats/${$chat._id}/roles`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...$authHeader,
			},
			body: JSON.stringify({
				name: newRoleName.trim(),
				tier: Number(newRoleTier),
				permissions: {},
			}),
		});
		if (!resp.ok) {
			const json = await resp.json().catch(() => ({}));
			throw new Error(friendlyRoleError(json.type, resp.status));
		}
		newRoleName = "";
	}

	async function patchRole(roleId, body) {
		const resp = await fetch(
			`${apiUrl}chats/${$chat._id}/roles/${roleId}`,
			{
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					...$authHeader,
				},
				body: JSON.stringify(body),
			}
		);
		if (!resp.ok) {
			const json = await resp.json().catch(() => ({}));
			throw new Error(friendlyRoleError(json.type, resp.status));
		}
	}

	async function deleteRole(roleId) {
		const resp = await fetch(
			`${apiUrl}chats/${$chat._id}/roles/${roleId}`,
			{method: "DELETE", headers: $authHeader}
		);
		if (!resp.ok) {
			const json = await resp.json().catch(() => ({}));
			throw new Error(friendlyRoleError(json.type, resp.status));
		}
		if (expandedRole === roleId) expandedRole = null;
	}

	function roleModalError(e) {
		modals.showModal(BasicModal, {
			title: "Failed to update role",
			desc: `${e}`,
		});
	}

	async function renameRole(role, name) {
		name = name.trim();
		if (!name || name === role.name) return;
		try {
			await patchRole(role._id, {name});
		} catch (e) {
			roleModalError(e);
		}
	}

	$: activeBans = ($chat.bans || []).filter(
		ban => ban.expires === null || ban.expires * 1000 > Date.now()
	);
	let unbanning = {};
	async function unban(username) {
		unbanning = {...unbanning, [username]: true};
		try {
			const resp = await fetch(
				`${apiUrl}chats/${$chat._id}/bans/${username}`,
				{method: "DELETE", headers: $authHeader}
			);
			if (!resp.ok) {
				const json = await resp.json().catch(() => ({}));
				throw new Error(friendlyRoleError(json.type, resp.status));
			}
			$chat.bans = ($chat.bans || []).filter(b => b.username !== username);
		} catch (e) {
			modals.showModal(BasicModal, {
				title: `Failed to unban ${username}`,
				desc: `${e.message || e}`,
			});
		}
		delete unbanning[username];
		unbanning = unbanning;
	}

	async function setRoleColors(role, colors) {
		try {
			await patchRole(role._id, {colors});
		} catch (e) {
			roleModalError(e);
		}
	}

	async function setRolePerm(role, permKey, value) {
		try {
			await patchRole(role._id, {permissions: {[permKey]: value}});
		} catch (e) {
			roleModalError(e);
		}
	}
</script>

<Modal on:close={modals.closeLastModal}>
	<h2 slot="header">Group Chat Settings</h2>
	<div slot="default">
		<div class="tabs">
			{#if tabVisible.general}
				<button
					class:active={tab === "general"}
					on:click={() => (tab = "general")}>General</button
				>
			{/if}
			{#if tabVisible.emojis}
				<button
					class:active={tab === "emojis"}
					on:click={() => (tab = "emojis")}>Emojis</button
				>
			{/if}
			{#if tabVisible.stickers}
				<button
					class:active={tab === "stickers"}
					on:click={() => (tab = "stickers")}>Stickers</button
				>
			{/if}
			{#if tabVisible.roles}
				<button
					class:active={tab === "roles"}
					on:click={() => (tab = "roles")}>Roles</button
				>
			{/if}
			{#if tabVisible.bans}
				<button
					class:active={tab === "bans"}
					on:click={() => (tab = "bans")}>Bans</button
				>
			{/if}
		</div>

		{#if tab === "general"}
			<div class="icon-section">
				<ChatIcon chat={$chat} size={1.4} />
				<div class="icon-controls">
					<input
						type="file"
						accept="image/*"
						bind:this={fileInput}
						on:change={uploadIcon}
						disabled={uploading}
						hidden
					/>
					{#if canPerm("change_icon")}
						<button
							disabled={uploading}
							on:click={() => fileInput.click()}
						>
							{uploading ? "Uploading..." : "Upload icon"}
						</button>
					{/if}
					{#if $chat.icon && canPerm("delete_icon")}
						<button on:click={() => patchChat({icon: ""})}
							>Remove icon</button
						>
					{/if}
					{#if canPerm("change_color")}
						<label class="icon-color">
							<input
								type="color"
								value={`#${$chat.icon_color || "000000"}`}
								on:change={e =>
									patchChat({
										icon_color: e.target.value.substring(1),
									})}
							/>
							Icon colour
						</label>
					{/if}
				</div>
			</div>

			{#if canPerm("change_name")}
			<form
				on:change={() => (error = "")}
				on:submit|preventDefault={async () => {
					loading = true;
					try {
						const resp = await fetch(
							`${apiUrl}${$params.admin ? "admin/" : ""}chats/${
								$chat._id
							}`,
							{
								method: "PATCH",
								headers: {
									"Content-Type": "application/json",
									...$authHeader,
								},
								body: JSON.stringify({nickname: nickname}),
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
						if ($params.admin) {
							$chat = await resp.json();
						}
						modals.closeLastModal();
					} catch (e) {
						loading = false;
						error = e;
					}
				}}
			>
				<label
					for="nickname"
					style={error ? "color: crimson;" : ""}
					><b>Chat Nickname</b>
					{#if error}<i>- {error}</i>{/if}</label
				>
				<input
					id="nickname"
					type="text"
					class="modal-input white"
					placeholder="Chat Nickname"
					maxlength="32"
					disabled={loading}
					bind:value={nickname}
					use:focus
				/><br />
				<br />
				<div class="modal-buttons">
					<button
						type="button"
						disabled={loading}
						on:click={modals.closeLastModal}>Cancel</button
					>
					<button
						type="submit"
						disabled={!nickname ||
							nickname === $chat.nickname ||
							loading}>Change Nickname</button
					>
				</div>
			</form>
			{/if}

			{#if canPerm("change_settings")}
			<div class="announce-deletes">
				<label class="announce-row">
					<input
						type="checkbox"
						checked={$chat.announce_deletes || false}
						on:change={async e => {
							try {
								await patchChat({
									announce_deletes: e.target.checked,
								});
							} catch (e2) {
								modals.showModal(BasicModal, {
									title: "Failed to update chat settings",
									desc: `${e2}`,
								});
							}
						}}
					/>
					Announce deleted messages
				</label>
				<label class="announce-row">
					<input
						type="checkbox"
						checked={$chat.announce_deleter || false}
						disabled={!$chat.announce_deletes}
						on:change={async e => {
							try {
								await patchChat({
									announce_deleter: e.target.checked,
								});
							} catch (e2) {
								modals.showModal(BasicModal, {
									title: "Failed to update chat settings",
									desc: `${e2}`,
								});
							}
						}}
					/>
					Show who deleted them
				</label>
			</div>
			{/if}

			{#if canPerm("toggle_invites")}
			<div class="announce-deletes">
				<label class="announce-row">
					<input
						type="checkbox"
						checked={$chat.invites_enabled !== false}
						on:change={async e => {
							try {
								await patchChat({
									invites_enabled: e.target.checked,
								});
							} catch (e2) {
								modals.showModal(BasicModal, {
									title: "Failed to update chat settings",
									desc: `${e2}`,
								});
							}
						}}
					/>
					Allow invites
				</label>
			</div>
			{/if}

			{#if canPerm("change_settings")}
			<div class="announce-deletes">
				<label class="announce-row">
					<input
						type="checkbox"
						checked={$chat.allow_sharing !== false}
						on:change={async e => {
							try {
								await patchChat({
									allow_sharing: e.target.checked,
								});
							} catch (e2) {
								modals.showModal(BasicModal, {
									title: "Failed to update chat settings",
									desc: `${e2}`,
								});
							}
						}}
					/>
					Allow Sharing with Non-Members
				</label>
				<p class="sharing-hint">
					Anyone with a share link can read messages in this
					chat, even if they aren't a member. This setting
					doesn't affect chat members.
				</p>
				{#if $chat.allow_sharing !== false}
					<label class="announce-row">
						<input
							type="checkbox"
							checked={$chat.share_context === true}
							on:change={async e => {
								try {
									await patchChat({
										share_context: e.target.checked,
									});
								} catch (e2) {
									modals.showModal(BasicModal, {
										title: "Failed to update chat settings",
										desc: `${e2}`,
									});
								}
							}}
						/>
						Also Share Message Context
					</label>
					<p class="sharing-hint">
						When this is enabled, anyone with a share link
						can see the surrounding messages.
					</p>
				{/if}
			</div>
			{/if}

			<div class="chat-id-row">
				<b>Chat ID</b>
				<code class="chat-id-value">{$chat._id}</code>
				<button type="button" on:click={copyChatId}
					>{idCopied ? "Copied!" : "Copy"}</button
				>
			</div>
		{:else if tab === "emojis" || tab === "stickers"}
			{@const type = tab}
			{#if canPerm("add_emotes")}
			<div class="emote-upload">
				<input
					type="file"
					accept="image/*"
					bind:this={emoteFileInput}
					on:change={chooseEmoteFile}
					disabled={emoteUploading}
					hidden
				/>
				<button
					type="button"
					class="emote-preview"
					class:empty={!emotePreview}
					class:sticker={type === "stickers"}
					title={emotePreview ? "Choose a different image" : "Choose image"}
					disabled={emoteUploading}
					on:click={() => emoteFileInput.click()}
				>
					{#if emotePreview}
						<img src={emotePreview} alt="Selected file" />
					{:else}
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
							stroke-linecap="round"
							stroke-linejoin="round"
							><line x1="12" y1="5" x2="12" y2="19" /><line
								x1="5"
								y1="12"
								x2="19"
								y2="12"
							/></svg
						>
					{/if}
				</button>
				<div class="emote-fields">
					<input
						type="text"
						class="modal-input white"
						class:invalid={emoteName && !emoteNameValid}
						placeholder="Name"
						maxlength="32"
						disabled={emoteUploading}
						bind:value={emoteName}
					/>
				</div>
				<button
					type="button"
					disabled={emoteUploading || !emoteFile || !emoteNameValid}
					on:click={() => uploadEmote(type)}
				>
					{emoteUploading ? "Uploading..." : "Add"}
				</button>
			</div>
			{/if}
			<div class="emote-list">
				{#each emotes[type] as emote (emote._id)}
					<div class="emote-row">
						<img
							src="{uploadsUrl}{type}/{emote._id}"
							alt={emote.name}
							class="emote-img"
							class:sticker={type === "stickers"}
						/>
						<input
							type="text"
							class="modal-input white emote-name"
							class:invalid={renameErrors[emote._id]}
							maxlength="32"
							value={emote.name}
							readonly={!canPerm("edit_emotes")}
							title="Rename"
							on:input={() => {
								if (renameErrors[emote._id]) {
									delete renameErrors[emote._id];
									renameErrors = renameErrors;
								}
							}}
							on:keydown={e => {
								if (e.key === "Enter") e.target.blur();
								if (e.key === "Escape") {
									e.target.value = emote.name;
									e.target.blur();
								}
							}}
							on:blur={e => {
								if (canPerm("edit_emotes"))
									renameEmote(type, emote, e.target.value);
							}}
						/>
						{#if canPerm("delete_emotes")}
							<button
								type="button"
								class="circle trash"
								title="Delete {type.slice(0, -1)}"
								on:click={() =>
									modals.showModal(ConfirmActionModal, {
										title: `Delete ${type === "emojis" ? "Emoji" : "Sticker"}`,
										desc: `Delete :${emote.name}:? It'll be removed from this chat for everyone.`,
										confirmLabel: "Delete",
										onConfirm: () =>
											deleteEmote(type, emote._id),
									})}
							/>
						{/if}
					</div>
				{:else}
					<p class="emote-empty">
						No {type} yet.
					</p>
				{/each}
			</div>
		{:else if tab === "roles"}
			{#if canPerm("create_roles") && creatableTiers.length}
				<div class="role-create">
					<input
						type="text"
						class="modal-input white"
						placeholder="Role name"
						maxlength="32"
						bind:value={newRoleName}
					/>
					<select
						class="modal-input white"
						bind:value={newRoleTier}
					>
						{#each creatableTiers as t}
							<option value={t}>{tierLabel(t)}</option>
						{/each}
					</select>
					<button
						type="button"
						disabled={!newRoleName.trim()}
						on:click={async () => {
							try {
								await createRole();
							} catch (e) {
								roleModalError(e);
							}
						}}>Create</button
					>
				</div>
			{/if}
			<div class="role-list">
				{#each sortedRoles as role (role._id)}
					{@const canManage =
						canPerm("modify_roles") &&
						canManageRole($chat, $user.name, role)}
					<div class="role-item">
						<div class="role-row">
							<button
								type="button"
								class="role-expand"
								on:click={() =>
									(expandedRole =
										expandedRole === role._id
											? null
											: role._id)}
							>
								<b><span style={colorsStyle(role.colors)}
										>{role.name}</span
									></b>
								<span class="role-meta">{tierLabel(role.tier)}</span>
								<span class="role-meta"
									>{memberCount(role)} member{memberCount(
										role
									) === 1
										? ""
										: "s"}</span
								>
							</button>
							{#if canPerm("delete_roles") && canManageRole($chat, $user.name, role) && role._id !== "default" && role._id !== "administrator"}
								<button
									type="button"
									class="circle trash"
									title="Delete role"
									on:click={() =>
										modals.showModal(ConfirmActionModal, {
											title: "Delete Role",
											desc: `Delete the ${role.name} role? It'll be removed from every member who has it.`,
											confirmLabel: "Delete",
											onConfirm: () =>
												deleteRole(role._id),
										})}
								/>
							{/if}
						</div>
						{#if expandedRole === role._id}
							{@const colors = role.colors || []}
							{@const canColor =
								role._id === "administrator"
									? $user.name === $chat.owner
									: canManage}
							<div class="role-editor">
								<input
									type="text"
									class="modal-input white"
									maxlength="32"
									value={role.name}
									disabled={!canManage}
									title="Role name"
									on:keydown={e => {
										if (e.key === "Enter") e.target.blur();
										if (e.key === "Escape") {
											e.target.value = role.name;
											e.target.blur();
										}
									}}
									on:blur={e => renameRole(role, e.target.value)}
								/>
								{#if role._id !== "administrator"}
									<select
										class="modal-input white role-tier"
										value={role.tier}
										disabled={!canManage}
										title="Role tier"
										on:change={async e => {
											try {
												await patchRole(role._id, {
													tier: Number(
														e.target.value
													),
												});
											} catch (e2) {
												roleModalError(e2);
											}
										}}
									>
										{#each settableTiers as t}
											<option
												value={t}
												selected={t === role.tier}
												>{tierLabel(t)}</option
											>
										{/each}
									</select>
								{:else}
									<span class="role-meta">Tier 4</span>
								{/if}
								<div class="role-colors">
									<b>Colour</b>
									{#each colors.length ? colors : [null] as color, i}
										<label
											class="role-swatch"
											class:empty={!color}
											class:disabled={!canColor}
											style:background-color={color
												? `#${color}`
												: null}
										>
											<input
												type="color"
												disabled={!canColor}
												value={`#${color || "f9a636"}`}
												on:change={e => {
													const next = [...colors];
													next[i] = e.target.value
														.slice(1)
														.toLowerCase();
													setRoleColors(role, next);
												}}
											/>
										</label>
									{/each}
									{#if canColor}
										<label class="role-gradient">
											<input
												type="checkbox"
												checked={colors.length === 2}
												on:change={e =>
													setRoleColors(
														role,
														e.target.checked
															? [
																	colors[0] || "f9a636",
																	colors[0] === "ff5e5e"
																		? "f9a636"
																		: "ff5e5e",
																]
															: colors.slice(0, 1)
													)}
											/>
											Gradient
										</label>
										{#if colors.length}
											<button
												type="button"
												class="role-color-clear"
												on:click={() => setRoleColors(role, [])}
												>Clear</button
											>
										{/if}
									{/if}
								</div>
								{#if role._id === "administrator"}
									<p class="role-note">
										Has every permission.
									</p>
								{:else if role.tier === -1}
									<p class="role-note">
										Cosmetic roles have no permissions.
									</p>
									<label class="announce-row">
										<input
											type="checkbox"
											checked={role.display_override ||
												false}
											disabled={!canManage}
											on:change={async e => {
												try {
													await patchRole(role._id, {
														display_override:
															e.target.checked,
													});
												} catch (e2) {
													roleModalError(e2);
												}
											}}
										/>
										Show this role's name and colour instead
										of other roles
									</label>
								{:else}
									{#each Object.entries(permsForTier(role.tier)).sort(([a], [b]) => a - b) as [tier, perms]}
										<h4 class="perm-tier">
											Tier {tier}
										</h4>
										{#each perms as perm}
											{@const val =
												role.permissions?.[
													perm.key
												] ?? null}
											{@const editable =
												canManage &&
												canGrantPerm(
													$chat,
													$user.name,
													perm.key
												)}
											<div class="perm-row">
												<span class="perm-label">
													{perm.label}
													{#if val === null}
														<span
															class="perm-hint"
															>({inheritsPerm(
																$chat,
																role,
																perm.key
															)
																? "on"
																: "off"})</span
														>
													{/if}
												</span>
												<div class="perm-seg">
													{#each [["Deny", false], ["Inherit", null], ["Allow", true]] as [segLabel, segVal]}
														<button
															type="button"
															class:selected={val ===
																segVal}
															disabled={!editable}
															on:click={() =>
																setRolePerm(
																	role,
																	perm.key,
																	segVal
																)}
															>{segLabel}</button
														>
													{/each}
												</div>
											</div>
										{/each}
									{/each}
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{:else if tab === "bans"}
			<div class="ban-list">
				{#each activeBans as ban (ban.username)}
					<div class="ban-row">
						<Member member={ban.username} owner={false} />
						<span class="ban-expiry">
							{#if ban.expires}
								Ends <FormattedDate date={ban.expires} />
							{:else}
								Permanent
							{/if}
						</span>
						<button
							type="button"
							disabled={unbanning[ban.username]}
							on:click={() => unban(ban.username)}>Unban</button
						>
					</div>
				{:else}
					<p class="emote-empty">No one is banned.</p>
				{/each}
			</div>
		{/if}
	</div>
</Modal>

<style>
	.tabs {
		display: flex;
		gap: 0.5em;
		margin-bottom: 1em;
	}
	.tabs button {
		flex: 1;
		opacity: 0.7;
	}
	.tabs button.active {
		opacity: 1;
		font-weight: bold;
	}

	.icon-section {
		display: flex;
		align-items: center;
		gap: 1em;
		margin-bottom: 1em;
	}
	.icon-controls {
		display: flex;
		flex-direction: column;
		gap: 0.4em;
		align-items: flex-start;
	}
	.icon-color {
		display: flex;
		align-items: center;
		gap: 0.4em;
	}

	.announce-deletes {
		display: flex;
		flex-direction: column;
		gap: 0.5em;
		margin-top: 1em;
		padding-top: 0.75em;
		border-top: solid 2px var(--orange);
	}
	.announce-row {
		display: flex;
		align-items: center;
		gap: 0.5em;
	}
	.sharing-hint {
		font-size: 0.75em;
		opacity: 0.7;
		margin: -0.25em 0 0.25em 1.75em;
	}

	.chat-id-row {
		display: flex;
		align-items: center;
		gap: 0.6em;
		margin-top: 1em;
		padding-top: 0.75em;
		border-top: solid 2px var(--orange);
	}
	.chat-id-value {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		opacity: 0.8;
	}

	.emote-upload {
		display: flex;
		align-items: center;
		gap: 0.6em;
		margin-bottom: 0.75em;
	}
	.emote-preview {
		width: 3.2em;
		height: 3.2em;
		flex-shrink: 0;
		padding: 0.2em;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: var(--background) !important;
		border: solid 2px var(--orange);
		border-radius: 5px;
		color: var(--orange);
		overflow: hidden;
	}
	.emote-preview.sticker {
		width: 4.4em;
		height: 4.4em;
	}
	.emote-preview.empty {
		border-style: dashed;
	}
	.emote-preview img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}
	.emote-preview svg {
		width: 1.4em;
		height: 1.4em;
	}
	.emote-fields {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.2em;
	}
	.emote-fields input {
		width: 100%;
		box-sizing: border-box;
	}
	.emote-fields input.invalid {
		border-color: crimson;
	}
	.emote-list {
		max-height: 16em;
		overflow-y: auto;
		overflow-x: hidden;
		padding: 0.15em;
		display: flex;
		flex-direction: column;
		gap: 0.4em;
	}
	.emote-row {
		display: flex;
		align-items: center;
		gap: 0.6em;
	}
	.emote-img {
		width: 2em;
		height: 2em;
		object-fit: contain;
		flex-shrink: 0;
	}
	.emote-img.sticker {
		width: 3em;
		height: 3em;
	}
	.emote-name {
		flex: 1;
		min-width: 0;
		margin: 0;
		font-family: monospace;
	}
	.emote-name.invalid {
		border-color: crimson;
	}
	.emote-row button.circle {
		flex-shrink: 0;
		margin: 0;
		border: none;
	}
	.emote-empty {
		text-align: center;
		opacity: 0.7;
	}

	.role-create {
		display: flex;
		gap: 0.5em;
		margin-bottom: 0.75em;
	}
	.role-create input {
		flex: 1;
		width: auto;
		min-width: 0;
		margin: 0;
	}
	.role-create select {
		flex: 0 0 auto;
		width: auto;
		margin: 0;
	}
	.role-list {
		display: flex;
		flex-direction: column;
		gap: 0.4em;
	}
	.role-row {
		display: flex;
		align-items: center;
		gap: 0.5em;
	}
	.role-expand {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 0.6em;
		margin: 0;
		background-color: transparent;
		border: none;
		color: var(--foreground);
		text-align: left;
		padding: 0.3em;
	}
	.role-meta {
		font-size: 0.8em;
		opacity: 0.65;
		font-weight: normal;
	}
	.role-row button.circle {
		flex-shrink: 0;
		margin: 0;
		border: none;
	}
	.role-editor {
		padding: 0.4em 0.3em 0.6em 0.3em;
		display: flex;
		flex-direction: column;
		gap: 0.4em;
	}
	.role-note {
		margin: 0.3em 0;
		opacity: 0.7;
	}
	.perm-tier {
		margin: 0.4em 0 0 0;
		font-size: 0.85em;
		opacity: 0.7;
	}
	.perm-row {
		display: flex;
		align-items: center;
		gap: 0.6em;
	}
	.perm-label {
		flex: 1;
		min-width: 0;
	}
	.perm-hint {
		font-size: 0.85em;
		opacity: 0.6;
	}
	.ban-list {
		display: flex;
		flex-direction: column;
		gap: 0.4em;
	}
	.ban-row {
		display: flex;
		align-items: center;
		gap: 0.6em;
	}
	.ban-row :global(.member) {
		flex: 1;
		min-width: 0;
		padding: 0;
	}
	.ban-expiry {
		font-size: 0.8em;
		opacity: 0.7;
		flex-shrink: 0;
	}
	.ban-row button {
		flex-shrink: 0;
		margin: 0;
		padding: 0.2em 0.8em;
	}

	.role-colors {
		display: flex;
		align-items: center;
		gap: 0.5em;
		margin: 0.6em 0 0.2em;
		font-size: 0.9em;
	}
	.role-swatch {
		width: 1.8em;
		height: 1.8em;
		border-radius: 0.4em;
		border: solid 2px var(--orange);
		cursor: pointer;
		flex-shrink: 0;
	}
	.role-swatch.empty {
		border-style: dashed;
	}
	.role-swatch.disabled {
		cursor: default;
	}
	.role-swatch input {
		opacity: 0;
		width: 0;
		height: 0;
		position: absolute;
	}
	.role-gradient {
		display: flex;
		align-items: center;
		gap: 0.3em;
	}
	.role-color-clear {
		margin: 0 0 0 auto;
		padding: 0.15em 0.6em;
	}

	.perm-seg {
		display: flex;
		flex-shrink: 0;
	}
	.perm-seg button {
		margin: 0;
		font-size: 0.8em;
		padding: 0.2em 0.5em;
		border-radius: 0;
		border: solid 2px var(--orange);
		background-color: transparent;
		color: var(--foreground);
	}
	.perm-seg button + button {
		border-left-width: 0;
	}
	.perm-seg button:first-child {
		border-radius: 4px 0 0 4px;
	}
	.perm-seg button:last-child {
		border-radius: 0 4px 4px 0;
	}
	.perm-seg button.selected {
		background-color: var(--orange);
		color: white;
		font-weight: bold;
	}
	.perm-seg button:disabled {
		opacity: 0.55;
	}
	.perm-seg button.selected:disabled {
		opacity: 0.8;
	}
</style>
