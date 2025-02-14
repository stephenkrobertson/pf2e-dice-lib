import { Settings } from './settings.js';
import { CryptoRandomGenerator } from './cryptoRandomGenerator.js';

export let cryptoRandomGenerator;

// Hooks.once('init', () => {
// 	Settings.registerSettings();
// });

Hooks.once('ready', () => {
	const allowedUsers = ["Ellev"];
	const isFudgeEnabledForUser = allowedUsers.includes(game.user.name);

	cryptoRandomGenerator = new CryptoRandomGenerator(isFudgeEnabledForUser, 20);
	CONFIG.Dice.randomUniform = () => cryptoRandomGenerator.getRandom();
	// Freeze the Dice class for players to avoid modification (harder to cheat)
	// if (!isFudgeEnabledForUser) {
	// 	Object.freeze(CONFIG.Dice);
	// }
});

Hooks.on('renderSidebarTab', (app, html, data) => {
	const allowedUsers = ["Ellev"];
	const isFudgeEnabledForUser = allowedUsers.includes(game.user.name);

	if (app.tabName !== "chat") return;
	
	if (isFudgeEnabledForUser || true) {
		let $chatForm = html.find('#chat-form');
		const template = 'modules/pf2e-dice-lib/templates/tray.html';
		const dataObject = {
			config: {
				enableFudgePool: false
			}
		};
		
		renderTemplate(template, dataObject).then(content => {
			if (content.length > 0) {
				let $content = $(content);
				$chatForm.after($content);
				// Update fudge factor setting when a radio button is clicked
				$content.find("input[type='radio']").on('click', event => {
					let value = $(event.currentTarget).attr('value');
					Settings.fudgeValue = value;
				});

				$content.find("button[data-fudge]").on('click', event => {
					let value = $(event.currentTarget).data('fudge');
					cryptoRandomGenerator.addFudge(value);
				});

				$content.find("button[data-fudge-clear]").on('click', event => {
					cryptoRandomGenerator.clearFudge();
				});
			}
		});
	}
});