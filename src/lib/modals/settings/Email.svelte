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

	const ERRORS = {
		invalidEmail: "That doesn't look like a valid email address.",
		emailBlocked: "That email provider isn't allowed. Please use a different address.",
		emailInUse: "That email is already used by another account.",
		invalidCredentials: "Incorrect password.",
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
					ERRORS[json.type] ||
					(resp.status === 429 ? "Too many attempts! Please try again later." : "Something went wrong.");
				return null;
			}
			await refreshEmailState();
			return json;
		} finally {
			loading = false;
		}
	}

	async function save() {
		const json = await call("", "PUT", {email: email.trim(), password});
		if (json) {
			password = "";
			notice = json.sent
				? "Check your inbox for the verification link."
				: "Saved, but we couldn't send the email. Try resending in a moment.";
		}
	}

	async function resend() {
		const json = await call("resend", "POST");
		if (json) notice = json.sent ? "Verification email sent." : "We couldn't send the email. Try again in a moment.";
	}

	onMount(refreshEmailState);
</script>

<Modal showClose={true} on:close={modals.closeLastModal}>
	<h2 slot="header">Email</h2>
	<div slot="default">
		{#if state.has_email}
			<p>
				<b>{state.email}</b>
				{state.verified ? " is verified." : " is not verified yet."}
			</p>
			{#if !state.verified}
				<p>Open the link we emailed you. It expires after 24 hours.</p>
				<div class="modal-buttons">
					<button on:click={resend} disabled={loading}>Resend email</button>
				</div>
			{/if}
		{:else}
			<p>Add an email address to verify your account.</p>
		{/if}
		<form on:submit|preventDefault={save}>
			<input type="text"
				inputmode="email" class="modal-input white" placeholder={state.has_email ? "New email address" : "Email address"} maxlength="254" autocomplete="email" bind:value={email} />
			<input type="password" class="modal-input white" placeholder="Current password" maxlength="255" autocomplete="current-password" bind:value={password} />
			{#if error}<p class="err">{error}</p>{/if}
			{#if notice}<p>{notice}</p>{/if}
			<div class="modal-buttons">
				<button type="submit" disabled={loading || !email.trim() || !password}>{state.has_email ? "Change email" : "Add email"}</button>
			</div>
		</form>
	</div>
</Modal>

<style>
	form {
		display: flex;
		flex-direction: column;
		gap: 0.5em;
	}
	.err {
		color: crimson;
		margin: 0;
	}
</style>
