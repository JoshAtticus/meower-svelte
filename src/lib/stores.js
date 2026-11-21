/**
 * @file Stores, not to be confused with shops or those other stores.
 */

import {writable} from "svelte/store";
import unloadedProfile from "./unloadedprofile.js";
import {fallback as customThemeFallback} from "./CustomTheme.js";

// Used for setup screen
export const screen = writable("setup");
export const setupPage = writable("logo");

// Used for modal overlay
export const modalStack = writable([]);

// Used for the disconnected screen
export const intentionalDisconnect = writable(false);
export const reconnecting = writable(false);
// true once a reconnect has been failing for over 30 seconds
export const reconnectStalled = writable(false);
// timestamp of the last successful reconnect; pages resync when it changes
export const reconnectedAt = writable(0);
export const disconnected = writable(false);
export const disconnectReason = writable("");

// Last typed timestamp
export const lastTyped = writable(0);

// Relationships
export const relationships = writable({});

// Friends and friend requests
export const friends = writable({
	friends: [],
	incoming: [],
	outgoing: [],
});

// Chats
export const chats = writable([]);
export const chat = writable({
	_id: "",
	type: 0,
	nickname: "",
	owner: "",
	members: [],
	created: 0,
	last_active: 0,
	deleted: false,
});

// User list
export const ulist = writable([]);

// OOBE
export const OOBERunning = writable(false);
export const OOBEPage = writable(0);

// Current auth header
export const authHeader = writable({
	username: null,
	token: null,
});

// The current user profile
export const user = writable(unloadedProfile());

// Spinner thing
export const spinner = writable(false);

// What is this
export const windowStyle = writable({});
export const groupCats = writable(100);

// Custom theme
export const useCustomTheme = writable(false);
export const customTheme = writable(customThemeFallback);

// User moderation
export const pendingBanState = writable(null);
