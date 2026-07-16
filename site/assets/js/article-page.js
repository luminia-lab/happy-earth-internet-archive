(function () {
  'use strict';

  const shell = document.querySelector('[data-article-shell]');
  if (!shell) return;
  const slug = shell.dataset.slug;
  const root = shell.dataset.root || '../../';

  const textElement = (tag, text, className) => {
    const node = document.createElement(tag);
    node.textContent = text;
    if (className) node.className = className;
    return node;
  };

  const bodyBlock = (block) => {
    if (block.type === 'heading') return textElement('h2', block.text);
    if (block.type === 'note') return textElement('div', block.text, 'article-note');
    if (block.type === 'list') {
      const list = document.createElement('ul');
      block.items.forEach((item) => list.appendChild(textElement('li', item)));
      return list;
    }
    return textElement('p', block.text);
  };

  const showError = () => {
    const box = document.createElement('div');
    box.className = 'article-error card';
    box.append(textElement('h1', '這篇內容暫時找不到'), textElement('p', '請回到文章索引繼續瀏覽。'));
    const link = textElement('a', '返回文章索引', 'button');
    link.href = `${root}articles/`;
    box.appendChild(link);
    shell.replaceChildren(box);
  };

  fetch(`${root}assets/data/content.json`)
    .then((response) => {
      if (!response.ok) throw new Error('content unavailable');
      return response.json();
    })
    .then((items) => {
      const sourceArticle = items.find((item) => item.slug === slug);
      if (!sourceArticle) return showError();
      const article = sourceArticle;
      document.title = `${article.title}｜幸福地球`;

      const main = document.createElement('main');
      main.className = 'article-main';
      const breadcrumb = document.createElement('nav');
      breadcrumb.className = 'article-breadcrumb';
      breadcrumb.setAttribute('aria-label', '麵包屑');
      const home = textElement('a', '幸福地球');
      home.href = root;
      const index = textElement('a', article.section === 'events' ? '活動' : article.section === 'news' ? '社會' : '文章');
      index.href = `${root}${article.section}/`;
      breadcrumb.append(home, document.createTextNode(' ／ '), index);

      const badge = textElement('span', article.category, 'badge');
      const title = textElement('h1', article.title);
      const summary = textElement('p', article.summary, 'article-summary');
      const meta = textElement('p', `發布：${article.publishedDate}　更新：${article.updatedDate}　作者：${article.author}`, 'article-meta');
      const body = document.createElement('div');
      body.className = 'article-body';
      article.content.forEach((block) => body.appendChild(bodyBlock(block)));
      const tags = document.createElement('div');
      tags.className = 'article-tags';
      article.tags.forEach((tag) => {
        const link = textElement('a', `# ${tag}`);
        link.href = `${root}topics/?tag=${encodeURIComponent(tag)}`;
        link.setAttribute('aria-label', `查看標籤 ${tag} 的內容`);
        tags.appendChild(link);
      });
      main.append(breadcrumb, badge, title, summary, meta, body, tags);

      const relatedItems = article.relatedArticles
        .map((relatedSlug) => items.find((item) => item.slug === relatedSlug))
        .filter(Boolean);
      if (relatedItems.length) {
        const related = document.createElement('aside');
        related.className = 'article-related';
        related.appendChild(textElement('h2', '你可能也會喜歡'));
        relatedItems.forEach((item) => {
          const link = textElement('a', item.title);
          link.href = `${root}${item.route}`;
          const row = document.createElement('p');
          row.appendChild(link);
          related.appendChild(row);
        });
        main.appendChild(related);
      }

      const footer = document.createElement('footer');
      footer.className = 'footer';
      const footerInner = document.createElement('div');
      footerInner.className = 'container';
      footerInner.textContent = '幸福地球｜由幸福地球數位內容有限公司營運。';
      footer.appendChild(footerInner);
      shell.replaceChildren(main, footer);
    })
    .catch(showError);
})();
