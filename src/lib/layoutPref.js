/**
 * Device-only sidebar layout. null means the layout syncs with the account
 * ($user.layout); "new" (side) or "old" (bottom) overrides it on this device.
 */
import {writable} from "svelte/store";

const KEY = "meower_local_layout";

export const localLayout = writable(localStorage.getItem(KEY));

localLayout.subscribe(value => {
	if (value) localStorage.setItem(KEY, value);
	else localStorage.removeItem(KEY);
});
