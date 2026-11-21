<script>
	import Modal from "../../Modal.svelte";
	import ChatIcon from "../../ChatIcon.svelte";
	import BasicModal from "../Basic.svelte";

	import {authHeader, chat, user} from "../../stores.js";
	import {apiUrl, uploadsUrl} from "../../urls.js";
	import * as modals from "../../modals.js";

	import {focus, params} from "@roxi/routify";

	let nickname = $chat.nickname;
	let loading, error;

	let fileInput, uploading;

	$: {
		if (!$params.admin && $chat.owner !== $user.name) {
			modals.closeLastModal();
		}
	}

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
</script>

<Modal on:close={modals.closeLastModal}>
	<h2 slot="header">Group Chat Settings</h2>
	<div slot="default">
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
				<button disabled={uploading} on:click={() => fileInput.click()}>
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
							"Response code is not OK; code is " + resp.status
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
			<label for="nickname" style={error ? "color: crimson;" : ""}
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
	</div>
</Modal>

<style>
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
</style>
