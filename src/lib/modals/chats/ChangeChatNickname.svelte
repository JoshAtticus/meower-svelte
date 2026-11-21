<script>
	import Modal from "../../Modal.svelte";
	import ChatIcon from "../../ChatIcon.svelte";
	import BasicModal from "../Basic.svelte";

	import {authHeader, chat, user} from "../../stores.js";
	import {apiUrl, uploadsUrl} from "../../urls.js";
	import {chatEmotes, refreshEmotes} from "../../emotes.js";
	import * as modals from "../../modals.js";

	import {focus, params} from "@roxi/routify";
	import {onMount} from "svelte";

	let tab = "general";

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
		if (!$params.admin && $chat.owner !== $user.name) {
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
					json.type ||
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
				throw new Error(
					"Response code is not OK; code is " + resp.status
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
		try {
			const resp = await fetch(
				`${apiUrl}chats/${$chat._id}/${type}/${emoteId}`,
				{method: "DELETE", headers: $authHeader}
			);
			if (!resp.ok) {
				throw new Error(
					"Response code is not OK; code is " + resp.status
				);
			}
			await refreshEmotes($chat._id);
			$chat[type] = emotes[type];
		} catch (e) {
			modals.showModal(BasicModal, {
				title: `Failed to delete ${type.slice(0, -1)}`,
				desc: `${e}`,
			});
		}
	}
</script>

<Modal on:close={modals.closeLastModal}>
	<h2 slot="header">Group Chat Settings</h2>
	<div slot="default">
		<div class="tabs">
			<button
				class:active={tab === "general"}
				on:click={() => (tab = "general")}>General</button
			>
			<button
				class:active={tab === "emojis"}
				on:click={() => (tab = "emojis")}>Emojis</button
			>
			<button
				class:active={tab === "stickers"}
				on:click={() => (tab = "stickers")}>Stickers</button
			>
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
					<button
						disabled={uploading}
						on:click={() => fileInput.click()}
					>
						{uploading ? "Uploading..." : "Upload icon"}
					</button>
					{#if $chat.icon}
						<button on:click={() => patchChat({icon: ""})}
							>Remove icon</button
						>
					{/if}
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
				</div>
			</div>

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
		{:else}
			{@const type = tab}
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
							on:blur={e => renameEmote(type, emote, e.target.value)}
						/>
						<button
							type="button"
							class="circle trash"
							title="Delete {type.slice(0, -1)}"
							on:click={() => deleteEmote(type, emote._id)}
						/>
					</div>
				{:else}
					<p class="emote-empty">
						No {type} yet.
					</p>
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
</style>
