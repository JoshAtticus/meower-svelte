<!-- routify:options bundle=false -->
<script>
	import Container from "../lib/Container.svelte";
	import PFP from "../lib/PFP.svelte";
	import LiText from "../lib/LiText.svelte";

	import DebugModal from "../lib/modals/Debug.svelte";
	import LogoutModal from "../lib/modals/Logout.svelte";
	import ServerSelectorModal from "../lib/modals/ServerSelector.svelte";
	import CreateChatModal from "../lib/modals/chats/CreateChat.svelte";
	import ChangePasswordModal from "../lib/modals/settings/ChangePassword.svelte";
	import CustomThemeModal from "../lib/modals/settings/CustomTheme.svelte";
	import DeleteAccountModal from "../lib/modals/settings/DeleteAccount.svelte";
	import LogoutEverywhereModal from "../lib/modals/settings/LogoutEverywhere.svelte";
	import SwitchBGMSFXModal from "../lib/modals/settings/SwitchBGMSFX.svelte";
	import SwitchThemeModal from "../lib/modals/settings/SwitchTheme.svelte";
	import BasicModal from "../lib/modals/Basic.svelte";
	import ConfirmActionModal from "../lib/modals/ConfirmAction.svelte";
	import ConfirmHyperlinkModal from "../lib/modals/ConfirmHyperlink.svelte";
	import ConnectionFailedModal from "../lib/modals/ConnectionFailed.svelte";
	import EditProfileModal from "../lib/modals/EditProfile.svelte";
	import EmailRequiredModal from "../lib/modals/EmailRequired.svelte";
	import LoginModal from "../lib/modals/Login.svelte";
	import SearchResultsModal from "../lib/modals/SearchResults.svelte";
	import SignupModal from "../lib/modals/Signup.svelte";
	import TwoFactorModal from "../lib/modals/TwoFactor.svelte";
	import RemoveFriendModal from "../lib/modals/RemoveFriend.svelte";
	import AccountBannedModal from "../lib/modals/safety/AccountBanned.svelte";
	import AccountCreationBlockedModal from "../lib/modals/safety/AccountCreationBlocked.svelte";
	import BlockUserModal from "../lib/modals/safety/BlockUser.svelte";
	import ChangeUsernameModal from "../lib/modals/settings/ChangeUsername.svelte";
	import EmailModal from "../lib/modals/settings/Email.svelte";
	import MyReportsModal from "../lib/modals/settings/MyReports.svelte";
	import NewLayoutTourModal from "../lib/modals/settings/NewLayoutTour.svelte";
	import TwoFactorSettingsModal from "../lib/modals/settings/TwoFactorSettings.svelte";

	import {OOBERunning, groupCats, user} from "../lib/stores.js";
	import * as clm from "../lib/clmanager.js";
	import * as modals from "../lib/modals.js";

	import version from "../lib/version.js";

	const allModals = [
		{name: "Debug", component: DebugModal},
		{name: "Logout", component: LogoutModal},
		{name: "Server selector", component: ServerSelectorModal},
		{name: "Create chat", component: CreateChatModal},
		{name: "Change password", component: ChangePasswordModal},
		{name: "Custom theme", component: CustomThemeModal},
		{name: "Delete account", component: DeleteAccountModal},
		{name: "Logout everywhere", component: LogoutEverywhereModal},
		{name: "Background music", component: SwitchBGMSFXModal},
		{name: "Switch theme", component: SwitchThemeModal},
		{name: "Basic message", component: BasicModal, data: {title: "Example", desc: "This is a basic message modal."}},
		{name: "Confirm action", component: ConfirmActionModal, data: {title: "Are you sure?", desc: "This does nothing.", confirmLabel: "Confirm", onConfirm: () => {}}},
		{name: "Confirm link", component: ConfirmHyperlinkModal, data: {link: "https://example.com"}},
		{name: "Connection failed", component: ConnectionFailedModal},
		{name: "Edit profile", component: EditProfileModal, data: {tab: "picture"}},
		{name: "Verify your email (gate popup)", component: EmailRequiredModal},
		{name: "Email settings", component: EmailModal},
		{name: "Login", component: LoginModal},
		{name: "Sign up", component: SignupModal},
		{name: "Search results", component: SearchResultsModal, data: {type: "users", query: "meower"}},
		{name: "Two-factor code prompt", component: TwoFactorModal, data: {onSubmit: async () => { throw "I:011 | Invalid Password"; }}},
		{name: "Two-factor settings", component: TwoFactorSettingsModal},
		{name: "Remove friend", component: RemoveFriendModal, data: {username: "EasterEgg"}},
		{name: "Block user", component: BlockUserModal, data: {username: "EasterEgg"}},
		{name: "Account restricted", component: AccountBannedModal, data: {ban: {state: "temp_restriction", restrictions: 2, expires: Math.floor(Date.now() / 1000) + 86400, reason: "Example reason"}, feature: "posting"}},
		{name: "Account banned", component: AccountBannedModal, data: {ban: {state: "temp_ban", restrictions: 0, expires: Math.floor(Date.now() / 1000) + 86400, reason: "Example reason"}, feature: ""}},
		{name: "Account creation blocked", component: AccountCreationBlockedModal},
		{name: "Change username", component: ChangeUsernameModal},
		{name: "My reports", component: MyReportsModal},
		{name: "New layout tour", component: NewLayoutTourModal},
	];
	let selectedModal = 0;

	const PFP_COUNT = 34;

	const pfps = new Array(PFP_COUNT).fill().map((_, i) => i + 1);
	let pfpSwitcher = false;

	let pfpOverflow = false;
	$: {
		const pfp = 1;
		pfpOverflow = pfp < 0 || pfp > PFP_COUNT;
	}

	let profileUsername = "EasterEgg";
	let profileQuote = "Quote Here";
	let profilePfp = 1;
	let profileQuoteEnabled = true;
</script>

<div>
	<Container>
		<h1>Look at that!</h1>
		You found a secret! Here you can mess around with a bit of Meower Svelte.
	</Container>
	<Container>
		<h1>Modals</h1>
		Pick a modal to open, or let fate decide (moderation, harmful and
		errored ones are left out).
		<br /><br />
		<select bind:value={selectedModal}>
			{#each allModals as modal, i}
				<option value={i}>{modal.name}</option>
			{/each}
		</select>
		<button on:click={() => modals.showModal(allModals[selectedModal].component, allModals[selectedModal].data)}
			>Show</button
		>
		<button
			on:click={() => {
				selectedModal = Math.floor(Math.random() * allModals.length);
				modals.showModal(allModals[selectedModal].component, allModals[selectedModal].data);
			}}>Random</button
		>
	</Container>
	<Container>
		<h1>Background Music</h1>
		Music that plays while you use Meower. So exciting
		<br /><br />
		<label>
			<input
				type="checkbox"
				bind:checked={$user.bgm}
				on:change={() => clm.updateProfile({bgm: $user.bgm})}
			/>
			Play background music
		</label>
		{#if $user.bgm}
			<br /><br />
			<button on:click={() => modals.showModal(SwitchBGMSFXModal)}
				>Change song</button
			>
		{/if}
	</Container>
	<Container>
		<h1>Group Cats</h1>
		Crash your browser by changing the amount of group cats! (Default is 200)

		<br /><br />

		<input
			type="number"
			placeholder="Enter a number"
			bind:value={$groupCats}
		/>
	</Container>
	<Container>
		<!--Posts, Profiles and Profile Views (Later on, maybe GC Member list and postlist)-->
		<h1>Make your own!</h1>
		Make your own profile, post, etc. with this!

		<br /><br />

		<Container>
			<h1>Profile</h1>

			Username
			<br />
			<input
				placeholder="Username"
				type="text"
				bind:value={profileUsername}
				class="modal-input white"
			/>
			<br /><br />

			Quote
			<br />
			<input
				placeholder="Quote"
				type="text"
				bind:value={profileQuote}
				class="modal-input white"
			/>
			<br /><br />

			Enable Quote
			<br />
			<input
				type="checkbox"
				bind:checked={profileQuoteEnabled}
				class="modal-input white"
			/>
			<br /><br />

			Profile Picture
			<br />
			{#if pfpSwitcher}
				<Container>
					<h2>Profile Picture</h2>
					<div id="pfp-list">
						{#if pfpOverflow && profilePfp < 0}
							<button
								on:click={() => {
									pfpSwitcher = false;
								}}
								class="pfp selected"
								><PFP
									online={false}
									icon={profilePfp}
									alt="Profile picture {profilePfp}"
								/></button
							>
						{/if}
						{#each pfps as pfp}
							<button
								on:click={() => {
									profilePfp = pfp;
								}}
								class="pfp"
								class:selected={profilePfp === pfp}
								><PFP
									online={false}
									icon={pfp}
									alt="Profile picture {pfp}"
								/></button
							>
						{/each}
						{#if pfpOverflow && profilePfp > 0}
							<button class="pfp selected"
								><PFP
									online={false}
									icon={profilePfp}
									alt="Profile picture {profilePfp}"
								/></button
							>
						{/if}
					</div>
					<br /><br />
					<button
						class="long"
						title="Close"
						on:click={() => (pfpSwitcher = false)}>Close</button
					>
				</Container>
			{:else}
				<button
					class="long"
					title="Change Profile Picture"
					on:click={() => (pfpSwitcher = true)}
					>Change Profile Picture</button
				>
			{/if}
			<br /><br />

			<Container>
				<div class="profile-header">
					<PFP
						online={false}
						icon={profilePfp}
						alt="{profileUsername}'s profile picture"
						size={1.4}
					/>
					<div class="profile-header-info">
						<h1 class="profile-username">
							<LiText text={profileUsername} />
						</h1>
						<div class="profile-active">Offline</div>
					</div>
				</div>
			</Container>

			{#if profileQuoteEnabled}
				<Container>
					<h3>Quote</h3>
					<p>"<i>{profileQuote}</i>"</p>
				</Container>
			{/if}
		</Container>

		<Container>
			<h1>Post</h1>
			Coming soon!
		</Container>
	</Container>
	<Container>
		<h1>OOBE</h1>
		Wanna see the OOBE?

		<br /><br />

		<button on:click={() => ($OOBERunning = true)}>Click me</button>
	</Container>
	<!--<Container>
        <h1>Internal/Debug Info</h1>
        Want a look inside Svelte? Here you go!


    </Container>-->
	Meower Svelte {version}
</div>

<style>
	.long {
		width: 100%;
		margin: 0;
		margin-bottom: 0.2em;
	}

	.pfp {
		padding: 0.2em;
		margin: 0.2em;
		border-radius: 1.45em;
		display: inline-block;
		background: none;
		border: none;
	}
	:global(main.input-hover) .pfp:hover,
	:global(main.input-touch) .pfp:active {
		background-color: var(--orange-light);
	}
	/* cst todo: fix shadow appearing when activating then unhovering because i gtg*/
	:global(:root main.input-hover) .pfp:active {
		background-color: var(--orange-dark);
	}
	:global(main) .pfp.selected {
		background-color: var(--orange);
	}
	#pfp-list {
		display: flex;
		flex-wrap: wrap;
	}

	.profile-header-info {
		margin-left: 1em;
		height: 6em;
	}

	.profile-active {
		font-style: italic;
	}

	.profile-username {
		margin: 0;
		display: inline-block;
		max-width: 100%;
		font-size: 3em;
	}

	.profile-header {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
	}
</style>
