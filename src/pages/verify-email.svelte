<!-- Landing page for the link in the verification email -->
<script>
	import Container from "../lib/Container.svelte";
	import {apiUrl} from "../lib/urls.js";
	import {authHeader} from "../lib/stores.js";
	import {refreshEmailState} from "../lib/emailGate.js";
	import {goto, params} from "@roxi/routify";
	import {onMount} from "svelte";

	let status = "working";
	let message = "";

	onMount(async () => {
		try {
			const resp = await fetch(`${apiUrl}me/email/verify`, {
				method: "POST",
				headers: {"Content-Type": "application/json", ...$authHeader},
				body: JSON.stringify({token: $params.token || ""}),
			});
			const json = await resp.json().catch(() => ({}));
			if (resp.ok) {
				status = "ok";
				refreshEmailState();
			} else {
				status = "error";
				message =
					json.type === "emailInUse"
						? "That email is already verified on another account."
						: resp.status === 429
						? "Too many attempts. Please try again later."
						: "This link is invalid or has expired. Request a new one from Settings.";
			}
		} catch {
			status = "error";
			message = "Couldn't reach the server. Please try again.";
		}
	});
</script>

<Container warning={status === "error"}>
	{#if status === "working"}
		<h1>Verifying...</h1>
	{:else if status === "ok"}
		<h1>Email verified</h1>
		<p>Thanks! Your account now has full access.</p>
		<button on:click={() => $goto("/home")}>Continue to Meower</button>
	{:else}
		<h1>Couldn't verify</h1>
		<p>{message}</p>
		<button on:click={() => $goto("/settings")}>Go to settings</button>
	{/if}
</Container>
