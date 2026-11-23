<script>
	import Modal from "../../Modal.svelte";

	import * as modals from "../../modals.js";
	import {apiUrl} from "../../urls.js";
	import {authHeader, user} from "../../stores.js";
	import {focus} from "@roxi/routify";

	let newUsername = "";
	let password = "";
	let totpCode = "";
	let needsCode = false;
	let loading = false;
	let error = "";

	const MESSAGES = {
		invalidCredentials: "That password isn't right.",
		illegalCharacters:
			"Usernames can only use letters, numbers, dashes and underscores (up to 20 characters).",
		sameUsername: "That's already your username.",
		usernameExists: "That username is taken.",
		usernameReserved:
			"That username is being held for someone who recently changed theirs.",
		mfaRequired: "Enter the code from your authenticator app.",
		invalidTOTPCode: "That code isn't right.",
		botsCannotDoThis: "Bots can't change their username.",
	};

	function cooldownText(seconds) {
		const hours = Math.ceil(seconds / 3600);
		return hours >= 24
			? `${Math.ceil(hours / 24)} more day${hours > 24 ? "s" : ""}`
			: `${hours} more hour${hours === 1 ? "" : "s"}`;
	}

	async function submit() {
		loading = true;
		error = "";
		try {
			const resp = await fetch(`${apiUrl}me/username`, {
				method: "POST",
				headers: {"Content-Type": "application/json", ...$authHeader},
				body: JSON.stringify({
					username: newUsername.trim(),
					password,
					totp_code: needsCode ? totpCode : undefined,
				}),
			});
			let body = {};
			try {
				body = await resp.json();
			} catch (e) {}
			if (resp.ok) {
				// sign back in under the new name
				localStorage.setItem("meower_savedusername", body.username);
				location.href = "/settings";
				return;
			}
			if (body.type === "mfaRequired") needsCode = true;
			if (body.type === "usernameChangeCooldown") {
				error = `You can change your username again in ${cooldownText(
					body.retry_after
				)}.`;
			} else if (resp.status === 429) {
				error = "Too many attempts. Try again in a few minutes.";
			} else {
				error =
					MESSAGES[body.type] ||
					`Something went wrong (code ${resp.status}).`;
			}
		} catch (e) {
			error = "Couldn't reach the server.";
		}
		loading = false;
	}
</script>

<Modal on:close={modals.closeLastModal}>
	<h2 slot="header">Change Username</h2>
	<div slot="default">
		<form on:submit|preventDefault={submit}>
			<p class="info">
				You can change your username once every 72 hours. Your old
				username is held for 30 days, only you can take it back, and
				links to your old profile will take people to your new one.
			</p>
			<label for="new-username"><b>New username</b></label>
			<input
				id="new-username"
				type="text"
				class="modal-input white"
				placeholder={$user.name}
				maxlength="20"
				autocomplete="off"
				disabled={loading}
				bind:value={newUsername}
				use:focus
			/>
			<label for="username-password"><b>Password</b></label>
			<input
				id="username-password"
				type="password"
				class="modal-input white"
				placeholder="Your current password..."
				autocomplete="current-password"
				disabled={loading}
				bind:value={password}
			/>
			{#if needsCode}
				<label for="username-code"><b>Authenticator code</b></label>
				<input
					id="username-code"
					type="text"
					inputmode="numeric"
					class="modal-input white"
					placeholder="6-digit code"
					maxlength="6"
					autocomplete="one-time-code"
					disabled={loading}
					bind:value={totpCode}
				/>
			{/if}
			{#if error}<p class="error">{error}</p>{/if}
			<div class="modal-buttons">
				<button type="button" on:click={modals.closeLastModal}
					>Cancel</button
				>
				<button
					type="submit"
					disabled={loading ||
						!newUsername.trim() ||
						!password ||
						(needsCode && totpCode.length !== 6)}
					>{loading ? "Changing..." : "Change username"}</button
				>
			</div>
		</form>
	</div>
</Modal>

<style>
	.info {
		margin: 0 0 0.8em;
		font-size: 0.85em;
		opacity: 0.75;
	}
	label {
		display: block;
		margin: 0.7em 0 0.3em;
	}
	input {
		width: 100%;
		box-sizing: border-box;
		margin: 0;
	}
	.error {
		color: crimson;
		margin: 0.7em 0 0;
	}
	.modal-buttons {
		margin-top: 1em;
	}
</style>
