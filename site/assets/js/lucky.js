(function () {
  'use strict';

  const page = document.querySelector('[data-prize-page]');
  if (!page) return;
  const wheel = document.getElementById('wheel');
  const spinButton = document.getElementById('spinButton');
  const resultModal = document.getElementById('resultModal');
  const claim = document.getElementById('claimPanel');
  const stepTitle = document.getElementById('stepTitle');
  const stepBody = document.getElementById('stepBody');
  const stepButton = document.getElementById('stepButton');
  const trap = document.getElementById('trapPanel');
  const clues = document.getElementById('cluePanel');
  const isTravel = page.dataset.pageKind === 'travel';
  let spinning = false;
  let step = 0;
  let countdownTimer;

  const steps = [
    {
      title: '確認你年滿18歲',
      body: '<label><input type="checkbox" id="adultCheck"> 我確認已年滿18歲，並同意活動辦法。</label>',
      button: '確認並繼續'
    },
    {
      title: isTravel ? '完成三題旅遊偏好' : '分享給5位好友',
      body: isTravel
        ? '<div class="form-grid"><label>旅行季節<select><option>冬季</option><option>春季</option><option>夏季</option><option>秋季</option></select></label><label>同行人數<select><option>2人</option><option>1人</option></select></label></div><label style="margin-top:12px">最期待的旅行方式<select><option>自然風景</option><option>城市散步</option><option>美食體驗</option></select></label>'
        : '<p>系統正在確認分享資格……</p><label>已分享人數<input type="range" min="0" max="5" value="0" id="shareRange"></label><p class="small">拖曳至5，模擬完成分享。</p>',
      button: isTravel ? '送出旅遊偏好' : '完成分享'
    },
    {
      title: '填寫領獎資料',
      body: '<div class="form-grid"><label>姓名<input autocomplete="off" placeholder="王小明"></label><label>手機<input autocomplete="off" inputmode="tel" placeholder="09xx-xxx-xxx"></label><label>電子郵件<input autocomplete="off" type="email" placeholder="name@example.com"></label><label>縣市<select><option>桃園市</option><option>臺北市</option><option>新北市</option><option>其他</option></select></label></div><label style="margin-top:12px">收件地址<input autocomplete="off" placeholder="請輸入完整地址"></label><p class="small">欄位內容只存在目前畫面；切換步驟後即被移除，不會送出或儲存。</p>',
      button: '確認資料'
    },
    {
      title: '支付38元行政處理費',
      body: '<p>選擇付款方式：</p><label><select><option>超商代碼</option><option>ATM虛擬帳號</option><option>信用卡</option></select></label><p class="small">此處不會產生交易，也不會要求輸入卡號。</p>',
      button: '立即支付38元'
    }
  ];

  const renderStep = () => {
    const item = steps[step];
    stepTitle.replaceChildren();
    const dot = document.createElement('span');
    dot.className = 'step-dot';
    dot.textContent = String(step + 1);
    stepTitle.append(dot, document.createTextNode(item.title));
    stepBody.innerHTML = item.body;
    stepButton.textContent = item.button;
    stepButton.type = 'button';
  };

  const setModal = (open) => {
    resultModal.classList.toggle('open', open);
    resultModal.setAttribute('aria-hidden', String(!open));
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) document.getElementById('claimStart').focus();
  };

  const startCountdown = () => {
    clearInterval(countdownTimer);
    let remaining = 598;
    const output = document.querySelector('[data-countdown]');
    const render = () => {
      const minutes = String(Math.floor(remaining / 60)).padStart(2, '0');
      const seconds = String(remaining % 60).padStart(2, '0');
      output.textContent = `${minutes}:${seconds}`;
      remaining = remaining > 0 ? remaining - 1 : 598;
    };
    render();
    countdownTimer = setInterval(render, 1000);
  };

  spinButton.addEventListener('click', () => {
    if (spinning) return;
    spinning = true;
    spinButton.disabled = true;
    spinButton.textContent = '抽獎中……';
    wheel.style.transform = 'rotate(1440deg)';
    setTimeout(() => {
      startCountdown();
      setModal(true);
      spinButton.classList.add('hidden');
      spinning = false;
    }, 1700);
  });

  document.getElementById('claimStart').addEventListener('click', () => {
    setModal(false);
    claim.classList.remove('hidden');
    trap.classList.add('hidden');
    step = 0;
    renderStep();
    claim.scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
  });

  stepButton.addEventListener('click', () => {
    if (step === 0 && !document.getElementById('adultCheck')?.checked) {
      alert('請先勾選年齡確認。');
      return;
    }
    if (!isTravel && step === 1 && Number(document.getElementById('shareRange')?.value || 0) < 5) {
      alert('系統顯示尚未完成5人分享。');
      return;
    }
    if (step < steps.length - 1) {
      step += 1;
      renderStep();
    } else {
      stepBody.replaceChildren();
      claim.classList.add('hidden');
      trap.classList.remove('hidden');
      trap.scrollIntoView({behavior: 'auto'});
    }
  });

  document.getElementById('showClues')?.addEventListener('click', () => clues.classList.toggle('hidden'));
  document.getElementById('repeatClaim')?.addEventListener('click', () => {
    trap.classList.add('hidden');
    claim.classList.remove('hidden');
    step = 0;
    renderStep();
    claim.scrollIntoView({behavior: 'auto'});
  });
  document.querySelectorAll('[data-restart]').forEach((button) => button.addEventListener('click', () => location.reload()));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && resultModal.classList.contains('open')) setModal(false);
  });

  document.body.appendChild(document.createComment(' 未參加活動的使用者仍會顯示中獎 '));
  document.body.appendChild(document.createComment(' 所有輸入只存在當前 DOM，不會送出或持久化 '));
})();
