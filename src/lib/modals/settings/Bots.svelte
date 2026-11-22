<script>
	import Modal from "../../Modal.svelte";
	import PFP from "../../PFP.svelte";

	import {authHeader} from "../../stores.js";
	import {apiUrl} from "../../urls.js";
	import * as modals from "../../modals.js";

	import {onMount} from "svelte";

	// list | token
	let view = "list";
	let bots = [];
	let loading = false;
	let error = "";

	// create flow
	let newName = "";
	let newDesc = "";

	// per-bot expand (edit description / actions)
	let expanded = null;
	let editDesc = "";

	// pending destructive action needing a 2FA code
	// {kind: "delete"|"regen", bot}
	let pending = null;
	let totpCode = "";

	// one-time token reveal (create / regenerate)
	let shownToken = "";
	let shownFor = "";
	let copied = false;

	class ApiError extends Error {
		constructor(type, status) {
			super(type || `code ${status}`);
			this.type = type;
			this.status = status;
		}
	}

	function friendly(e) {
		return (
			{
				mfaRequired: "Enter the 6-digit code from your authenticator app.",
				invalidTOTPCode: "That code didn't work.",
				usernameExists: "That name is already taken.",
				illegalCharacters: "That name isn't allowed.",
				tooManyBots: "You already own the maximum number of bots.",
				nameImmutable: "Bot names can't be changed.",
				notFound: "Bot not found.",
				botsCannotManageBots: "Bots can't manage bots.",
			}[e.type] ||
			(e.status === 429
				? "Too many attempts! Please try again later."
				: `Response code is not OK; code is ${e.status}`)
		);
	}

	async function api(path, method = "GET", body = undefined) {
		const resp = await fetch(`${apiUrl}${path}`, {
			method,
			headers: {"Content-Type": "application/json", ...$authHeader},
			body: body !== undefined ? JSON.stringify(body) : undefined,
		});
		const json = await resp.json().catch(() => ({}));
		if (!resp.ok) throw new ApiError(json.type, resp.status);
		return json;
	}

	async function loadBots() {
		try {
			bots = (await api("bots/")).bots || [];
		} catch (e) {
			error = friendly(e);
		}
	}

	async function expand(bot) {
		if (expanded === bot.id) {
			expanded = null;
			return;
		}
		expanded = bot.id;
		editDesc = bot.description || "";
		try {
			const detail = await api(`bots/${bot.id}`);
			bot.description = detail.description;
			editDesc = detail.description || "";
			bots = bots;
		} catch (e) {
			error = friendly(e);
		}
	}

	async function submit(fn) {
		loading = true;
		error = "";
		try {
			await fn();
		} catch (e) {
			if (e instanceof ApiError && e.type === "mfaRequired" && pending) {
				error = friendly(e);
			} else {
				error = friendly(e);
				pending = null;
			}
		}
		loading = false;
	}

	const createBot = () =>
		submit(async () => {
			const json = await api("bots/", "POST", {
				name: newName.trim(),
				description: newDesc.trim(),
			});
			shownToken = json.token;
			shownFor = json.name;
			newName = "";
			newDesc = "";
			await loadBots();
			go("token");
		});

	async function saveDesc(bot, value) {
		value = value.trim();
		if (value === (bot.description || "")) return;
		try {
			const json = await api(`bots/${bot.id}`, "PATCH", {
				description: value,
			});
			bot.description = json.description;
			bots = bots;
		} catch (e) {
			error = friendly(e);
		}
	}

	// Destructive actions: retry automatically with the TOTP code once the
	// server says mfaRequired.
	function runPending(code) {
		const p = pending;
		return submit(async () => {
			const body = code ? {totp_code: code} : {};
			if (p.kind === "delete") {
				await api(`bots/${p.bot.id}`, "DELETE", body);
				pending = null;
				totpCode = "";
				await loadBots();
			} else {
				const json = await api(
					`bots/${p.bot.id}/token/regenerate`,
					"POST",
					body
				);
				pending = null;
				totpCode = "";
				shownToken = json.token;
				shownFor = p.bot.name;
				await loadBots();
				go("token");
			}
		});
	}

	function askDestructive(kind, bot) {
		pending = {kind, bot};
		totpCode = "";
		error = "";
		runPending("");
	}

	function go(next) {
		view = next;
		error = "";
		copied = false;
	}

	onMount(loadBots);
</script>

<Modal on:close={modals.closeLastModal}>
	<h2 slot="header">Bots</h2>
	<div slot="default">
		{#if view === "list"}
			{#if bots.length}
				<div class="bot-list">
					{#each bots as bot (bot.id)}
						<div class="bot-entry">
							<div class="bot-row">
								<PFP icon={1} avatar={bot.icon} size={0.8} />
								<button
									type="button"
									class="bot-name"
									on:click={() => expand(bot)}>{bot.name}</button
								>
								<button
									type="button"
									class="circle reload"
									title="Regenerate token"
									disabled={loading}
									on:click={() => askDestructive("regen", bot)}
								/>
								<button
									type="button"
									class="circle trash"
									title="Delete bot"
									disabled={loading}
									on:click={() => askDestructive("delete", bot)}
								/>
							</div>
							{#if expanded === bot.id}
								<div class="bot-detail">
									<input
										type="text"
										class="modal-input white"
										maxlength="250"
										placeholder="Description"
										bind:value={editDesc}
										on:keydown={e => {
											if (e.key === "Enter") e.target.blur();
											if (e.key === "Escape") {
												e.target.value =
													bot.description || "";
												e.target.blur();
											}
										}}
										on:blur={e => saveDesc(bot, e.target.value)}
									/>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{:else}
				<p>You don't own any bots yet.</p>
			{/if}
			{#if pending}
				<form
					class="mfa-form"
					on:submit|preventDefault={() =>
						runPending(totpCode.replace(/\s+/g, ""))}
				>
					<p>
						{#if pending.kind === "delete"}
							Delete <b>{pending.bot.name}</b>? This can't be undone.
						{:else}
							Regenerate token for <b>{pending.bot.name}</b>? The old
							token will stop working.
						{/if}
					</p>
					<input
						type="text"
						class="modal-input white"
						inputmode="numeric"
						autocomplete="one-time-code"
						placeholder="2FA code (if enabled)"
						maxlength="7"
						disabled={loading}
						bind:value={totpCode}
					/>
					<div class="modal-buttons">
						<button
							type="button"
							disabled={loading}
							on:click={() => {
								pending = null;
								error = "";
							}}>Cancel</button
						>
						<button type="submit" disabled={loading}
							>{pending.kind === "delete"
								? "Delete"
								: "Regenerate"}</button
						>
					</div>
				</form>
			{:else}
				<form
					on:submit|preventDefault={createBot}
					class="create-form"
				>
					<input
						type="text"
						class="modal-input white"
						maxlength="20"
						placeholder="Bot name"
						disabled={loading}
						bind:value={newName}
					/>
					<input
						type="text"
						class="modal-input white"
						maxlength="250"
						placeholder="Description"
						disabled={loading}
						bind:value={newDesc}
					/>
					<div class="modal-buttons">
						<span />
						<button
							type="submit"
							disabled={loading || !newName.trim()}>Create</button
						>
					</div>
				</form>
			{/if}
			{#if error}<p class="error">{error}</p>{/if}
		{:else if view === "token"}
			<p>
				Save this token for <b>{shownFor}</b> somewhere safe — it won't
				be shown again.
			</p>
			<div class="token-box">
				<code class="token">{shownToken}</code>
				<button
					type="button"
					on:click={async () => {
						try {
							await navigator.clipboard.writeText(shownToken);
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
	.bot-list {
		display: flex;
		flex-direction: column;
		gap: 0.4em;
		margin-bottom: 1em;
	}
	.bot-row {
		display: flex;
		align-items: center;
		gap: 0.6em;
	}
	.bot-name {
		flex: 1;
		min-width: 0;
		margin: 0;
		text-align: left;
		background: none;
		border: none;
		color: inherit;
		font-weight: bold;
	}
	.bot-detail {
		padding: 0.3em 0 0.3em 2.8em;
	}
	.bot-detail input {
		width: 100%;
		margin: 0;
	}
	.mfa-form,
	.create-form {
		display: flex;
		flex-direction: column;
		gap: 0.5em;
	}
	.token-box {
		display: flex;
		align-items: center;
		gap: 0.6em;
	}
	.token {
		flex: 1;
		min-width: 0;
		word-break: break-all;
		user-select: all;
	}
	.error {
		color: crimson;
		font-size: 0.9em;
	}
</style>
