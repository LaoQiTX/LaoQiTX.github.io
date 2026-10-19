/**
 * Frutiger Aero TOC Active Section Highlighter
 */
(function () {
    let observer = null;

    function initTocHighlight() {
        if (observer) {
            observer.disconnect();
            observer = null;
        }

        // 双重保障：如果不是文章页，确保清空 TOC 容器
        const isPost = document.querySelector('.post-full .post-meta') !== null;
        const pjaxToc = document.getElementById('pjax-toc');
        if (!isPost && pjaxToc) {
            pjaxToc.innerHTML = '';
            return;
        }

        const tocLinks = document.querySelectorAll('.post-toc-link');
        if (!tocLinks || tocLinks.length === 0) return;

        // 获取正文中所有的标题元素
        const headers = Array.from(document.querySelectorAll('.post-content h1, .post-content h2, .post-content h3, .post-content h4, .post-content h5, .post-content h6'))
            .filter(h => h.id);

        if (headers.length === 0) return;

        // 建立 id 到 tocLink 的映射
        const idToLinkMap = {};
        tocLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && href.startsWith('#')) {
                const targetId = decodeURIComponent(href.slice(1));
                idToLinkMap[targetId] = link;
            }
        });

        // 视口监听高亮
        observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    const activeLink = idToLinkMap[id];
                    if (activeLink) {
                        tocLinks.forEach(l => l.classList.remove('active'));
                        activeLink.classList.add('active');
                    }
                }
            });
        }, {
            rootMargin: '-80px 0px -60% 0px',
            threshold: 0
        });

        headers.forEach(header => observer.observe(header));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTocHighlight);
    } else {
        initTocHighlight();
    }

    document.addEventListener('pjax:success', initTocHighlight);
    document.addEventListener('pjax:complete', initTocHighlight);
})();
