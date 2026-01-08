import { Settings, MODULE_ID } from './settings.js';

// Generates random number using a cryptographic method
export class CryptoRandomGenerator {
    SOCKET_ACTION_SETFUDGE = 'sf';
    SOCKET_ACTION_ADDFUDGE = 'af';
    SOCKET_ACTION_CLEARFUDGE = 'cf';
    SOCKET_ACTION_RESET = 'r';

    DICE_MIN = 0.999;
    DICE_MAX = 0.001;

    #isFudgeEnable;

    // Fudge pool (user values)
    #fudgePool;

    // Cryptographic random values pool
    #pool;

	constructor(isFudgeEnable, poolSize = 10) {
		this.#isFudgeEnable = isFudgeEnable;
        this.#fudgePool = [];
		this.#pool = [];
        this.poolSize = poolSize;

		this.#generatePool();
        this.setupSocket();
	}

    setupSocket() {
        if (!game.socket) {
            console.error(`[${MODULE_ID}] game.socket is not available!`);
            return;
        }
        
        const socketName = `module.${MODULE_ID}`;
        console.log(`[${MODULE_ID}] Setting up socket listener on: ${socketName}`);
        console.log(`[${MODULE_ID}] Current user: ${game.user?.name}, isAllowedUser: ${Settings.isAllowedUser()}`);
        console.log(`[${MODULE_ID}] game.socket available:`, !!game.socket);
        console.log(`[${MODULE_ID}] game.socket.emit available:`, typeof game.socket.emit === 'function');
        console.log(`[${MODULE_ID}] game.socket.on available:`, typeof game.socket.on === 'function');
        
        game.socket.on(socketName, async (data) => {
            console.log(`[${MODULE_ID}] Socket received message:`, data);
            console.log(`[${MODULE_ID}] isAllowedUser: ${Settings.isAllowedUser()}, will process: ${!Settings.isAllowedUser()}`);
            
            if (!Settings.isAllowedUser()) {
                console.log(`[${MODULE_ID}] Processing action: ${data.action}`);
                if (data.action === this.SOCKET_ACTION_SETFUDGE) {
                    console.log(`[${MODULE_ID}] Setting fudge value to: ${data.fudge}`);
                    Settings.fudgeValue = data.fudge;
                } else if (data.action === this.SOCKET_ACTION_ADDFUDGE) {
                    console.log(`[${MODULE_ID}] Adding fudge to pool: ${data.fudge}`);
                    this.#pushFudge(data.fudge);
                } else if (data.action === this.SOCKET_ACTION_CLEARFUDGE) {
                    console.log(`[${MODULE_ID}] Clearing fudge pool`);
                    this.clearFudge();
                } else if (data.action === this.SOCKET_ACTION_RESET) {
                    console.log(`[${MODULE_ID}] Resetting fudge value to NORMAL`);
                    Settings.fudgeValue = 'NORMAL';
                    this.clearFudge();
                }
            } else {
                console.log(`[${MODULE_ID}] Ignoring message (user is allowed, should only receive, not process)`);
            }
        });
        
        console.log(`[${MODULE_ID}] Socket listener registered successfully`);
      }

	#generatePool() {
		let buffer = new ArrayBuffer(this.poolSize * 8);
		let ints = new Int8Array(buffer);
		window.crypto.getRandomValues(ints);

		for (let i = 0; i < this.poolSize; i++) {
			ints[i * 8 + 7] = 63;
			ints[i * 8 + 6] |= 0xf0;
			let view = new DataView(buffer, i * 8, 8);
			this.#pool.push(view.getFloat64(0, true) - 1);
		}
	}

    #pushFudge(fudge) {
        switch (fudge) {
            case "MINIMAL":
                this.#fudgePool.push(this.DICE_MIN);
                break;
            case "MAXIMAL":
                this.#fudgePool.push(this.DICE_MAX);
                break;
            case "LOW":
                this.#fudgePool.push(Math.min(Math.pow(this.#readPool(), 0.5), this.DICE_MIN));
                break;
            case "HIGH":
                this.#fudgePool.push(Math.max(Math.pow(this.#readPool(), 2), this.DICE_MAX));
                break;
        }
    }

    #readPool() {
        if (this.#pool.length === 0) {
			this.#generatePool();
		}

		return this.#pool.shift();
    }

    clearFudge() {
        this.#fudgePool.splice(0 ,this.#fudgePool.length)
    }

	getRandom() {
        if (!this.#isFudgeEnable && Settings.fudgeValue === 'NORMAL') {
            return this.#readPool();
        }

        if (this.#fudgePool.length > 0) {
            return this.#fudgePool.shift();
        }

		switch (Settings.fudgeValue) {
			case "MINIMAL":
                return this.DICE_MIN;
            case "MAXIMAL":
				return this.DICE_MAX;
            case "LOW":
                return Math.min(Math.pow(this.#readPool(), 0.5), this.DICE_MIN);
            case "HIGH":
                return Math.max(Math.pow(this.#readPool(), 2), this.DICE_MAX);
			default:
				return this.#readPool();
		}
	}

    addFudge(fudge) {
        const enableFudgePool = this.#isFudgeEnable

        if (enableFudgePool) {
            this.#pushFudge(fudge);
        }
    }

    sendSetFudge(value) {
        console.log(`[${MODULE_ID}] sendSetFudge called with value: ${value}`);
        console.log(`[${MODULE_ID}] isAllowedUser: ${Settings.isAllowedUser()}`);
        if (!Settings.isAllowedUser()) {
            console.log(`[${MODULE_ID}] sendSetFudge: User not allowed, not sending`);
            return;
        }
        if (!game.socket) {
            console.error(`[${MODULE_ID}] sendSetFudge: game.socket is not available!`);
            return;
        }
        const socketName = `module.${MODULE_ID}`;
        const payload = {
          action: this.SOCKET_ACTION_SETFUDGE,
          fudge: value
        };
        console.log(`[${MODULE_ID}] Emitting to socket: ${socketName}`, payload);
        console.log(`[${MODULE_ID}] game.socket.emit type:`, typeof game.socket.emit);
        try {
            game.socket.emit(socketName, payload);
            console.log(`[${MODULE_ID}] Socket emit completed successfully`);
        } catch (error) {
            console.error(`[${MODULE_ID}] Socket emit error:`, error);
        }
    }

    sendAddFudge(value) {
        console.log(`[${MODULE_ID}] sendAddFudge called with value: ${value}`);
        if (!Settings.isAllowedUser()) {
            console.log(`[${MODULE_ID}] sendAddFudge: User not allowed, not sending`);
            return;
        }
        const socketName = `module.${MODULE_ID}`;
        const payload = {
          action: this.SOCKET_ACTION_ADDFUDGE,
          fudge: value
        };
        console.log(`[${MODULE_ID}] Emitting to socket: ${socketName}`, payload);
        game.socket.emit(socketName, payload);
        console.log(`[${MODULE_ID}] Socket emit completed`);
    }

    sendClearFudge() {
        console.log(`[${MODULE_ID}] sendClearFudge called`);
        if (!Settings.isAllowedUser()) {
            console.log(`[${MODULE_ID}] sendClearFudge: User not allowed, not sending`);
            return;
        }
        const socketName = `module.${MODULE_ID}`;
        const payload = {
          action: this.SOCKET_ACTION_CLEARFUDGE
        };
        console.log(`[${MODULE_ID}] Emitting to socket: ${socketName}`, payload);
        game.socket.emit(socketName, payload);
        console.log(`[${MODULE_ID}] Socket emit completed`);
    }

    sendReset() {
        console.log(`[${MODULE_ID}] sendReset called`);
        if (!Settings.isAllowedUser()) {
            console.log(`[${MODULE_ID}] sendReset: User not allowed, not sending`);
            return;
        }
        const socketName = `module.${MODULE_ID}`;
        const payload = {
          action: this.SOCKET_ACTION_RESET
        };
        console.log(`[${MODULE_ID}] Emitting to socket: ${socketName}`, payload);
        game.socket.emit(socketName, payload);
        console.log(`[${MODULE_ID}] Socket emit completed`);
    }
}