<!-- Forward a post to Home or one of your chats -->
<script>
	import Modal from "../Modal.svelte";

	import {authHeader, chats, user} from "../stores.js";
	import {apiUrl} from "../urls.js";
	import * as modals from "../modals.js";
	import {goto} from "@roxi/routify";

	export let modalData = {};
	const post = modalData.post;

	let filter = "";
	let comment = "";
	let sending = null; // destination id
	let error = "";

	$: destinations = [
		{id: "home", name: "Home"},
		...$chats
			.map(c => ({
				id: c._id,
				name:
					c.type === 1
						? "@" + (c.members.find(m => m !== $user.name) || "DM")
						: c.nickname || "Group chat",
			}))
			.sort((a, b) => a.name.localeCompare(b.name)),
	].filter(d => d.name.toLowerCase().includes(filter.trim().toLowerCase()));

	function buildContent() {
		const quoted = (post.content || "")
			.split("\n")
			.map(line => "> " + line)
			.join("\n");
		const extra = (post.attachments || []).length
			? `\n> (${post.attachments.length} attachment${post.attachments.length === 1 ? "" : "s"} not included)`
			: "";
		const head = `${comment.trim()}${comment.trim() ? "\n\n" : ""}Forwarded from @${post.user}:\n`;
		return (head + quoted + extra).slice(0, 4000);
	}

	async function forward(dest) {
		if (sending) return;
		sending = dest.id;
		error = "";
		try {
			const resp = await fetch(
				dest.id === "home" ? `${apiUrl}home` : `${apiUrl}posts/${dest.id}`,
				{
					method: "POST",
					headers: {"Content-Type": "application/json", ...$authHeader},
					body: JSON.stringify({
						content: buildContent(),
						nonce: Math.random().toString(),
						stickers: [],
						attachments: [],
					}),
				}
			);
			if (!resp.ok) {
				const json = await resp.json().catch(() => ({}));
				throw new Error(
					json.type === "missingPermission"
						? "You can't send messages there."
						: resp.status === 429
						? "Too many requests! Try again later."
						: "Couldn't forward the message."
				);
			}
			modals.closeLastModal();
			$goto(dest.id === "home" ? "/home" : `/chats/${dest.id}`);
		} catch (e) {
			error = e.message;
			sending = null;
		}
	}
</script>

<Modal showClose={true} on:close={modals.closeLastModal}>
	<h2 slot="header">Forward message</h2>
	<div slot="default" class="forward">
		<p class="preview">
			<b>@{post.user}</b>
			{(post.content || "").slice(0, 160)}{(post.content || "").length > 160 ? "..." : ""}
		</p>
		<input
			type="text"
			class="modal-input white"
			placeholder="Add a comment (optional)"
			maxlength="500"
			bind:value={comment}
		/>
		<input
			type="search"
			class="modal-input white"
			placeholder="Search chats"
			bind:value={filter}
		/>
		<div class="list">
			{#each destinations as dest (dest.id)}
				<button type="button" class="dest" disabled={!!sending} on:click={() => forward(dest)}>
					<span class="name">{dest.name}</span>
					<span class="send">{sending === dest.id ? "Sending..." : "Send"}</span>
				</button>
			{:else}
				<p class="note">No chats found.</p>
			{/each}
		</div>
		{#if error}<p class="err">{error}</p>{/if}
	</div>
</Modal>

<style>
	.forward {
		display: flex;
		flex-direction: column;
		gap: 0.5em;
		min-width: min(26em, 80vw);
	}
	.preview {
		margin: 0;
		padding: 0.4em 0.6em;
		border-left: 4px solid var(--orange);
		opacity: 0.85;
		overflow-wrap: anywhere;
	}
	input {
		width: 100%;
		box-sizing: border-box;
	}
	.list {
		max-height: 40vh;
		overflow-y: auto;
	}
	.dest {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		margin: 0 0 0.25em;
		padding: 0.5em 0.7em;
		border: 1px solid rgba(128, 128, 128, 0.35);
		border-radius: 8px;
		background: transparent;
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}
	.send {
		color: var(--orange);
		font-weight: 600;
	}
	.note {
		opacity: 0.7;
	}
	.err {
		color: crimson;
		margin: 0;
	}
</style>
