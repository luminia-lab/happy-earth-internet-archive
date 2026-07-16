(function () {
  'use strict';
  const wheel = document.getElementById('wheel');
  const spinButton = document.getElementById('spinButton');
  const result = document.getElementById('resultPanel');
  const claim = document.getElementById('claimPanel');
  const stepTitle = document.getElementById('stepTitle');
  const stepBody = document.getElementById('stepBody');
  const stepButton = document.getElementById('stepButton');
  const trap = document.getElementById('trapPanel');
  const clues = document.getElementById('cluePanel');
  const restart = document.querySelectorAll('[data-restart]');
  let spinning = false;
  let step = 0;

  const steps = [
    {
      title: '確認你年滿18歲',
      body: '<label><input type="checkbox" id="adultCheck"> 我確認已年滿18歲，並同意活動辦法。</label>',
      button: '確認並繼續'
    },
    {
      title: '分享給5位好友',
      body: '<p>系統正在確認分享資格……</p><label>已分享人數<input type="range" min="0" max="5" value="0" id="shareRange"></label><p class="small">拖曳至5，模擬完成分享。</p>',
      button: '完成分享'
    },
    {
      title: '填寫領獎資料',
      body: '<div class="form-grid"><label>姓名<input autocomplete="off" placeholder="王小明"></label><label>手機<input autocomplete="off" inputmode="tel" placeholder="09xx-xxx-xxx"></label><label>電子郵件<input autocomplete="off" type="email" placeholder="name@example.com"></label><label>縣市<select><option>桃園市</option><option>臺北市</option><option>新北市</option><option>其他</option></select></label></div><label style="margin-top:12px">收件地址<input autocomplete="off" placeholder="請輸入完整地址"></label><p class="small">此為虛構互動頁面；欄位內容只存在目前瀏覽器畫面，不會送出或儲存。</p>',
      button: '確認資料'
    },
    {
      title: '支付38元行政處理費',
      body: '<p>選擇付款方式：</p><label><select><option>超商代碼</option><option>ATM虛擬帳號</option><option>信用卡</option></select></label><p class="small">不會產生真實交易，也不會要求輸入卡號。</p>',
      button: '立即支付38元'
    }
  ];

  const renderStep = () => {
    const item = steps[step];
    stepTitle.innerHTML = `<span class="step-dot">${step + 1}</span>${item.title}`;
    stepBody.innerHTML = item.body;
    stepButton.textContent = item.button;
  };

  spinButton.addEventListener('click', () => {
    if (spinning) return;
    spinning = true;
    spinButton.disabled = true;
    spinButton.textContent = '抽獎中……';
    wheel.style.transform = 'rotate(1440deg)';
    setTimeout(() => {
      result.classList.remove('hidden');
      spinButton.classList.add('hidden');
      spinning = false;
    }, 1700);
  });

  document.getElementById('claimStart').addEventListener('click', () => {
    result.classList.add('hidden');
    claim.classList.remove('hidden');
    step = 0;
    renderStep();
  });

  stepButton.addEventListener('click', () => {
    if (step === 0 && !document.getElementById('adultCheck')?.checked) {
      alert('請先勾選年齡確認。');
      return;
    }
    if (step === 1 && Number(document.getElementById('shareRange')?.value || 0) < 5) {
      alert('系統顯示尚未完成5人分享。');
      return;
    }
    if (step < steps.length - 1) {
      step += 1;
      renderStep();
    } else {
      claim.classList.add('hidden');
      trap.classList.remove('hidden');
    }
  });

  document.getElementById('showClues').addEventListener('click', () => clues.classList.toggle('hidden'));
  restart.forEach((button) => button.addEventListener('click', () => location.reload()));

  document.body.appendChild(document.createComment(' 未參加活動的使用者仍會顯示中獎 '));
  document.body.appendChild(document.createComment(' 所有訪客第一次均固定抽中特獎 '));
})();
