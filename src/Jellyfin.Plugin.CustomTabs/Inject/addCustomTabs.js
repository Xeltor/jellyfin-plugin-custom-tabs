(function () {
    'use strict';

    /**
     * CustomTabs handles injecting and removing custom tab buttons in the Emby tabs slider
     * for the home page, reacting to route changes and DOM mutations.
     */
    class CustomTabs {
        /**
         * @param {Array<{Title: string}>} configs
         */
        constructor(configs) {
            this.configs = configs;
            this.observer = null;
            this._init();
        }

        /**
         * Set up mutation observer and hashchange listener
         * @private
         */
        _init() {
            // Observe DOM changes to catch slider (re)rendering
            this.observer = new MutationObserver(() => this._process());
            this.observer.observe(document.body, { childList: true, subtree: true });

            // React on route changes
            window.addEventListener('hashchange', () => this._process());

            // Initial check
            this._process();
        }

        /**
         * Main logic: inject or clean up based on current route
         * @private
         */
        _process() {
            const hash = window.location.hash || '';
            const isHome = hash.startsWith('#/home.html') || hash === '#/' || hash === '';
            const slider = document.querySelector('.emby-tabs-slider');

            if (isHome && slider) {
                this._injectTabs(slider);
            } else if (!isHome && slider) {
                this._removeTabs(slider);
            }
        }

        /**
         * Inject custom tab buttons
         * @param {HTMLElement} slider
         * @private
         */
        _injectTabs(slider) {
            this.configs.forEach((config, i) => {
                const btnId = `customTabButton_${i}`;
                if (slider.querySelector(`#${btnId}`)) return;

                console.log(`[CustomTabs] Injecting “${config.Title}” tab`);

                const titleEl = document.createElement('div');
                titleEl.classList.add('emby-button-foreground');
                titleEl.innerText = config.Title;

                const button = document.createElement('button');
                button.type = 'button';
                button.is = 'empty-button';
                button.classList.add('emby-tab-button', 'emby-button', 'lastFocused');
                button.dataset.index = i + 2;
                button.id = btnId;
                button.appendChild(titleEl);

                slider.appendChild(button);
            });
        }

        /**
         * Remove previously injected tabs
         * @param {HTMLElement} slider
         * @private
         */
        _removeTabs(slider) {
            this.configs.forEach((_, i) => {
                const btn = slider.querySelector(`#customTabButton_${i}`);
                if (btn) btn.remove();
            });
        }
    }

    /**
     * Initialization: fetch configuration, then instantiate CustomTabs
     */
    function initCustomTabs() {
        const doFetch = () => {
            if (window.ApiClient && typeof ApiClient.fetch === 'function' && typeof ApiClient.getUrl === 'function') {
                const url = ApiClient.getUrl('CustomTabs/Config');
                return ApiClient.fetch({ url, type: 'GET', dataType: 'json', headers: { accept: 'application/json' } });
            }
            const fallbackUrl = `${window.location.origin}/CustomTabs/Config`;
            return fetch(fallbackUrl, { headers: { 'Accept': 'application/json' } })
                .then(res => {
                    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
                    return res.json();
                });
        };

        doFetch()
            .then(configs => {
                if (Array.isArray(configs) && configs.length) {
                    new CustomTabs(configs);
                } else {
                    console.warn('No tab configs received or invalid format.', configs);
                }
            })
            .catch(err => console.error('Error initializing custom tabs:', err));
    }

    /**
     * Measure header height and reposition iframe to sit below header
     */
    function adjustFrame() {
        const header = document.querySelector('.skinHeader');
        const iframe = document.getElementById('requestIframe');
        if (!header || !iframe) return;
        const h = header.getBoundingClientRect().height;
        Object.assign(iframe.style, {
            position: 'absolute',
            top:      h + 'px',
            left:     '0',
            right:    '0',
            bottom:   '0',
            width:    '100%',
            border:   '0'
        });
    }

    /**
     * Poll via requestAnimationFrame until both header and iframe exist, then init resize handling
     */
    function initIframeAdjustment() {
        function init() {
            const header = document.querySelector('.skinHeader');
            const iframe = document.getElementById('requestIframe');
            if (!header || !iframe) {
                return requestAnimationFrame(init);
            }
            // Initial adjust
            adjustFrame();
            // Re-adjust on window resize
            window.addEventListener('resize', adjustFrame);
        }
        init();
    }

    // Wait for DOM readiness, then kick off both features
    function onReady() {
        initCustomTabs();
        initIframeAdjustment();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onReady);
    } else {
        onReady();
    }
})();
