/**
 * Frutiger Aero Local Search
 */
(function () {
    let searchData = null;
    let isLoading = false;

    function getSearchData(callback) {
        if (searchData) {
            callback(searchData);
            return;
        }
        if (isLoading) return;
        isLoading = true;

        fetch('/search.json')
            .then(res => {
                if (!res.ok) throw new Error('Search index not found');
                return res.json();
            })
            .then(data => {
                searchData = data;
                isLoading = false;
                callback(data);
            })
            .catch(err => {
                console.error('[Search] Failed to load search.json:', err);
                isLoading = false;
                const resultsContainer = document.getElementById('search-results');
                if (resultsContainer) {
                    resultsContainer.innerHTML = '<div class="search-empty">搜索索引加载失败，请刷新重试</div>';
                }
            });
    }

    function stripHtml(html) {
        if (!html) return '';
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }

    function highlightKeyword(text, keywords) {
        if (!text) return '';
        let result = text;
        keywords.forEach(kw => {
            if (!kw) return;
            const regex = new RegExp(`(${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            result = result.replace(regex, '<mark>$1</mark>');
        });
        return result;
    }

    function doSearch(keyword) {
        const resultsContainer = document.getElementById('search-results');
        const countContainer = document.getElementById('search-count');
        if (!resultsContainer) return;

        keyword = (keyword || '').trim().toLowerCase();
        if (!keyword) {
            resultsContainer.innerHTML = '<div class="search-empty">输入关键词，开始探索博客...</div>';
            if (countContainer) countContainer.textContent = '准备就绪';
            return;
        }

        const keywords = keyword.split(/\s+/).filter(Boolean);

        getSearchData(data => {
            const matches = [];

            data.forEach(item => {
                const title = item.title || '无标题';
                const content = stripHtml(item.content || '');
                const fullText = (title + ' ' + content).toLowerCase();

                // 检查是否包含所有关键词
                const isMatch = keywords.every(kw => fullText.includes(kw));
                if (isMatch) {
                    // 计算标题权重
                    let weight = 0;
                    keywords.forEach(kw => {
                        if (title.toLowerCase().includes(kw)) weight += 10;
                        if (content.toLowerCase().includes(kw)) weight += 1;
                    });

                    // 截取正文片段
                    let snippet = '';
                    const firstKw = keywords[0];
                    const idx = content.toLowerCase().indexOf(firstKw);
                    if (idx !== -1) {
                        const start = Math.max(0, idx - 40);
                        const end = Math.min(content.length, idx + 80);
                        snippet = (start > 0 ? '...' : '') + content.substring(start, end) + (end < content.length ? '...' : '');
                    } else {
                        snippet = content.substring(0, 100) + '...';
                    }

                    matches.push({
                        title: highlightKeyword(title, keywords),
                        snippet: highlightKeyword(snippet, keywords),
                        url: item.url,
                        weight: weight
                    });
                }
            });

            // 按权重从高到低排序
            matches.sort((a, b) => b.weight - a.weight);

            if (countContainer) {
                countContainer.textContent = `找到 ${matches.length} 篇相关文章`;
            }

            if (matches.length === 0) {
                resultsContainer.innerHTML = `<div class="search-empty">未找到包含 "<strong>${keyword}</strong>" 的文章</div>`;
                return;
            }

            let html = '<ul class="search-result-list">';
            matches.forEach(item => {
                html += `
                    <li class="search-result-item">
                        <a href="${item.url}" class="search-result-title">${item.title}</a>
                        <div class="search-result-content">${item.snippet}</div>
                    </li>
                `;
            });
            html += '</ul>';
            resultsContainer.innerHTML = html;

            // 监听结果中的点击，关闭搜索弹窗
            resultsContainer.querySelectorAll('a').forEach(a => {
                a.addEventListener('click', () => {
                    closeSearchModal();
                });
            });
        });
    }

    function openSearchModal() {
        const modal = document.getElementById('search-modal');
        const input = document.getElementById('search-input');
        if (modal) {
            modal.classList.add('active');
            if (input) {
                input.value = '';
                input.focus();
                doSearch('');
            }
            getSearchData(() => {}); // 预加载数据
        }
    }

    function closeSearchModal() {
        const modal = document.getElementById('search-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    function bindSearchEvents() {
        const searchBtn = document.getElementById('search-btn');
        const closeBtn = document.getElementById('search-close-btn');
        const mask = document.getElementById('search-mask');
        const input = document.getElementById('search-input');

        if (searchBtn) {
            searchBtn.onclick = (e) => {
                e.preventDefault();
                openSearchModal();
            };
        }
        if (closeBtn) {
            closeBtn.onclick = closeSearchModal;
        }
        if (mask) {
            mask.onclick = closeSearchModal;
        }

        if (input) {
            let debounceTimer = null;
            input.oninput = () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    doSearch(input.value);
                }, 150);
            };
        }

        // 全局快捷键：Ctrl+K 或 Cmd+K 或 "/" 唤起搜索，ESC 关闭
        document.onkeydown = (e) => {
            const isModalActive = document.getElementById('search-modal')?.classList.contains('active');
            if (e.key === 'Escape' && isModalActive) {
                closeSearchModal();
                return;
            }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
                e.preventDefault();
                if (isModalActive) closeSearchModal();
                else openSearchModal();
                return;
            }
            // 当焦点不在 input/textarea 时按 "/" 打开搜索
            if (e.key === '/' && !isModalActive) {
                const targetTag = (e.target && e.target.tagName) || '';
                if (targetTag !== 'INPUT' && targetTag !== 'TEXTAREA') {
                    e.preventDefault();
                    openSearchModal();
                }
            }
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindSearchEvents);
    } else {
        bindSearchEvents();
    }

    document.addEventListener('pjax:success', bindSearchEvents);
    document.addEventListener('pjax:complete', bindSearchEvents);
})();
