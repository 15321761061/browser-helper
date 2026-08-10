#!/usr/bin/env python3
"""
HTML 转 Markdown 工具
"""

import re
from bs4 import BeautifulSoup


# 噪音选择器
NOISE_SELECTORS = [
    "nav", "header", "footer", "aside",
    "[role='navigation']", "[role='banner']", "[role='contentinfo']",
    ".nav", ".navigation", ".header", ".footer", ".sidebar",
    ".ad", ".ads", ".advertisement", ".advertising",
    "[class*='ad-']", "[class*='-ad']",
    ".social", ".share", ".sharing",
    ".comments", ".comment", "#comments",
    ".sidebar", ".widget", ".related", ".recommend",
    ".breadcrumb", ".pagination",
    ".cookie", ".popup", ".modal",
    "noscript", "script", "style",
    "[style*='display: none']", "[hidden]"
]


def clean_html(html: str, filter_noise: bool = True) -> str:
    """清理 HTML，移除噪音元素"""
    soup = BeautifulSoup(html, 'html.parser')
    
    if filter_noise:
        for selector in NOISE_SELECTORS:
            try:
                for el in soup.select(selector):
                    el.decompose()
            except:
                pass
    
    return str(soup)


def html_to_markdown(html: str, filter_noise: bool = True, include_links: bool = True, include_images: bool = True) -> str:
    """
    HTML 转 Markdown
    
    Args:
        html: HTML 内容
        filter_noise: 是否过滤噪音（导航、广告等）
        include_links: 是否保留链接
        include_images: 是否保留图片
    
    Returns:
        Markdown 文本
    """
    # 清理 HTML
    cleaned_html = clean_html(html, filter_noise)
    
    soup = BeautifulSoup(cleaned_html, 'html.parser')
    md_lines = []
    
    def process_element(el):
        """递归处理元素"""
        if el.name is None:  # 文本节点
            text = str(el).strip()
            if text:
                md_lines.append(text)
            return
        
        # 跳过脚本和样式
        if el.name in ['script', 'style', 'noscript']:
            return
        
        # 标题
        if el.name in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
            level = int(el.name[1])
            text = el.get_text().strip()
            if text:
                md_lines.append(f"\n{'#' * level} {text}\n")
            return
        
        # 段落
        if el.name == 'p':
            text = el.get_text().strip()
            if text:
                md_lines.append(f"\n{text}\n")
            return
        
        # 链接
        if el.name == 'a' and include_links:
            href = el.get('href', '')
            text = el.get_text().strip()
            if text and href:
                md_lines.append(f"[{text}]({href})")
            return
        
        # 图片
        if el.name == 'img' and include_images:
            src = el.get('src', '')
            alt = el.get('alt', '')
            if src:
                md_lines.append(f"![{alt}]({src})")
            return
        
        # 列表
        if el.name == 'li':
            text = el.get_text().strip()
            if text:
                md_lines.append(f"- {text}")
            return
        
        # 强调
        if el.name in ['strong', 'b']:
            text = el.get_text().strip()
            if text:
                md_lines.append(f"**{text}**")
            return
        
        if el.name in ['em', 'i']:
            text = el.get_text().strip()
            if text:
                md_lines.append(f"*{text}*")
            return
        
        # 代码
        if el.name == 'code':
            text = el.get_text().strip()
            if text:
                md_lines.append(f"`{text}`")
            return
        
        if el.name == 'pre':
            text = el.get_text().strip()
            if text:
                md_lines.append(f"\n```\n{text}\n```\n")
            return
        
        # 引用
        if el.name == 'blockquote':
            text = el.get_text().strip()
            if text:
                lines = text.split('\n')
                for line in lines:
                    md_lines.append(f"> {line}")
            return
        
        # 分割线
        if el.name == 'hr':
            md_lines.append("\n---\n")
            return
        
        # 换行
        if el.name == 'br':
            md_lines.append("\n")
            return
        
        # 递归处理子元素
        for child in el.children:
            process_element(child)
    
    # 处理所有顶层元素
    for child in soup.children:
        process_element(child)
    
    # 合并结果
    markdown = ''.join(md_lines)
    
    # 清理多余空行
    markdown = re.sub(r'\n{3,}', '\n\n', markdown)
    markdown = markdown.strip()
    
    return markdown


# ========== 使用示例 ==========
if __name__ == "__main__":
    html = """
    <html>
    <body>
        <nav>导航栏</nav>
        <article>
            <h1>文章标题</h1>
            <p>这是第一段内容，包含一个<a href="https://example.com">链接</a>。</p>
            <p>这是第二段内容，包含<strong>加粗</strong>和<em>斜体</em>。</p>
            <img src="image.jpg" alt="图片描述">
            <pre><code>print("Hello")</code></pre>
        </article>
        <footer>页脚</footer>
    </body>
    </html>
    """
    
    markdown = html_to_markdown(html, filter_noise=True)
    print(markdown)
