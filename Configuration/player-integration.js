// AI Upscaler Plugin - Player Integration v1.5.1
// Stable, async-safe, preview-compatible

(function () {
    'use strict';

    const PLUGIN_ID = 'f87f700e-679d-43e6-9c7c-b3a410dc3f22';
    const PLUGIN_VERSION = '1.5.1';

    // Prevent duplicate injection
    if (window.__AI_UPSCALER_PLAYER_INIT) {
        console.debug('AI Upscaler: Player integration already initialized');
        return;
    }
    window.__AI_UPSCALER_PLAYER_INIT = true;

    const PlayerIntegration = {
        initialized: false,

        init() {
            if (this.initialized) return;
            this.initialized = true;

            console.log(`AI Upscaler Player Integration v${PLUGIN_VERSION} starting`);

            this.addStyles();
            this.waitForPlayer();
            this.addKeyboardShortcuts();

            // Expose globally (used by menu onclick handlers)
            window.PlayerIntegration = this;
        },

        /* ---------------------------------------------------------
         * PLAYER DETECTION
         * --------------------------------------------------------- */

        waitForPlayer() {
            const tryAttach = () => {
                const video = document.querySelector('video');

                if (video) {
                    console.log('AI Upscaler: Video element detected');
                    this.integrateWithPlayer(video);
                } else {
                    // Allow config-page preview mode
                    this.injectPreviewIfNeeded();
                    setTimeout(tryAttach, 1000);
                }
            };
            tryAttach();
        },

        integrateWithPlayer(video) {
            this.addPlayerButton();
            this.attachPlaybackListeners(video);
        },

        injectPreviewIfNeeded() {
            if (!document.querySelector('#UpscalerConfigurationPage')) return;
            if (document.querySelector('#aiUpscalerPreviewPlayer')) return;

            console.log('AI Upscaler: Injecting preview player');

            const preview = document.createElement('div');
            preview.id = 'aiUpscalerPreviewPlayer';
            preview.innerHTML = `
                <div class="ai-preview-frame">
                    <div class="ai-preview-video">🎬 Player Preview</div>
                    <div class="ai-preview-controls"></div>
                </div>
            `;
            document.body.appendChild(preview);

            this.addPlayerButton(preview.querySelector('.ai-preview-controls'));
        },

        /* ---------------------------------------------------------
         * UI
         * --------------------------------------------------------- */

        addPlayerButton(containerOverride) {
            if (document.querySelector('#aiUpscalerButton')) return;

            const container =
                containerOverride ||
                document.querySelector('.videoOsdBottom, .osdControls') ||
                document.querySelector('.ai-preview-controls');

            if (!container) return;

            const btn = document.createElement('button');
            btn.id = 'aiUpscalerButton';
            btn.type = 'button';
            btn.className = 'paper-icon-button-light';
            btn.title = 'AI Upscaler';

            btn.innerHTML = `
                <span class="material-icons">auto_awesome</span>
                <span class="upscaler-status">AI</span>
            `;

            btn.addEventListener('click', e => {
                e.stopPropagation();
                this.toggleMenu();
            });

            container.appendChild(btn);
            console.log('AI Upscaler: Player button injected');
        },

        toggleMenu() {
            const existing = document.querySelector('#aiUpscalerQuickMenu');
            if (existing) {
                existing.remove();
                return;
            }

            const menu = document.createElement('div');
            menu.id = 'aiUpscalerQuickMenu';
            menu.className = 'aiUpscalerQuickMenu';
            menu.innerHTML = `
                <div class="menu-header">
                    <strong>🚀 AI Upscaler</strong>
                    <button class="menu-close">×</button>
                </div>
                <div class="menu-body">
                    <button data-scale="2">2× Upscale</button>
                    <button data-scale="3">3× Upscale</button>
                    <button data-scale="4">4× Upscale</button>
                    <hr/>
                    <button data-action="toggle">Toggle Upscaling</button>
                    <button data-action="stats">Show Stats</button>
                </div>
            `;

            menu.querySelector('.menu-close').onclick = () => menu.remove();

            menu.onclick = e => {
                const scale = e.target.dataset.scale;
                const action = e.target.dataset.action;
                if (scale) this.setScale(Number(scale));
                if (action === 'toggle') this.toggleUpscaling();
                if (action === 'stats') this.showStats();
            };

            document.body.appendChild(menu);
        },

        /* ---------------------------------------------------------
         * CONFIG
         * --------------------------------------------------------- */

        async getConfig() {
            try {
                return await ApiClient.getPluginConfiguration(PLUGIN_ID);
            } catch {
                return {};
            }
        },

        async updateConfig(patch) {
            const cfg = await this.getConfig();
            await ApiClient.updatePluginConfiguration(PLUGIN_ID, {
                ...cfg,
                ...patch
            });
        },

        async setScale(scale) {
            await this.updateConfig({ ScaleFactor: scale });
            this.notify(`Scale set to ${scale}×`, 'success');
            this.closeMenu();
        },

        async toggleUpscaling() {
            const cfg = await this.getConfig();
            const enabled = !cfg.EnablePlugin;
            await this.updateConfig({ EnablePlugin: enabled });
            this.notify(`Upscaling ${enabled ? 'enabled' : 'disabled'}`, enabled ? 'success' : 'warning');
            this.updateButtonState(enabled);
            this.closeMenu();
        },

        /* ---------------------------------------------------------
         * PLAYBACK
         * --------------------------------------------------------- */

        attachPlaybackListeners(video) {
            video.addEventListener('play', () => {
                console.log('AI Upscaler: Playback started');
            });
        },

        /* ---------------------------------------------------------
         * STATS
         * --------------------------------------------------------- */

        async showStats() {
            try {
                const status = await ApiClient.getJSON(ApiClient.getUrl('api/Upscaler/status'));
                alert(JSON.stringify(status, null, 2));
            } catch {
                alert('Stats unavailable');
            }
            this.closeMenu();
        },

        /* ---------------------------------------------------------
         * UTIL
         * --------------------------------------------------------- */

        updateButtonState(enabled) {
            const s = document.querySelector('#aiUpscalerButton .upscaler-status');
            if (s) {
                s.textContent = enabled ? 'ON' : 'OFF';
                s.style.color = enabled ? '#00ff88' : '#ff6666';
            }
        },

        closeMenu() {
            const m = document.querySelector('#aiUpscalerQuickMenu');
            if (m) m.remove();
        },

        notify(text, type = 'info') {
            const n = document.createElement('div');
            n.className = `ai-upscaler-notify ${type}`;
            n.textContent = text;
            document.body.appendChild(n);
            setTimeout(() => n.remove(), 2500);
        },

        addKeyboardShortcuts() {
            document.addEventListener('keydown', e => {
                if (e.altKey && e.key === 'u') this.toggleUpscaling();
                if (e.altKey && e.key === 'm') this.toggleMenu();
            });
        },

        addStyles() {
            if (document.querySelector('#aiUpscalerPlayerStyles')) return;

            const s = document.createElement('style');
            s.id = 'aiUpscalerPlayerStyles';
            s.textContent = `
                #aiUpscalerButton { margin: 0 6px; }
                .aiUpscalerQuickMenu {
                    position: fixed;
                    top: 50%; left: 50%;
                    transform: translate(-50%, -50%);
                    background: #000;
                    color: #fff;
                    border: 2px solid #00d4ff;
                    border-radius: 10px;
                    padding: 12px;
                    z-index: 99999;
                }
                .menu-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                }
                .menu-body button {
                    display: block;
                    width: 100%;
                    margin: 4px 0;
                }
                .ai-upscaler-notify {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 8px 12px;
                    border-radius: 6px;
                    background: #2563eb;
                    color: #fff;
                    z-index: 99999;
                }
                .ai-preview-frame {
                    border: 2px dashed #00d4ff;
                    padding: 10px;
                    margin-top: 10px;
                }
                .ai-preview-video {
                    height: 120px;
                    background: #111;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #00d4ff;
                }
            `;
            document.head.appendChild(s);
        }
    };

    // Init safely
    PlayerIntegration.init();

})();
