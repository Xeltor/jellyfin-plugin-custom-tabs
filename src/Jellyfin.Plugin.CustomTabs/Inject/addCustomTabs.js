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
            // Use ApiClient if available, otherwise fallback to window.fetch
            if (window.ApiClient && typeof ApiClient.fetch === 'function' && typeof ApiClient.getUrl === 'function') {
                return ApiClient.fetch({
                    url: ApiClient.getUrl('CustomTabs/Config'),
                    type: 'GET',
                    dataType: 'json',
                    headers: { accept: 'application/json' }
                });
            } else {
                // Fallback: direct fetch to plugin endpoint
                return fetch('/CustomTabs/Config', {
                    headers: { 'Accept': 'application/json' }
                })
                    .then(res => {
                        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
                        return res.json();
                    });
            }
        },

        tryInject() {
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

    // Re-inject on SPA navigations
    window.addEventListener('popstate', () => window.customTabsPlugin.tryInject());
    ['pushState', 'replaceState'].forEach(fn => {
        const orig = history[fn];
        history[fn] = function () {
            const ret = orig.apply(this, arguments);
            window.customTabsPlugin.tryInject();
            return ret;
        };
    });
})();
