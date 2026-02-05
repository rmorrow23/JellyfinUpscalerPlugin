(function () {
    'use strict';

    const INJECTED_ID = 'aiupscaler-player';

    function isVideoPage() {
        return location.hash.startsWith('#/video');
    }

    function injectPlayerIntegration() {
        if (!isVideoPage()) return;
        if (document.getElementById(INJECTED_ID)) return;

        const url = ApiClient.getUrl('web/UPSCALERPlayerIntegration');

        ApiClient.ajax({
            type: 'GET',
            url: url,
            dataType: 'text'
        }).then(code => {
            const script = document.createElement('script');
            script.id = INJECTED_ID;
            script.textContent = code;
            document.head.appendChild(script);
            console.log('AI Upscaler: Player integration injected');
        });
    }

    // Initial check
    injectPlayerIntegration();

    // Listen for SPA navigation
    let lastHash = location.hash;
    setInterval(() => {
        if (location.hash !== lastHash) {
            lastHash = location.hash;
            injectPlayerIntegration();
        }
    }, 500);

})();