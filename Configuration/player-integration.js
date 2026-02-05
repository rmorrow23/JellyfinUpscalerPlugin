// AI Upscaler Plugin – Player Integration v1.5.0
// Injects AI Upscaler UI ONLY on Jellyfin video playback pages

(function () {
    'use strict';

    const PLUGIN_ID = 'f87f700e-679d-43e6-9c7c-b3a410dc3f22';
    const VERSION = '1.5.0';

    let injected = false;
    let lastUrl = location.href;

    const PlayerIntegration = {

        /* =========================
           INIT
        ========================= */

        init() {
            console.log(`AI Upscaler: Player Integration v${VERSION} loaded`);
            this.addStyles();
            this.watchRouteChanges();
            this.handleRoute(location.href);
        },

        /* =========================
           ROUTE WATCHER
        ========================= */

        watchRouteChanges() {
            setInterval(() => {
                if (location.href !== lastUrl) {
                    lastUrl = location.href;
                    this.handleRoute(lastUrl);
                }
            }, 500);
        },

        handleRoute(url) {
            const isVideo =
                url.includes('/web/#/video') ||
                url.includes('/web/index.html#/video') ||
                /#\/video/.test(url);

            if (isVideo && !injected) {
                this.waitForPlayer();
            }

            if (!isVideo && injected) {
                this.cleanup();
            }
        },

        /* =========================
           PLAYER DETECTION
        ========================= */

        waitForPlayer() {
            const tryAttach = () => {
                const controls =
                    document.querySelector('.videoOsdBottom') ||
                    document.querySelector('.osdControls');

                if (controls) {
                    this.injectButton(controls);
                    injected = true;
                } else {
                    setTimeout(tryAttach, 500);
                }
            };
            tryAttach();
        },

        /* =========================
           BUTTON
        ========================= */

        injectButton(container) {
            if (document.getElementById('aiUpscalerButton')) return;

            const btn = document.createElement('button');
            btn.id = 'aiUpscalerButton';
            btn.type = 'button';
            btn.className = 'paper-icon-button-light';
            btn.title = 'AI Upscaler';

            btn.innerHTML = `
                <span class="material-icons">auto_awesome</span>
                <span class="upscaler-status">AI</span>
            `;

            btn.onclick = e => {
                e.stopPropagation();
                this.toggleMenu();
            };

            container.appendChild(btn);
            console.log('AI Upscaler: Player button injected');
        },

        cleanup() {
            document.getElementById('aiUpscalerButton')?.remove();
            document.getElementById('aiUpscalerQuickMenu')?.remove();
            injected = false;
            console.log('AI Upscaler: Player UI cleaned up');
        },

        /* =========================
           QUICK MENU
        ========================= */

        toggleMenu() {
            const existing = document.getElementById('aiUpscalerQuickMenu');
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
                    <hr />
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

        /* =========================
           CONFIG
        ========================= */

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
            this.notify(`Scale set to ${scale}×`);
            this.closeMenu();
        },

        async toggleUpscaling() {
            const cfg = await this.getConfig();
            const enabled = !cfg.EnablePlugin;
            await this.updateConfig({ EnablePlugin: enabled });
            this.updateButtonState(enabled);
            this.notify(`Upscaling ${enabled ? 'enabled' : 'disabled'}`);
            this.closeMenu();
        },

        updateButtonState(enabled) {
            const s = document.querySelector('#aiUpscalerButton .upscaler-status');
            if (!s) return;
            s.textContent = enabled ? 'ON' : 'OFF';
            s.style.color = enabled ? '#00ff88' : '#ff6666';
        },

        /* =========================
           STATS
        ========================= */

        async showStats() {
            try {
                const status = await ApiClient.getJSON(
                    ApiClient.getUrl('api/Upscaler/status')
                );
                alert(JSON.stringify(status, null, 2));
            } catch {
                alert('Stats unavailable');
            }
            this.closeMenu();
        },

        /* =========================
           UI HELPERS
        ========================= */

        closeMenu() {
            document.getElementById('aiUpscalerQuickMenu')?.remove();
        },

        notify(text) {
            const n = document.createElement('div');
            n.className = 'ai-upscaler-notify';
            n.textContent = text;
            document.body.appendChild(n);
            setTimeout(() => n.remove(), 2500);
        },

        addStyles() {
            if (document.getElementById('aiUpscalerPlayerStyles')) return;

            const s = document.createElement('style');
            s.id = 'aiUpscalerPlayerStyles';
            s.textContent = `
                #aiUpscalerButton {
                    margin: 0 6px;
                    background: rgba(0,0,0,.6);
                    border: 1px solid rgba(255,255,255,.25);
                    border-radius: 6px;
                    color: white;
                    padding: 6px 10px;
                    cursor: pointer;
                }

                #aiUpscalerButton:hover {
                    background: rgba(0,212,255,.85);
                }

                .aiUpscalerQuickMenu {
                    position: fixed;
                    bottom: 90px;
                    right: 30px;
                    background: #111;
                    border: 2px solid #00d4ff;
                    border-radius: 10px;
                    padding: 12px;
                    z-index: 10000;
                }

                .menu-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 8px;
                }

                .menu-body button {
                    width: 100%;
                    margin: 4px 0;
                }

                .ai-upscaler-notify {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #2563eb;
                    color: #fff;
                    padding: 8px 12px;
                    border-radius: 6px;
                    z-index: 10001;
                }
            `;
            document.head.appendChild(s);
        }
    };

    PlayerIntegration.init();
    window.PlayerIntegration = PlayerIntegration;

})();