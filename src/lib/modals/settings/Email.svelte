<script>
	import Modal from "../../Modal.svelte";

	import {authHeader, user} from "../../stores.js";
	import {apiUrl} from "../../urls.js";
	import * as modals from "../../modals.js";
	import {refreshEmailState} from "../../emailGate.js";

	import {onMount} from "svelte";

	let email = "";
	let password = "";
	let loading = false;
	let error = "";
	let notice = "";

	$: state = $user.email_state || {};

	const MESSAGES = {
		invalidEmail: "That doesn't look like a valid email address.",
		emailBlocked:
			"That email provider isn't allowed. Please use a different address.",
		emailInUse: "That email is already used by another account.",
		invalidCredentials: "That password isn't right.",
		noEmail: "Add an email address first.",
		alreadyVerified: "Your email is already verified.",
	};

	async function call(path, method, body) {
		loading = true;
		error = "";
		notice = "";
		try {
			const resp = await fetch(`${apiUrl}me/email/${path}`, {
				method,
				headers: {"Content-Type": "application/json", ...$authHeader},
				body: body && JSON.stringify(body),
			});
			const json = await resp.json().catch(() => ({}));
			if (!resp.ok) {
				error =
					MESSAGES[json.type] ||
					(resp.status === 429
						? "Too many attempts. Try again in a few minutes."
						: `Something went wrong (code ${resp.status}).`);
				return null;
			}
			await refreshEmailState();
			return json;
		} catch (e) {
			error = "Couldn't reach the server.";
			return null;
		} finally {
			loading = false;
		}
	}

	async function save() {
		const json = await call("", "PUT", {email: email.trim(), password});
		if (json) {
			password = "";
			email = "";
			notice = json.sent
				? "Check your inbox for the verification link."
				: "Saved, but we couldn't send the email. Try resending in a moment.";
		}
	}

	async function resend() {
		const json = await call("resend", "POST");
		if (json)
			notice = json.sent
				? "Verification email sent."
				: "We couldn't send the email. Try again in a moment.";
	}

	onMount(refreshEmailState);
</script>

<Modal showClose={true} on:close={modals.closeLastModal}>
	<h2 slot="header">Email</h2>
	<div slot="default">
		<form on:submit|preventDefault={save}>
			<p class="info">
				{#if state.has_email}
					<b>{state.email}</b>
					{state.verified
						? "is verified."
						: "isn't verified yet. Open the link we emailed you, which expires after 24 hours."}
				{:else}
					Add an email address to verify your account. It's only used
					for verification and security alerts.
				{/if}
			</p>
			<label for="email-address"
				><b>{state.has_email ? "New email address" : "Email address"}</b
				></label
			>
			<input
				id="email-address"
				type="text"
				inputmode="email"
				class="modal-input white"
				placeholder="you@example.com"
				maxlength="254"
				autocomplete="email"
				disabled={loading}
				bind:value={email}
			/>
			<label for="email-password"><b>Password</b></label>
			<input
				id="email-password"
				type="password"
				class="modal-input white"
				placeholder="Your current password..."
				autocomplete="current-password"
				disabled={loading}
				bind:value={password}
			/>
			{#if error}<p class="error">{error}</p>{/if}
			{#if notice}<p class="info notice">{notice}</p>{/if}
			<div class="modal-buttons">
				{#if state.has_email && !state.verified}
					<button type="button" disabled={loading} on:click={resend}
						>Resend email</button
					>
				{/if}
				<button
					type="submit"
					disabled={loading || !email.trim() || !password}
					>{loading
						? "Saving..."
						: state.has_email
						? "Change email"
						: "Add email"}</button
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
	.notice {
		margin: 0.7em 0 0;
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
