/**
 * Frutiger Aero Code Block Copy & Header Enhancement
 */
(function () {
    function initCodeCopy() {
        const blocks = document.querySelectorAll('.post-content figure.highlight, .post-content pre');
        blocks.forEach(block => {
            // 如果已在 .highlight-wrap 内，避免重复包装
            if (block.closest('.highlight-wrap') || block.classList.contains('code-header')) {
                return;
            }
            // 如果是 figure.highlight 内部嵌套的 pre，直接跳过
            if (block.tagName === 'PRE' && block.closest('figure.highlight')) {
                return;
            }

            // 提取代码语言
            let lang = 'CODE';
            if (block.classList) {
                block.classList.forEach(cls => {
                    if (cls.startsWith('language-')) {
                        lang = cls.replace('language-', '');
                    } else if (cls !== 'highlight' && cls !== 'highlight-wrap') {
                        lang = cls;
                    }
                });
            }

            // 创建外层卡片
            const wrap = document.createElement('div');
            wrap.className = 'highlight-wrap';

            // 创建 Aero 风格顶部窗口栏
            const header = document.createElement('div');
            header.className = 'code-header';
            header.innerHTML = `
                <div class="code-header-left">
                    <div class="code-dots">
                        <span class="code-dot code-dot-red"></span>
                        <span class="code-dot code-dot-yellow"></span>
                        <span class="code-dot code-dot-green"></span>
                    </div>
                    <span class="code-lang">${lang.toUpperCase()}</span>
                </div>
                <button class="code-copy-btn" type="button" title="复制代码">
                    <i class="ri-file-copy-line"></i>
                    <span>复制</span>
                </button>
            `;

            // 包装现有代码块
            block.parentNode.insertBefore(wrap, block);
            wrap.appendChild(header);
            wrap.appendChild(block);

            // 绑定复制按钮事件
            const copyBtn = header.querySelector('.code-copy-btn');
            copyBtn.addEventListener('click', async () => {
                let codeText = '';
                // 优先从 td.code 提取，排除行号
                const codeTd = block.querySelector('td.code') || block.querySelector('.code');
                if (codeTd) {
                    codeText = codeTd.innerText;
                } else {
                    codeText = block.innerText;
                }

                codeText = codeText.replace(/\n+$/, '');

                const onSuccess = () => {
                    copyBtn.classList.add('copied');
                    copyBtn.innerHTML = '<i class="ri-check-line"></i><span>已复制!</span>';
                    setTimeout(() => {
                        copyBtn.classList.remove('copied');
                        copyBtn.innerHTML = '<i class="ri-file-copy-line"></i><span>复制</span>';
                    }, 2000);
                };

                try {
                    await navigator.clipboard.writeText(codeText);
                    onSuccess();
                } catch (err) {
                    // Fallback 使用 textarea 兼容旧环境
                    const ta = document.createElement('textarea');
                    ta.value = codeText;
                    ta.style.position = 'fixed';
                    ta.style.opacity = '0';
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                    onSuccess();
                }
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCodeCopy);
    } else {
        initCodeCopy();
    }

    // 兼容 PJAX 局部加载
    document.addEventListener('pjax:success', initCodeCopy);
    document.addEventListener('pjax:complete', initCodeCopy);
})();
