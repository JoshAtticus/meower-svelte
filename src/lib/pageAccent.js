/**
 * Accent colour for the current page (hex without #), e.g. the profile colour
 * while viewing a profile. When set, it themes the whole app, including the
 * sidebar and popups. null means use the normal theme.
 */
import {writable} from "svelte/store";

export const pageAccent = writable(null);
