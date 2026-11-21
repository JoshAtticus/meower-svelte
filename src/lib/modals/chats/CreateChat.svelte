<script>
	import Modal from "../../Modal.svelte";

	import {authHeader, chats} from "../../stores.js";
	import {apiUrl} from "../../urls.js";
	import * as modals from "../../modals.js";

	import {goto, focus} from "@roxi/routify";

	let nickname, loading, error;

	const PURPOSES = [
		["friends", "Friends & Family"],
		["public", "Public Discussion"],
		["private", "Private Discussion"],
		["announcements", "Announcements"],
		["emojis", "Emojis & Stickers"],
		["other", "Other"],
	];
	const PURPOSE_INFO = {
		friends:
			"For close friends and family. Everyone can send messages, invite people, customise the chat's name, icon and colour, add emojis and stickers, and pin messages.",
		public:
			"For open conversations. Everyone can send messages, delete their own messages and invite people.",
		private:
			"For a set group of people. Same as Public Discussion, but invites start turned off, so only you and senior roles can add people.",
		announcements:
			"For one-way updates. Members can read but can't send messages until you give them a role that allows it.",
		emojis:
			"For collecting a chat's emojis and stickers. Members can't send messages until you give them a role that allows it.",
		other:
			"The standard setup. Everyone can send messages, delete their own messages and invite people.",
	};
	let purpose = "other";
</script>

<Modal on:close={modals.closeLastModal}>
	<h2 slot="header">Create Chat</h2>
	<div slot="default">
		<form
			on:change={() => (error = "")}
			on:submit|preventDefault={async () => {
				loading = true;
				try {
					const resp = await fetch(`${apiUrl}chats`, {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							...$authHeader,
						},
						body: JSON.stringify({nickname, purpose}),
					});
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
					const chat = await resp.json();
					if (
						$chats.findIndex(_chat => _chat._id === chat._id) === -1
					) {
						$chats.push(chat);
					}
					$goto(`/chats/${chat._id}`);
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
				placeholder="Chat Nickname..."
				maxlength="32"
				disabled={loading}
				bind:value={nickname}
				use:focus
			/>
			<p class="purpose-label"><b>Purpose</b></p>
			<div class="purpose-grid">
				{#each PURPOSES as [value, label]}
					<button
						type="button"
						class="purpose-option"
						class:selected={purpose === value}
						disabled={loading}
						on:click={() => (purpose = value)}>{label}</button
					>
				{/each}
			</div>
			<p class="purpose-info">{PURPOSE_INFO[purpose]}</p>
			<p class="purpose-note">
				The purpose only sets up the chat's starting roles. You can
				change any of it later in Group Chat Settings.
			</p>
			<div class="modal-buttons">
				<button
					type="button"
					disabled={loading}
					on:click={modals.closeLastModal}>Cancel</button
				>
				<button type="submit" disabled={!nickname || loading}
					>Create Chat</button
				>
			</div>
		</form>
	</div>
</Modal>

<style>
	.purpose-label {
		margin: 0.75em 0 0.4em;
	}
	.purpose-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.4em;
	}
	.purpose-option {
		margin: 0;
		padding: 0.5em 0.4em;
		font-size: 0.9em;
		background-color: transparent;
		color: var(--foreground);
		border: solid 2px var(--orange);
	}
	.purpose-info {
		margin: 0.6em 0 0.2em;
		font-size: 0.9em;
	}
	.purpose-note {
		margin: 0 0 1em;
		font-size: 0.8em;
		opacity: 0.65;
	}
	.purpose-option.selected {
		background-color: var(--orange);
		color: white;
		font-weight: bold;
	}
</style>
