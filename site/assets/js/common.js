(function () {
  'use strict';

  const scriptUrl = document.currentScript?.src || new URL('assets/js/common.js', document.baseURI).href;
  const siteRoot = new URL('../../', scriptUrl);
  const siteLink = (path = '') => new URL(path, siteRoot).href;

  const setupMobileNavigation = () => {
    const menuItems = [
      ['首頁', ''],
      ['文章總覽', 'articles/'],
      ['生活', 'articles/'],
      ['旅遊', 'articles/'],
      ['健康', 'vigor/'],
      ['活動', 'events/'],
      ['娛樂', 'articles/?channel=entertainment'],
      ['社會', 'news/'],
      ['心靈', 'origin/'],
      ['標籤總覽', 'topics/'],
      ['內容透明度', 'archive/']
    ];
    const drawerId = 'mobile-global-navigation';
    const toggle = document.createElement('button');
    toggle.className = 'mobile-nav-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', drawerId);
    toggle.setAttribute('aria-label', '開啟全站選單');
    toggle.innerHTML = '<span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span>';

    const sharedHeader = document.querySelector('.site-header .header-inner, .vigor-top .header-inner');
    if (sharedHeader) {
      sharedHeader.appendChild(toggle);
    } else {
      const mobileBar = document.createElement('header');
      mobileBar.className = 'mobile-global-bar';
      const brand = document.createElement('a');
      brand.className = 'brand';
      brand.href = siteLink();
      brand.innerHTML = '<span class="brand-mark">🌍</span><span>幸福地球</span>';
      mobileBar.append(brand, toggle);
      document.body.insertBefore(mobileBar, document.body.firstChild);
    }

    const backdrop = document.createElement('button');
    backdrop.className = 'mobile-nav-backdrop';
    backdrop.type = 'button';
    backdrop.setAttribute('aria-label', '關閉全站選單');
    backdrop.hidden = true;

    const drawer = document.createElement('aside');
    drawer.className = 'mobile-nav-drawer';
    drawer.id = drawerId;
    drawer.setAttribute('aria-label', '全站選單');
    drawer.setAttribute('aria-hidden', 'true');
    drawer.hidden = true;

    const drawerHeader = document.createElement('div');
    drawerHeader.className = 'mobile-nav-drawer-header';
    const drawerTitle = document.createElement('strong');
    drawerTitle.textContent = '幸福地球';
    const closeButton = document.createElement('button');
    closeButton.className = 'mobile-nav-close';
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', '關閉全站選單');
    closeButton.textContent = '關閉 ×';
    drawerHeader.append(drawerTitle, closeButton);

    const nav = document.createElement('nav');
    nav.className = 'mobile-nav-links';
    nav.setAttribute('aria-label', '手機版主選單');
    menuItems.forEach(([label, path]) => {
      const link = document.createElement('a');
      link.href = siteLink(path);
      link.textContent = label;
      nav.appendChild(link);
    });
    drawer.append(drawerHeader, nav);
    document.body.append(backdrop, drawer);

    let lastFocus = null;
    let closeTimer = null;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const openMenu = () => {
      if (closeTimer) window.clearTimeout(closeTimer);
      lastFocus = document.activeElement;
      backdrop.hidden = false;
      drawer.hidden = false;
      drawer.setAttribute('aria-hidden', 'false');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', '關閉全站選單');
      document.body.classList.add('mobile-nav-open');
      window.requestAnimationFrame(() => {
        backdrop.classList.add('open');
        drawer.classList.add('open');
        closeButton.focus();
      });
    };

    const closeMenu = ({ restoreFocus = true } = {}) => {
      if (toggle.getAttribute('aria-expanded') !== 'true') return;
      backdrop.classList.remove('open');
      drawer.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', '開啟全站選單');
      document.body.classList.remove('mobile-nav-open');
      closeTimer = window.setTimeout(() => {
        backdrop.hidden = true;
        drawer.hidden = true;
      }, reducedMotion ? 0 : 180);
      if (restoreFocus && lastFocus instanceof HTMLElement) lastFocus.focus();
    };

    toggle.addEventListener('click', () => {
      if (toggle.getAttribute('aria-expanded') === 'true') closeMenu();
      else openMenu();
    });
    closeButton.addEventListener('click', () => closeMenu());
    backdrop.addEventListener('click', () => closeMenu());
    nav.addEventListener('click', (event) => {
      if (event.target.closest('a')) closeMenu({ restoreFocus: false });
    });
    document.addEventListener('keydown', (event) => {
      if (toggle.getAttribute('aria-expanded') !== 'true') return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = [...drawer.querySelectorAll('a, button')].filter((item) => !item.hidden);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  };

  setupMobileNavigation();

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
      item.setAttribute('role', 'status');
      const message = document.createElement('span');
      message.textContent = `幸福地球通知｜${names[Math.floor(Math.random()*names.length)]}${actions[Math.floor(Math.random()*actions.length)]}`;
      const close = document.createElement('button');
      close.className = 'notice-close';
      close.type = 'button';
      close.setAttribute('aria-label', '關閉這則通知');
      close.textContent = '×';
      const remove = () => {
        item.classList.add('leaving');
        window.setTimeout(() => item.remove(), window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 160);
      };
      close.addEventListener('click', remove);
      item.append(message, close);
      notificationHost.appendChild(item);
      setTimeout(remove, 4200);
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
})();
