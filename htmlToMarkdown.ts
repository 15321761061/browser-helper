/**
 * HTML 转 Markdown 工具
 */

// 噪音选择器
const NOISE_SELECTORS = [
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
];

/**
 * 清理 HTML，移除噪音元素
 */
function cleanHtml(html: string, filterNoise: boolean = true): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  if (filterNoise) {
    NOISE_SELECTORS.forEach(selector => {
      try {
        doc.querySelectorAll(selector).forEach(el => el.remove());
      } catch (e) {
        // 忽略无效选择器
      }
    });
  }
  
  return doc.body.innerHTML;
}

/**
 * HTML 转 Markdown
 */
export function htmlToMarkdown(
  html: string,
  options: {
    filterNoise?: boolean;
    includeLinks?: boolean;
    includeImages?: boolean;
  } = {}
): string {
  const { filterNoise = true, includeLinks = true, includeImages = true } = options;
  
  // 清理 HTML
  const cleanedHtml = cleanHtml(html, filterNoise);
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(cleanedHtml, 'text/html');
  
  const mdLines: string[] = [];
  
  function processElement(el: Node): void {
    if (el.nodeType === Node.TEXT_NODE) {
      const text = el.textContent?.trim();
      if (text) {
        mdLines.push(text);
      }
      return;
    }
    
    if (el.nodeType !== Node.ELEMENT_NODE) return;
    
    const element = el as Element;
    const tagName = element.tagName.toLowerCase();
    
    // 跳过脚本和样式
    if (['script', 'style', 'noscript'].includes(tagName)) return;
    
    // 标题
    if (/^h[1-6]$/.test(tagName)) {
      const level = parseInt(tagName[1]);
      const text = element.textContent?.trim();
      if (text) {
        mdLines.push(`\n${'#'.repeat(level)} ${text}\n`);
      }
      return;
    }
    
    // 段落
    if (tagName === 'p') {
      const text = element.textContent?.trim();
      if (text) {
        mdLines.push(`\n${text}\n`);
      }
      return;
    }
    
    // 链接
    if (tagName === 'a' && includeLinks) {
      const href = element.getAttribute('href') || '';
      const text = element.textContent?.trim();
      if (text && href) {
        mdLines.push(`[${text}](${href})`);
      }
      return;
    }
    
    // 图片
    if (tagName === 'img' && includeImages) {
      const src = element.getAttribute('src') || '';
      const alt = element.getAttribute('alt') || '';
      if (src) {
        mdLines.push(`![${alt}](${src})`);
      }
      return;
    }
    
    // 列表
    if (tagName === 'li') {
      const text = element.textContent?.trim();
      if (text) {
        mdLines.push(`- ${text}`);
      }
      return;
    }
    
    // 强调
    if (['strong', 'b'].includes(tagName)) {
      const text = element.textContent?.trim();
      if (text) {
        mdLines.push(`**${text}**`);
      }
      return;
    }
    
    if (['em', 'i'].includes(tagName)) {
      const text = element.textContent?.trim();
      if (text) {
        mdLines.push(`*${text}*`);
      }
      return;
    }
    
    // 代码
    if (tagName === 'code') {
      const text = element.textContent?.trim();
      if (text) {
        mdLines.push(`\`${text}\``);
      }
      return;
    }
    
    if (tagName === 'pre') {
      const text = element.textContent?.trim();
      if (text) {
        mdLines.push(`\n\`\`\`\n${text}\n\`\`\`\n`);
      }
      return;
    }
    
    // 引用
    if (tagName === 'blockquote') {
      const text = element.textContent?.trim();
      if (text) {
        text.split('\n').forEach(line => {
          mdLines.push(`> ${line}`);
        });
      }
      return;
    }
    
    // 分割线
    if (tagName === 'hr') {
      mdLines.push('\n---\n');
      return;
    }
    
    // 换行
    if (tagName === 'br') {
      mdLines.push('\n');
      return;
    }
    
    // 递归处理子元素
    element.childNodes.forEach(child => processElement(child));
  }
  
  // 处理所有子元素
  doc.body.childNodes.forEach(child => processElement(child));
  
  // 合并结果
  let markdown = mdLines.join('');
  
  // 清理多余空行
  markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();
  
  return markdown;
}

// ========== 使用示例 ==========
// const html = '<h1>标题</h1><p>正文<a href="url">链接</a></p>';
// const markdown = htmlToMarkdown(html, { filterNoise: true });
// console.log(markdown);
