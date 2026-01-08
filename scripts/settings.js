export const MODULE_ID = 'dice-rng-protector';

// Hardcoded list of allowed users who can access settings, fudge dice, and tray
const ALLOWED_USERS = [
	"Ellev"
];

export class Settings {
	static fudgeValue = 'NORMAL';
	static getEnableFudgeDice() {
		return Settings.isAllowedUser();
	}
	static getEnableDiceTray() {
		return Settings.isAllowedUser();
	}
	static getEnableFudgeDicePool() {
		return true;
	}
	static getPoolSize() {
		return 20;
	}
	static isAllowedUser(userName = null) {
		const nameToCheck = userName || game.user?.name;
		return nameToCheck && ALLOWED_USERS.includes(nameToCheck);
	}
	
	static isLocalFudgeEnable() {
		return Settings.isAllowedUser() && Settings.getEnableFudgeDice();
	}
	
	static isLocalFudgePoolEnable() {
		return Settings.isAllowedUser() && Settings.getEnableFudgeDicePool();
	}
}