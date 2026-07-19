(function () {
  'use strict';

  const countdown = document.querySelector('[data-countdown]');
  if (countdown) {
    const initialSeconds = (9 * 60 * 60) + (59 * 60) + 58;
    let secondsLeft = initialSeconds;
    const renderCountdown = () => {
      const hours = Math.floor(secondsLeft / 3600);
      const minutes = Math.floor((secondsLeft % 3600) / 60);
      const seconds = secondsLeft % 60;
      countdown.textContent = [hours, minutes, seconds]
        .map((unit) => String(unit).padStart(2, '0'))
        .join(':');
    };
    renderCountdown();
    window.setInterval(() => {
      secondsLeft = secondsLeft === 0 ? initialSeconds : secondsLeft - 1;
      renderCountdown();
    }, 1000);
  }

  const modal = document.getElementById('summerModal');
  const modalTitle = document.getElementById('summerModalTitle');
  const modalMessage = document.getElementById('summerModalMessage');
  let returnFocus = null;

  const closeModal = () => {
    if (!modal || !modal.classList.contains('open')) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('summer-modal-open');
    if (returnFocus instanceof HTMLElement) returnFocus.focus();
  };

  const openModal = (title, message, trigger) => {
    if (!modal || !modalTitle || !modalMessage) return;
    returnFocus = trigger || document.activeElement;
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('summer-modal-open');
    modal.querySelector('[data-summer-close]')?.focus();
  };

  document.querySelectorAll('[data-summer-title][data-summer-message]').forEach((button) => {
    button.addEventListener('click', () => {
      openModal(button.dataset.summerTitle, button.dataset.summerMessage, button);
    });
  });

  document.querySelectorAll('[data-certificate]').forEach((button) => {
    button.addEventListener('click', () => {
      openModal(
        button.dataset.certificate,
        '本證照已通過 Summer 國際認證系統認證。認證機構與受認證單位皆由 Summer 國際教育體系獨立運作。',
        button
      );
    });
  });

  document.querySelectorAll('[data-proof]').forEach((button) => {
    button.addEventListener('click', () => {
      openModal('國際人才資料查詢', '因國際人才隱私規範，相關資料不對外公開。', button);
    });
  });

  modal?.querySelectorAll('[data-summer-close]').forEach((button) => {
    button.addEventListener('click', closeModal);
  });

  modal?.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });

  document.addEventListener('keydown', (event) => {
    if (!modal?.classList.contains('open')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...modal.querySelectorAll('button, [href], input')]
      .filter((element) => !element.hidden && !element.disabled);
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

  const quizButton = document.getElementById('summerQuizButton');
  const quizResult = document.getElementById('summerQuizResult');
  quizButton?.addEventListener('click', () => {
    if (!quizResult) return;
    quizResult.hidden = false;
    quizResult.focus();
  });
})();
