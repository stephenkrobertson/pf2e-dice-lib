import { Settings } from './settings.js';
import { CryptoRandomGenerator } from './cryptoRandomGenerator.js';

export let cryptoRandomGenerator;

function applyListeners(html) {
	const dataObject = {
			config: {
				enableFudgePool: Settings.isLocalFudgePoolEnable()
			}
		};
	
	let $chatForm;
	let renderTemplateFn;
	if (foundry.utils.isNewerVersion(game.version, 13)) {
		$chatForm = html.querySelector('.chat-form');
		renderTemplateFn = foundry.applications.handlebars.renderTemplate;

	} else {
		$chatForm = html[0].querySelector('#chat-form');
		renderTemplateFn= renderTemplate;
	}

	renderTemplateFn("modules/pf2e-dice-lib/templates/tray.html", dataObject)
		.then(content => {
			if (content.length > 0) {
				$chatForm.insertAdjacentHTML('afterend', content);
				
				// Update fudge factor setting when a radio button is clicked
				const diceTray = $chatForm.nextElementSibling;

				const syncButton = diceTray.querySelector('input[type="checkbox"][id=dcp-sync]');
				syncButton.addEventListener("click", (event) => {
					if (event.currentTarget.checked) {
						event.currentTarget.parentElement.title = game.i18n.localize('dcp.SyncWithPlayer');
						cryptoRandomGenerator.sendSetFudge(Settings.fudgeValue);
					} else {
						event.currentTarget.parentElement.title = game.i18n.localize('dcp.NotSyncWithPlayer');
						cryptoRandomGenerator.sendReset();
					}
				});

				const diceButtons = diceTray.querySelectorAll('input[type="radio"][id^=dcp-dice-]');
				
				diceButtons.forEach((radio) => {
					radio.addEventListener("click", (event) => {
						Settings.fudgeValue = event.currentTarget.value;
						if (syncButton.checked) {
							cryptoRandomGenerator.sendSetFudge(event.currentTarget.value);
						}
					});
				});

				if (Settings.isLocalFudgePoolEnable()) {
					const fudgeButtons = diceTray.nextElementSibling.querySelectorAll('button.dcp-fudge');
					fudgeButtons.forEach((button) => {
						button.addEventListener("click", (event) => {
							event.preventDefault();
							const dataset = event.currentTarget.dataset;
							
							if (dataset.fudgeClear === undefined) {
								cryptoRandomGenerator.addFudge(dataset.fudge);
								if (syncButton.checked) {
									cryptoRandomGenerator.sendAddFudge(dataset.fudge);
								}
							} else {
								cryptoRandomGenerator.clearFudge();
								if (syncButton.checked) {
									cryptoRandomGenerator.sendClearFudge();
								}
							}
						});
					
					});
				}
			}
		});
}

Hooks.once('init', () => {
	if (foundry.utils.isNewerVersion(game.version, 13)) {
		foundry.applications.handlebars.loadTemplates(['modules/pf2e-dice-lib/templates/tray.html']);
	}
});

Hooks.once('ready', () => {
	cryptoRandomGenerator = new CryptoRandomGenerator(Settings.getEnableFudgeDice(), Settings.getPoolSize());
	CONFIG.Dice.randomUniform = () => cryptoRandomGenerator.getRandom();
	CONFIG.Dice.fulfillment.methods.mersenne.handler = term => term.mapRandomFace(cryptoRandomGenerator.getRandom());
	
	// Freeze the Dice class for non-allowed users to avoid modification (harder to cheat)
	if (!Settings.isAllowedUser()) {
		Object.freeze(CONFIG.Dice);
		Object.freeze(CONFIG.Dice.fulfillment.methods.mersenne.handler);
	}
});

Hooks.on("renderChatLog", async (chatlog, html, data, opt) => {
	if (foundry.utils.isNewerVersion(game.version, 13) && !opt.isFirstRender) return;
	if (!Settings.isAllowedUser()) return;

	applyListeners(html);
});

Hooks.on('userConnected', (user, connected) => {
	if (!Settings.isAllowedUser()) {
		if (Settings.isAllowedUser(user.name) && connected === false) {
            Settings.fudgeValue = 'NORMAL';
            cryptoRandomGenerator.clearFudge();
		}
	}
 });