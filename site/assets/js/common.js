(function () {
  'use strict';

  const notificationHost = document.querySelector('[data-notifications]');
  if (notificationHost) {
    const names = ['彰化縣劉先生', '高雄市黃先生', '新北市王先生', '桃園市林小姐'];
    const actions = ['剛剛取得靈魂報告', '剛剛分享成功', '完成健康評估', '抽中雙人旅遊'];
    let shown = 0;
    const show = () => {
      if (shown >= 2) return;
      shown += 1;
      const item = document.createElement('div');
      item.className = 'notice';
      item.textContent = `幸福地球通知｜${names[Math.floor(Math.random()*names.length)]}${actions[Math.floor(Math.random()*actions.length)]}`;
      notificationHost.appendChild(item);
      setTimeout(() => item.remove(), 2600);
      setTimeout(show, 900);
    };
    setTimeout(show, 1800);
  }

  document.querySelectorAll('[data-modal-open]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.getAttribute('data-modal-open');
      document.getElementById(id)?.classList.add('open');
    });
  });
  document.querySelectorAll('[data-modal-close]').forEach((button) => {
    button.addEventListener('click', () => button.closest('.modal-backdrop')?.classList.remove('open'));
  });

  // These are genuine DOM comments so readers can discover them in DevTools.
  const comments = [
    '幸福地球內容專案 HE-2026-071',
    '人物照片記得各站換名字',
    'MayChen 帳號由內容組共用',
    '倒數結束後重新開始即可',
    '幸福指數目前沒有計算公式'
  ].map((text) => document.createComment(` ${text} `));
  comments.forEach((node) => document.body.appendChild(node));
})();
