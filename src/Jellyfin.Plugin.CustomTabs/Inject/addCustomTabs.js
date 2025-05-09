console.log('Injecting custom tabs');

(function () {
    if (window.customTabsPlugin) return;
    window.customTabsPlugin = {
        configs: null,
        interval: null,

        init() {
            this.fetchConfigs()
                .then(configs => {
                    this.configs = Array.isArray(configs) ? configs : [];
                    this.tryInject();
                    if (!this.interval) {
                        this.interval = setInterval(() => this.tryInject(), 500);
                    }
                })
                .catch(err => console.error('[CustomTabs] Config fetch failed:', err));
        },

        fetchConfigs() {
            // Debug: check for ApiClient
            console.log('[CustomTabs] fetchConfigs: window.ApiClient =', !!window.ApiClient, 'ApiClient.fetch type =', window.ApiClient && typeof ApiClient.fetch, 'ApiClient.getUrl type =', window.ApiClient && typeof ApiClient.getUrl);
            if (window.ApiClient && typeof ApiClient.fetch === 'function' && typeof ApiClient.getUrl === 'function') {
                const url = ApiClient.getUrl('CustomTabs/Config');
                console.log('[CustomTabs] fetchConfigs using ApiClient, URL =', url);
                return ApiClient.fetch({
                    url,
                    type: 'GET',
                    dataType: 'json',
                    headers: { accept: 'application/json' }
                });
            } else {
                // Fallback: direct fetch to plugin endpoint
                const fallbackUrl = `${window.location.origin}/CustomTabs/Config`;
                console.log('[CustomTabs] fetchConfigs using fetch(), URL =', fallbackUrl);
                return fetch(fallbackUrl, { headers: { 'Accept': 'application/json' } })
                    .then(res => {
                        if (!res.ok) {
                            console.error('[CustomTabs] fetchConfigs fallback failed HTTP status:', res.status, res.statusText);
                            throw new Error(`HTTP ${res.status} ${res.statusText}`);
                        }
                        return res.json();
                    });
            }
        },

        tryInject() {
            // ─── only on homepage (hash-based routing) ───
            const hash = window.location.hash || '';
            const isHome = hash === '#/home.html' || hash === '' || hash === '#/';
            if (!isHome) return;

            if (!this.configs || this.configs.length === 0) return;
            const slider = document.querySelector('.emby-tabs-slider');
            if (!slider) return;

            this.configs.forEach((config, i) => {
                const btnId = `customTabButton_${i}`;
                if (document.getElementById(btnId)) return;

                console.log(`[CustomTabs] Injecting “${config.Title}” tab`);
                const title = document.createElement('div');
                title.classList.add('emby-button-foreground');
                title.innerText = config.Title;

                const button = document.createElement('button');
                button.type = 'button';
                button.is = 'empty-button';
                button.classList.add('emby-tab-button', 'emby-button', 'lastFocused');
                button.dataset.index = i + 2;
                button.id = btnId;
                button.appendChild(title);

                slider.appendChild(button);
            });
        }
    };

    // Bootstrap on load
    window.customTabsPlugin.init();

    // Re-inject on hash changes (SPA navigation)
    window.addEventListener('hashchange', () => window.customTabsPlugin.tryInject());
})();
