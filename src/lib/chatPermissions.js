// Client mirror of server/chat_permissions.py — keep semantics identical.
export const PERMISSIONS = [
	{key: "send_messages", tier: 0, label: "Send messages"},
	{key: "delete_own_messages", tier: 0, label: "Delete own messages"},
	{key: "invite_members", tier: 0, label: "Invite members"},
	{key: "add_emotes", tier: 0, label: "Add emojis & stickers"},
	{key: "edit_emotes", tier: 0, label: "Edit emojis & stickers"},
	{key: "delete_emotes", tier: 0, label: "Delete emojis & stickers"},
	{key: "change_color", tier: 0, label: "Change group colour"},
	{key: "change_name", tier: 0, label: "Change group name"},
	{key: "change_icon", tier: 0, label: "Change group icon"},
	{key: "delete_icon", tier: 0, label: "Remove group icon"},
	{key: "pin_messages", tier: 0, label: "Pin messages"},
	{key: "unpin_messages", tier: 0, label: "Unpin messages"},
	{key: "add_reactions", tier: 0, label: "Add new reactions"},
	{key: "share_posts", tier: 0, label: "Share messages"},
	{key: "react", tier: 0, label: "React to existing reactions"},
	{key: "edit_messages", tier: 0, label: "Edit own messages"},
	{key: "delete_others_messages", tier: 1, label: "Delete others' messages"},
	{key: "remove_members", tier: 1, label: "Remove members"},
	{key: "ban_members", tier: 2, label: "Ban members"},
	{key: "modify_roles", tier: 2, label: "Edit roles"},
	{key: "assign_roles", tier: 2, label: "Assign roles"},
	{key: "change_settings", tier: 3, label: "Change group settings"},
	{key: "create_roles", tier: 3, label: "Create roles"},
	{key: "delete_roles", tier: 3, label: "Delete roles"},
	{key: "toggle_invites", tier: 3, label: "Turn invites on/off"},
];
const PERM_TIERS = Object.fromEntries(
	PERMISSIONS.map(p => [p.key, p.tier])
);
export const OWNER_RANK = 5;
export const ADMIN_TIER = 4;

const PERM_KEYS = PERMISSIONS.map(p => p.key);

function isGroup(chat) {
	return chat && chat.type === 0;
}

export function roleEffective(chat, role) {
	if (!isGroup(chat) || !role) return new Set();
	if (role.tier >= ADMIN_TIER) return new Set(PERM_KEYS);
	if (role.tier < 0) return new Set(); // cosmetic roles grant nothing
	const effective = new Set();
	for (const other of chat.roles || []) {
		if (other.tier >= 0 && other.tier < role.tier) {
			for (const [perm, val] of Object.entries(
				other.permissions || {}
			)) {
				if (val === true) effective.add(perm);
			}
		}
	}
	for (const [perm, val] of Object.entries(role.permissions || {})) {
		if (val === true) effective.add(perm);
	}
	for (const [perm, val] of Object.entries(role.permissions || {})) {
		if (val === false) effective.delete(perm);
	}
	return effective;
}

// Whether any role with tier < role.tier explicitly allows `perm`
// (what selecting "Inherit" would yield for a non-administrator role).
export function inheritsPerm(chat, role, perm) {
	if (!isGroup(chat) || !role) return false;
	return (chat.roles || []).some(
		other =>
			other.tier >= 0 &&
			other.tier < role.tier &&
			other.permissions?.[perm] === true
	);
}

export function memberPermissions(chat, username) {
	if (!isGroup(chat)) return new Set();
	if (username === chat.owner) return new Set(PERM_KEYS);
	if (!(chat.members || []).includes(username)) return new Set();
	const roles = Object.fromEntries(
		(chat.roles || []).map(r => [r._id, r])
	);
	const perms = new Set();
	for (const roleId of chat.member_roles?.[username] || []) {
		const role = roles[roleId];
		if (role) {
			for (const perm of roleEffective(chat, role)) perms.add(perm);
		}
	}
	return perms;
}

export function has(chat, username, perm) {
	return memberPermissions(chat, username).has(perm);
}

export function rank(chat, username) {
	if (!isGroup(chat)) return -1;
	if (username === chat.owner) return OWNER_RANK;
	const roles = Object.fromEntries(
		(chat.roles || []).map(r => [r._id, r])
	);
	const tiers = (chat.member_roles?.[username] || [])
		.filter(roleId => roles[roleId])
		.map(roleId => roles[roleId].tier);
	return tiers.length ? Math.max(...tiers) : -1;
}

export function outranks(chat, actor, target) {
	return rank(chat, actor) > rank(chat, target);
}

export function canManageRole(chat, actor, role) {
	if (!isGroup(chat) || !role) return false;
	if (role._id === "administrator") return false;
	if (chat.owner === actor || rank(chat, actor) >= ADMIN_TIER) return true;
	return role.tier < rank(chat, actor);
}

export function canGrantPerm(chat, actor, permKey) {
	if (!isGroup(chat)) return false;
	if (chat.owner === actor || rank(chat, actor) >= ADMIN_TIER) return true;
	return PERM_TIERS[permKey] < rank(chat, actor);
}

export function highestRole(chat, username) {
	if (!isGroup(chat)) return null;
	const roles = Object.fromEntries(
		(chat.roles || []).map(r => [r._id, r])
	);
	let best = null;
	let override = null;
	for (const roleId of chat.member_roles?.[username] || []) {
		const role = roles[roleId];
		if (!role) continue;
		// ties go to the most recently given role (member_roles is append-ordered)
		if (!best || role.tier >= best.tier) best = role;
		if (role.display_override) override = role;
	}
	// a cosmetic override role wins over everything else
	return override || best;
}

export function canAssignRole(chat, actor, target, role) {
	if (!isGroup(chat) || !role) return false;
	if (!has(chat, actor, "assign_roles")) return false;
	if (actor !== chat.owner && (actor === target || !outranks(chat, actor, target)))
		return false;
	if (role._id === "administrator") {
		return actor === chat.owner && target !== chat.owner;
	}
	return canManageRole(chat, actor, role);
}

// CSS for a role's name colour: 1 colour = solid, 2 = left-to-right gradient
export function colorsStyle(colors) {
	if (!colors || !colors.length) return "";
	if (colors.length === 1) return `color: #${colors[0]};`;
	return (
		`background-image: linear-gradient(90deg, #${colors[0]}, #${colors[1]});` +
		"-webkit-background-clip: text; background-clip: text;" +
		"-webkit-text-fill-color: transparent; color: transparent;"
	);
}

// Name style for a member: their coloured role with the highest tier; ties go
// to the role they were given most recently (member_roles is append-ordered)
export function nameColorStyle(chat, username) {
	if (!isGroup(chat)) return "";
	const roles = Object.fromEntries((chat.roles || []).map(r => [r._id, r]));
	// a display_override role always wins, colours or not
	const assigned = chat.member_roles?.[username] || [];
	const override = assigned.map(id => roles[id]).filter(r => r?.display_override).pop();
	if (override) return colorsStyle(override.colors);
	let best = null;
	let bestIndex = -1;
	assigned.forEach((roleId, index) => {
		const role = roles[roleId];
		if (!role || !(role.colors || []).length) return;
		if (
			!best ||
			role.tier > best.tier ||
			(role.tier === best.tier && index > bestIndex)
		) {
			best = role;
			bestIndex = index;
		}
	});
	return best ? colorsStyle(best.colors) : "";
}
