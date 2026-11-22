const audio = new Audio("../src/assets/menu_notify.wav");

export function playNotification() {
	// Mix with other audio instead of taking over (iOS would otherwise pause
	// the user's music for every message sound)
	if (navigator.audioSession) {
		try {
			navigator.audioSession.type = "ambient";
		} catch (e) {}
	}
	audio.play();
}
