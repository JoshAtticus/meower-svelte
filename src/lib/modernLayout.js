// New layout flag (on by default; opt out with "0"). Read once at startup; toggling reloads.
import {readable} from "svelte/store";
import "./modern/modern.css";

export const modernLayout = readable(
	typeof localStorage === "undefined" ||
		localStorage.getItem("meower_modern_layout") !== "0"
);

export function setModernLayout(on) {
	localStorage.setItem("meower_modern_layout", on ? "1" : "0");
	location.reload();
}
