<script>
	import Modal from "../../Modal.svelte";

	import {authHeader} from "../../stores.js";
	import {apiUrl} from "../../urls.js";
	import * as modals from "../../modals.js";

	import {onMount} from "svelte";

	// list | add | remove | reset | recovery
	let view = "list";
	let authenticators = [];
	let loading = false;
	let error = "";

	// add flow
	let secret = null;
	let nickname = "";
	let code = "";
	let password = "";
	// remove flow
	let removing = null;
	// recovery code to show once
	let recoveryCode = "";
	let copied = false;

	function friendly(type, status) {
		return (
			{
				invalidCredentials: "Wrong password.",
				invalidTOTPCode: "That code didn't work.",
			}[type] ||
			(status === 429
				? "Too many attempts! Please try again later."
				: `Response code is not OK; code is ${status}`)
		);
	}

	async function api(path, method = "GET", body = undefined) {
		const resp = await fetch(`${apiUrl}${path}`, {
			method,
			headers: {"Content-Type": "application/json", ...$authHeader},
			body: body ? JSON.stringify(body) : undefined,
		});
		const json = await resp.json().catch(() => ({}));
		if (!resp.ok) throw new Error(friendly(json.type, resp.status));
		return json;
	}

	async function loadAuthenticators() {
		try {
			authenticators = (await api("me/authenticators")).autoget || [];
		} catch (e) {
			error = `${e.message || e}`;
		}
	}

	function go(next) {
		view = next;
		error = "";
		password = "";
		code = "";
		copied = false;
	}

	async function startAdd() {
		go("add");
		nickname = "";
		secret = null;
		try {
			secret = await api("me/authenticators/totp-secret");
		} catch (e) {
			error = `${e.message || e}`;
		}
	}

	async function submit(fn) {
		loading = true;
		error = "";
		try {
			await fn();
		} catch (e) {
			error = `${e.message || e}`;
		}
		loading = false;
	}

	const addAuthenticator = () =>
		submit(async () => {
			const json = await api("me/authenticators", "POST", {
				type: "totp",
				nickname: nickname.trim(),
				totp_secret: secret.secret,
				totp_code: code.replace(/\s+/g, ""),
				password,
			});
			recoveryCode = json.mfa_recovery_code;
			await loadAuthenticators();
			go("recovery");
		});

	const removeAuthenticator = () =>
		submit(async () => {
			await api(`me/authenticators/${removing._id}`, "DELETE", {password});
			await loadAuthenticators();
			go("list");
		});

	const resetRecoveryCode = () =>
		submit(async () => {
			const json = await api("me/reset-mfa-recovery-code", "POST", {
				password,
			});
			recoveryCode = json.mfa_recovery_code;
			go("recovery");
		});

	async function rename(auth, value) {
		value = value.trim();
		if (value === (auth.nickname || "")) return;
		try {
			await api(`me/authenticators/${auth._id}`, "PATCH", {
				nickname: value,
			});
			auth.nickname = value;
			authenticators = authenticators;
		} catch (e) {
			error = `${e.message || e}`;
		}
	}

	onMount(loadAuthenticators);
</script>

<Modal on:close={modals.closeLastModal}>
	<h2 slot="header">Two-Factor Authentication</h2>
	<div slot="default">
		{#if view === "list"}
			{#if authenticators.length}
				<div class="auth-list">
					{#each authenticators as auth (auth._id)}
						<div class="auth-row">
							<input
								type="text"
								class="modal-input white"
								maxlength="32"
								placeholder="Authenticator app"
								value={auth.nickname || ""}
								on:keydown={e => {
									if (e.key === "Enter") e.target.blur();
									if (e.key === "Escape") {
										e.target.value = auth.nickname || "";
										e.target.blur();
									}
								}}
								on:blur={e => rename(auth, e.target.value)}
							/>
							<span class="auth-date"
								>{new Date(
									auth.registered_at * 1000
								).toLocaleDateString()}</span
							>
							<button
								type="button"
								class="circle trash"
								title="Remove authenticator"
								on:click={() => {
									removing = auth;
									go("remove");
								}}
							/>
						</div>
					{/each}
				</div>
			{:else}
				<p>Two-factor authentication is off.</p>
			{/if}
			{#if error}<p class="error">{error}</p>{/if}
			<div class="modal-buttons">
				{#if authenticators.length}
					<button type="button" on:click={() => go("reset")}
						>New recovery code</button
					>
				{:else}
					<span />
				{/if}
				<button type="button" on:click={startAdd}
					>Add authenticator app</button
				>
			</div>
		{:else if view === "add"}
			{#if secret}
				<div class="qr">{@html secret.qr_code_svg}</div>
				<p class="secret-line">
					<code class="secret">{secret.secret}</code>
				</p>
				<form on:submit|preventDefault={addAuthenticator}>
					<input
						type="text"
						class="modal-input white"
						maxlength="32"
						placeholder="Name (optional)"
						disabled={loading}
						bind:value={nickname}
					/>
					<input
						type="text"
						class="modal-input white"
						inputmode="numeric"
						autocomplete="one-time-code"
						placeholder="Code from the app"
						maxlength="7"
						disabled={loading}
						bind:value={code}
					/>
					<input
						type="password"
						class="modal-input white"
						placeholder="Your password"
						maxlength="255"
						disabled={loading}
						bind:value={password}
					/>
					{#if error}<p class="error">{error}</p>{/if}
					<div class="modal-buttons">
						<button
							type="button"
							disabled={loading}
							on:click={() => go("list")}>Back</button
						>
						<button
							type="submit"
							disabled={loading ||
								!/^\d{6}$/.test(code.replace(/\s+/g, "")) ||
								!password}>Add</button
						>
					</div>
				</form>
			{:else if error}
				<p class="error">{error}</p>
			{:else}
				<p>Loading...</p>
			{/if}
		{:else if view === "remove" || view === "reset"}
			<form
				on:submit|preventDefault={view === "remove"
					? removeAuthenticator
					: resetRecoveryCode}
			>
				<p>
					{#if view === "remove"}
						Remove <b>{removing.nickname || "this authenticator app"}</b>?
					{:else}
						Get a new recovery code? Your old one will stop working.
					{/if}
				</p>
				<input
					type="password"
					class="modal-input white"
					placeholder="Your password"
					maxlength="255"
					disabled={loading}
					bind:value={password}
				/>
				{#if error}<p class="error">{error}</p>{:else}<br />{/if}
				<div class="modal-buttons">
					<button
						type="button"
						disabled={loading}
						on:click={() => go("list")}>Back</button
					>
					<button type="submit" disabled={loading || !password}
						>{view === "remove" ? "Remove" : "Get new code"}</button
					>
				</div>
			</form>
		{:else if view === "recovery"}
			<p>
				Save this recovery code somewhere safe. If you lose your
				authenticator app, it's the only way back into your account.
			</p>
			<div class="recovery">
				<code>{recoveryCode}</code>
				<button
					type="button"
					on:click={async () => {
						try {
							await navigator.clipboard.writeText(recoveryCode);
							copied = true;
						} catch {}
					}}>{copied ? "Copied!" : "Copy"}</button
				>
			</div>
			<br />
			<div class="modal-buttons">
				<span />
				<button type="button" on:click={() => go("list")}>Done</button>
			</div>
		{/if}
	</div>
</Modal>

<style>
	.auth-list {
		display: flex;
		flex-direction: column;
		gap: 0.4em;
		margin-bottom: 1em;
	}
	.auth-row {
		display: flex;
		align-items: center;
		gap: 0.6em;
	}
	.auth-row input {
		flex: 1;
		min-width: 0;
		margin: 0;
	}
	.auth-date {
		font-size: 0.8em;
		opacity: 0.65;
		flex-shrink: 0;
	}
	.auth-row button.circle {
		flex-shrink: 0;
		margin: 0;
		border: none;
	}
	.qr {
		display: flex;
		justify-content: center;
		margin: 0 auto 0.5em;
		width: 12em;
		height: 12em;
		background-color: white;
		border-radius: 5px;
		padding: 0.4em;
	}
	.qr :global(svg) {
		width: 100%;
		height: 100%;
	}
	.secret-line {
		text-align: center;
		margin: 0 0 0.75em;
	}
	.secret {
		font-size: 0.85em;
		word-break: break-all;
		user-select: all;
	}
	form input {
		display: block;
		width: 100%;
		box-sizing: border-box;
		margin: 0 0 0.5em;
	}
	.recovery {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75em;
	}
	.recovery code {
		font-size: 1.5em;
		letter-spacing: 0.15em;
		user-select: all;
	}
	.error {
		color: crimson;
	}
</style>
