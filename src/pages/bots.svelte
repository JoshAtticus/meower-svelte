<!-- Manage your bot accounts -->
<script>
	import Container from "../lib/Container.svelte";
	import PFP from "../lib/PFP.svelte";

	import {authHeader, user} from "../lib/stores.js";
	import {apiUrl, uploadsUrl} from "../lib/urls.js";

	import {goto} from "@roxi/routify";
	import {onMount} from "svelte";

	let bots = [];
	let loaded = false;
	let error = "";
	let busy = false;

	// create
	let newName = "";
	let newDesc = "";

	// edit
	let editing = null; // bot id
	let form = {display_name: "", description: "", quote: ""};
	let avatarFile = null;
	let removeAvatar = false;

	// confirmation for destructive actions: {kind: "delete" | "regen", bot}
	let confirm = null;
	let typedName = "";
	let totp = "";
	let needTotp = false;

	// one-time token reveal
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

	const FRIENDLY = {
		mfaRequired: "Enter the 6-digit code from your authenticator app.",
		invalidTOTPCode: "That code didn't work.",
		usernameExists: "That name is already taken.",
		illegalCharacters: "That name isn't allowed.",
		tooManyBots: "You already own the maximum number of bots.",
		nameImmutable: "Bot names can't be changed.",
		notFound: "Bot not found.",
		botsCannotManageBots: "Bots can't manage bots.",
		invalidDisplayName: "That display name isn't allowed.",
		unableToClaimAvatar: "Couldn't use that picture.",
	};
	const friendly = e =>
		FRIENDLY[e.type] ||
		(e.status === 429
			? "Too many attempts! Please try again later."
			: `Something went wrong (${e.type || e.status}).`);

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

	async function run(fn) {
		busy = true;
		error = "";
		try {
			await fn();
		} catch (e) {
			error = friendly(e);
		}
		busy = false;
	}

	async function loadBots() {
		try {
			const list = (await api("bots/")).bots || [];
			// the list has no profile details: fetch them
			bots = await Promise.all(
				list.map(async b => {
					try {
						const [detail, profile] = await Promise.all([
							api(`bots/${b.id}`),
							fetch(`${apiUrl}users/${b.id}`).then(r => r.json()),
						]);
						return {
							...b,
							...detail,
							display_name: profile.display_name || "",
							quote: profile.quote || "",
							avatar_color: profile.avatar_color,
							pfp_data: profile.pfp_data,
						};
					} catch {
						return b;
					}
				})
			);
		} catch (e) {
			error = friendly(e);
		}
		loaded = true;
	}

	const createBot = () =>
		run(async () => {
			const json = await api("bots/", "POST", {
				name: newName.trim(),
				description: newDesc.trim(),
			});
			shownToken = json.token;
			shownFor = json.name;
			copied = false;
			newName = "";
			newDesc = "";
			await loadBots();
		});

	function startEdit(bot) {
		editing = editing === bot.id ? null : bot.id;
		form = {
			display_name: bot.display_name || "",
			description: bot.description || "",
			quote: bot.quote || "",
		};
		avatarFile = null;
		removeAvatar = false;
	}

	const saveEdit = bot =>
		run(async () => {
			const body = {
				display_name: form.display_name.trim(),
				description: form.description.trim(),
				quote: form.quote.trim(),
			};
			if (avatarFile) {
				const data = new FormData();
				data.append("file", avatarFile);
				const resp = await fetch(`${uploadsUrl}icons`, {
					method: "POST",
					headers: {Authorization: $authHeader.token},
					body: data,
				});
				if (!resp.ok) throw new ApiError("unableToClaimAvatar", resp.status);
				body.avatar = (await resp.json()).id;
			} else if (removeAvatar) {
				body.avatar = "";
			}
			await api(`bots/${bot.id}`, "PATCH", body);
			editing = null;
			await loadBots();
		});

	function ask(kind, bot) {
		confirm = {kind, bot};
		typedName = "";
		totp = "";
		needTotp = false;
		error = "";
	}

	const doConfirmed = () =>
		run(async () => {
			const {kind, bot} = confirm;
			const body = needTotp ? {totp_code: totp} : {};
			try {
				if (kind === "delete") {
					await api(`bots/${bot.id}`, "DELETE", body);
				} else {
					const json = await api(`bots/${bot.id}/token/regenerate`, "POST", body);
					shownToken = json.token;
					shownFor = bot.name;
					copied = false;
				}
			} catch (e) {
				if (e instanceof ApiError && e.type === "mfaRequired") {
					needTotp = true;
				}
				throw e;
			}
			confirm = null;
			await loadBots();
		});

	async function copyToken() {
		try {
			await navigator.clipboard.writeText(shownToken);
			copied = true;
		} catch {}
	}

	onMount(loadBots);
</script>

<div class="bots">
	<Container>
		<h1>Bots</h1>
	</Container>

	{#if error}
		<Container warning><b>{error}</b></Container>
	{/if}

	{#if shownToken}
		<Container>
			<h2>Token for {shownFor}</h2>
			<p>This token is shown once. Copy it now and keep it secret: anyone with it can act as the bot.</p>
			<code class="token">{shownToken}</code>
			<div class="actions">
				<button on:click={copyToken}>{copied ? "Copied" : "Copy token"}</button>
				<button class="grey" on:click={() => (shownToken = "")}>Done</button>
			</div>
		</Container>
	{/if}

	{#if confirm}
		<Container warning={confirm.kind === "delete"}>
			{#if confirm.kind === "delete"}
				<h2>Delete {confirm.bot.name}?</h2>
				<p>This permanently deletes the bot account and all of its posts. This can't be undone.</p>
				<p>Type <b>{confirm.bot.name}</b> to confirm.</p>
				<input type="text" class="modal-input white" bind:value={typedName} placeholder={confirm.bot.name} />
			{:else}
				<h2>Reset {confirm.bot.name}'s token?</h2>
				<p>The current token stops working immediately and the bot is disconnected. You will get a new token to put in your bot.</p>
			{/if}
			{#if needTotp}
				<p>Enter the 6-digit code from your authenticator app.</p>
				<input type="text" class="modal-input white" inputmode="numeric" maxlength="6" bind:value={totp} placeholder="123456" />
			{/if}
			<div class="actions">
				<button
					class:danger={confirm.kind === "delete"}
					disabled={busy || (confirm.kind === "delete" && typedName !== confirm.bot.name) || (needTotp && totp.length !== 6)}
					on:click={doConfirmed}
					>{confirm.kind === "delete" ? "Delete bot" : "Reset token"}</button
				>
				<button class="grey" disabled={busy} on:click={() => (confirm = null)}>Cancel</button>
			</div>
		</Container>
	{/if}

	<Container>
		<h2>Create a bot</h2>
		<form on:submit|preventDefault={createBot} class="create">
			<input type="text" class="modal-input white" maxlength="20" placeholder="Bot username" bind:value={newName} />
			<input type="text" class="modal-input white" maxlength="250" placeholder="Description (optional)" bind:value={newDesc} />
			<button type="submit" disabled={busy || !newName.trim()}>Create</button>
		</form>
	</Container>

	{#if !loaded}
		<Container>Loading...</Container>
	{:else if !bots.length}
		<Container><span class="sub">You don't have any bots yet.</span></Container>
	{/if}

	{#each bots as bot (bot.id)}
		<Container>
			<div class="bot-head">
				<PFP
					icon={bot.pfp_data ?? 1}
					avatar={bot.icon}
					avatarColor={bot.avatar_color}
					alt="{bot.name}'s profile picture"
					size={0.9}
				/>
				<div class="bot-names">
					<b>{bot.display_name || bot.name}</b>
					{#if bot.display_name}<span class="sub">@{bot.name}</span>{/if}
					{#if bot.description}<span class="sub">{bot.description}</span>{/if}
				</div>
			</div>
			<div class="actions">
				<button on:click={() => startEdit(bot)}>{editing === bot.id ? "Close" : "Edit profile"}</button>
				<button on:click={() => ask("regen", bot)} disabled={busy}>Reset token</button>
				<button class="danger" on:click={() => ask("delete", bot)} disabled={busy}>Delete</button>
			</div>
			{#if editing === bot.id}
				<form class="edit" on:submit|preventDefault={() => saveEdit(bot)}>
					<label>Display name <input type="text" class="modal-input white" maxlength="32" bind:value={form.display_name} /></label>
					<label>Description <input type="text" class="modal-input white" maxlength="250" bind:value={form.description} /></label>
					<label>Quote <input type="text" class="modal-input white" maxlength="360" bind:value={form.quote} /></label>
					<label>Profile picture
						<input type="file" accept="image/*" on:change={e => { avatarFile = e.target.files[0] || null; removeAvatar = false; }} />
					</label>
					{#if bot.icon && !avatarFile}
						<label class="inline"><input type="checkbox" bind:checked={removeAvatar} /> Remove current picture</label>
					{/if}
					<div class="actions">
						<button type="submit" disabled={busy}>Save</button>
						<button type="button" class="grey" on:click={() => (editing = null)}>Cancel</button>
					</div>
				</form>
			{/if}
		</Container>
	{/each}
</div>

<style>
	.sub {
		opacity: 0.7;
		font-size: 0.9em;
	}
	.link {
		background: none;
		border: none;
		padding: 0;
		margin: 0;
		color: var(--orange);
		cursor: pointer;
		font: inherit;
		text-decoration: underline;
	}
	.bot-head {
		display: flex;
		align-items: center;
		gap: 0.8em;
	}
	.bot-names {
		display: flex;
		flex-direction: column;
		min-width: 0;
		overflow-wrap: anywhere;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4em;
		margin-top: 0.6em;
	}
	.create,
	.edit {
		display: flex;
		flex-direction: column;
		gap: 0.5em;
		margin-top: 0.5em;
	}
	.edit label {
		display: flex;
		flex-direction: column;
		gap: 0.2em;
		font-size: 0.9em;
	}
	.edit label.inline {
		flex-direction: row;
		align-items: center;
		gap: 0.4em;
	}
	.token {
		display: block;
		padding: 0.5em;
		border: 1px solid rgba(128, 128, 128, 0.5);
		border-radius: 8px;
		overflow-wrap: anywhere;
		user-select: all;
	}
	.danger {
		background: crimson;
		border-color: crimson;
		color: white;
	}
	button.grey {
		background: rgba(128, 128, 128, 0.35);
		color: inherit;
	}
</style>
