(function () {
  'use strict';

  const host = document.querySelector('[data-content-index]');
  if (!host) return;
  const root = host.dataset.root || '../';
  const section = host.dataset.section || 'all';
  const channel = new URLSearchParams(window.location.search).get('channel');

  const channelMatches = (item) => {
    if (!channel) return true;
    const category = item.category || '';
    const tags = item.tags || [];
    if (channel === 'entertainment') {
      return ['娛樂', '體育', '感情', '心靈'].some((label) => category.includes(label) || tags.includes(label));
    }
    return category.includes(channel) || tags.includes(channel);
  };

  const makeCard = (item) => {
    const article = document.createElement('article');
    article.className = 'card content-card';
    const body = document.createElement('div');
    body.className = 'card-body';
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = item.category;
    const title = document.createElement('h2');
    title.textContent = item.title;
    const summary = document.createElement('p');
    summary.textContent = item.summary;
    const link = document.createElement('a');
    link.href = `${root}${item.route}`;
    link.textContent = '閱讀內容 →';
    body.append(badge, title, summary, link);
    article.appendChild(body);
    return article;
  };

  fetch(`${root}assets/data/content.json`)
    .then((response) => {
      if (!response.ok) throw new Error('content unavailable');
      return response.json();
    })
    .then((items) => {
      const visible = items
        .filter((item) => section === 'all' || item.section === section)
        .filter(channelMatches);
      if (!visible.length) {
        const message = document.createElement('p');
        message.className = 'small';
        message.textContent = '這個頻道目前沒有可顯示的內容。';
        host.replaceChildren(message);
        return;
      }
      host.replaceChildren(...visible.map(makeCard));
    })
    .catch(() => {
      const message = document.createElement('p');
      message.className = 'small';
      message.textContent = '內容暫時無法載入，請稍後再試。';
      host.replaceChildren(message);
    });
})();