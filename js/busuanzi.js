/** Busuanzi page-view tracking for full loads and successful PJAX visits. */
(function () {
    'use strict';

    const options = document.currentScript.dataset;
    const provider = options.provider || 'tssl';
    const timeout = Math.max(1000, Number(options.timeout) || 8000);
    const fields = ['site_uv', 'site_pv', 'page_pv'];
    let activeRequest = null;
    let lastPage = null;
    let sequence = 0;

    function render(state, values, message) {
        document.querySelectorAll('[data-busuanzi]').forEach(function (element) {
            const field = element.dataset.busuanzi;
            element.dataset.state = state;
            element.textContent = values ? String(values[field]) : (state === 'loading' ? '…' : '—');
            if (message) element.title = message;
            else element.removeAttribute('title');
        });
    }

    function isPublicHost(hostname) {
        return hostname.includes('.') &&
            !hostname.includes(':') &&
            !/^[\d.]+$/.test(hostname) &&
            !/(^|\.)(localhost|local|test|invalid|example)$/.test(hostname);
    }

    function normalize(values) {
        const result = {};
        fields.forEach(function (field) {
            const value = values[provider === 'tssl' ? 'busuanzi_' + field : field];
            if ((typeof value !== 'number' && typeof value !== 'string') ||
                !/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value))) {
                throw new Error('Invalid statistics response');
            }
            result[field] = Number(value);
        });
        return result;
    }

    async function requestTssl(url, referrer, signal) {
        // Match the official script's text/plain POST to avoid a CORS preflight.
        const response = await fetch('https://api.tssl.cc/api.php', {
            method: 'POST',
            body: JSON.stringify({ url: url, referrer: referrer }),
            credentials: 'omit',
            signal: signal
        });
        if (!response.ok) throw new Error('Statistics HTTP ' + response.status);
        return response.json();
    }

    function requestIbruce(signal) {
        return new Promise(function (resolve, reject) {
            const callback = 'BusuanziCallback_' + Date.now() + '_' + (++sequence);
            const script = document.createElement('script');

            function cleanUp(allowLateResponse) {
                script.remove();
                signal.removeEventListener('abort', abort);
                if (allowLateResponse) {
                    // A JSONP download can finish after removal; ignore its callback.
                    window[callback] = function () {};
                    setTimeout(function () { delete window[callback]; }, 60000);
                } else {
                    delete window[callback];
                }
            }

            function abort() {
                cleanUp(true);
                reject(new DOMException('Statistics request aborted', 'AbortError'));
            }

            window[callback] = function (values) {
                cleanUp(false);
                resolve(values);
            };
            script.onerror = function () {
                cleanUp(true);
                reject(new Error('Statistics script unavailable'));
            };
            script.src = 'https://busuanzi.ibruce.info/busuanzi?jsonpCallback=' + callback;
            script.referrerPolicy = 'no-referrer-when-downgrade';
            signal.addEventListener('abort', abort, { once: true });
            document.head.appendChild(script);
        });
    }

    async function trackPage() {
        if (options.enabled === 'false') {
            render('disabled', null, '访问统计已关闭');
            return;
        }
        if (!isPublicHost(location.hostname)) {
            render('disabled', null, '本地预览不记录访问量');
            return;
        }
        if (provider !== 'tssl' && provider !== 'ibruce') {
            render('error', null, '统计服务配置无效');
            return;
        }
        if (provider === 'tssl' && location.hostname.length > 22) {
            render('disabled', null, '统计服务不支持超过 22 个字符的域名');
            return;
        }

        // This blog uses path-based routes. Ignore anchors, search parameters
        // and PJAX cache-busting parameters when identifying an article.
        let pathname = location.pathname.replace(/\/index\.html$/i, '/');
        if (!pathname.endsWith('/') && !/\.[a-z\d]+$/i.test(pathname)) pathname += '/';
        const page = location.origin + pathname;
        if (page === lastPage) return;
        const referrer = lastPage || document.referrer;
        lastPage = page;

        if (activeRequest) activeRequest.abort();
        const controller = new AbortController();
        activeRequest = controller;
        const timer = setTimeout(function () { controller.abort(); }, timeout);
        render('loading', null, '统计加载中');

        try {
            const values = provider === 'tssl'
                ? await requestTssl(page, referrer, controller.signal)
                : await requestIbruce(controller.signal);
            if (activeRequest !== controller) return;
            render('ready', normalize(values));
        } catch (error) {
            if (activeRequest === controller) {
                render('error', null, '统计服务暂时不可用');
            }
        } finally {
            clearTimeout(timer);
            if (activeRequest === controller) activeRequest = null;
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', trackPage, { once: true });
    } else {
        trackPage();
    }
    // Listening to success alone avoids counting complete + success twice.
    document.addEventListener('pjax:success', trackPage);
})();
