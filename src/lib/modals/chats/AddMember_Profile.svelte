<script>
	import Modal from "../../Modal.svelte";
	import Container from "../../Container.svelte";

	import {authHeader, chats} from "../../stores.js";
	import {apiUrl} from "../../urls.js";
	import * as modals from "../../modals.js";

	export let modalData;

	let {username} = modalData;

	let loading = {},
		invited = {},
		errors = {};
</script>

<Modal showClose={true} on:close={modals.closeLastModal}>
	<h2 slot="header">Invite to Chat</h2>
	<div slot="default">
		{#each $chats.filter(_chat => _chat.type === 0) as chat (chat._id)}
			<Container>
				<div class="settings-controls">
					{#if !chat.members.includes(username)}
						<button
							class="circle {invited[chat._id] ? 'check' : 'add'}"
							disabled={loading[chat._id] ||
								invited[chat._id] ||
								chat.members.length >= 256}
							on:click={async () => {
								errors[chat._id] = "";
								loading[chat._id] = true;
								try {
									const resp = await fetch(
										`${apiUrl}chats/${chat._id}/invites`,
										{
											method: "POST",
											headers: {
												"Content-Type":
													"application/json",
												...$authHeader,
											},
											body: JSON.stringify({username}),
										}
									);
									if (!resp.ok) {
										const json = await resp
											.json()
											.catch(() => null);
										switch (json && json.type) {
											case "chatBanned":
												throw new Error(
													`${username} is banned from ${chat.nickname}.`
												);
											case "inviteAlreadyExists":
												throw new Error(
													`${username} already has a pending invite.`
												);
											case "chatMemberAlreadyExists":
												throw new Error(
													`${username} is already a member of ${chat.nickname}.`
												);
										}
										switch (resp.status) {
											case 403:
												throw new Error(
													`Someone's privacy settings are preventing you from inviting ${username} to ${chat.nickname}.`
												);
											case 404:
												throw new Error(
													`${username} not found.`
												);
											case 429:
												throw new Error(
													"Too many requests! Try again later."
												);
											default:
												throw new Error(
													"Response code is not OK; code is " +
														resp.status
												);
										}
									}
									invited[chat._id] = true;
								} catch (e) {
									errors[chat._id] = e;
								}
								loading[chat._id] = false;
							}}
						/>
					{/if}
				</div>

				<h1>{chat.nickname}</h1>
				Members: {chat.members.length > 5
					? chat.members.slice(0, 4).join(", ") + "..."
					: chat.members.join(", ")}

				{#if errors[chat._id]}
					<p style="color: crimson;">{errors[chat._id]}</p>
				{/if}
			</Container>
		{/each}
	</div>
</Modal>
