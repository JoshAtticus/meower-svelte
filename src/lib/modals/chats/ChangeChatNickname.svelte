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
		const file = emoteFileInput.files[0];
		if (!file) return;
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
					body: JSON.stringify({name: emoteName || undefined}),
				}
			);
			if (!claim.ok) {
				const json = await claim.json().catch(() => ({}));
				throw new Error(
					json.type ||
						"Response code is not OK; code is " + claim.status
				);
			}
			emoteName = "";
			emoteFileInput.value = "";
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
					type="text"
					class="modal-input white"
					placeholder="Name (optional)"
					maxlength="32"
					bind:value={emoteName}
				/>
				<input
					type="file"
					accept="image/*"
					bind:this={emoteFileInput}
					disabled={emoteUploading}
					hidden
				/>
				<button
					disabled={emoteUploading}
					on:click={() => emoteFileInput.click()}
				>
					Choose image
				</button>
				<button
					disabled={emoteUploading}
					on:click={() => uploadEmote(type)}
				>
					{emoteUploading ? "Uploading..." : "Add"}
				</button>
			</div>
			<div class="emote-list">
				{#each emotes[type] as emote}
					<div class="emote-row">
						<img
							src="{uploadsUrl}{type}/{emote._id}"
							alt={emote.name}
							class="emote-img"
						/>
						<span class="emote-name">:{emote.name}:</span>
						<button
							class="emote-delete"
							on:click={() => deleteEmote(type, emote._id)}
							>Delete</button
						>
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
		gap: 0.5em;
		margin-bottom: 0.75em;
	}
	.emote-upload input {
		flex: 1;
		min-width: 0;
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
	}
	.emote-name {
		flex: 1;
		font-family: monospace;
	}
	.emote-delete {
		padding: 0.15em 0.6em;
	}
	.emote-empty {
		text-align: center;
		opacity: 0.7;
	}
</style>
