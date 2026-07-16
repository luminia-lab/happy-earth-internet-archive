(function () {
  'use strict';

  const host = document.querySelector('[data-topic-results]');
  if (!host) return;
  const root = host.dataset.root || '../';
  const params = new URLSearchParams(window.location.search);
  const tag = (params.get('tag') || '').trim();
  const title = document.querySelector('[data-topic-title]');
  const summary = document.querySelector('[data-topic-summary]');

  const makeCard = (item) => {
    const article = document.createElement('article');
    article.className = 'card content-card';
    const body = document.createElement('div');
    body.className = 'card-body';
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = item.category;
    const heading = document.createElement('h2');
    heading.textContent = item.title;
    const description = document.createElement('p');
    description.textContent = item.summary;
    const link = document.createElement('a');
    link.href = `${root}${item.route}`;
    link.textContent = '閱讀內容 →';
    body.append(badge, heading, description, link);
    article.appendChild(body);
    return article;
  };

  if (!tag) {
    title.textContent = '標籤內容';
    summary.textContent = '請從文章底部點選一個標籤。';
    const message = document.createElement('p');
    message.className = 'topic-empty';
    message.textContent = '目前沒有指定標籤。';
    host.replaceChildren(message);
    return;
  }

  title.textContent = `# ${tag}`;
  document.title = `# ${tag}｜幸福地球`;

  fetch(`${root}assets/data/content.json`)
    .then((response) => {
      if (!response.ok) throw new Error('content unavailable');
      return response.json();
    })
    .then((items) => {
      const matches = items.filter((item) => Array.isArray(item.tags) && item.tags.includes(tag));
      summary.textContent = `共找到 ${matches.length} 筆相關內容。`;
      if (!matches.length) {
        const message = document.createElement('p');
        message.className = 'topic-empty';
        message.textContent = '這個標籤目前沒有可顯示的內容。';
        host.replaceChildren(message);
        return;
      }
      host.replaceChildren(...matches.map(makeCard));
    })
    .catch(() => {
      summary.textContent = '內容暫時無法載入。';
      const message = document.createElement('p');
      message.className = 'topic-empty';
      message.textContent = '請稍後再試。';
      host.replaceChildren(message);
    });
})();
