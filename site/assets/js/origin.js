(function () {
  'use strict';
  const questions = [
    '你是否經常覺得地球的天空太低？',
    '你對陌生城市的第一反應是好奇、警戒、疲憊或熟悉？',
    '你是否曾夢見兩個月亮？',
    '你能否從他人的動作中感覺到未說出口的情緒？',
    '你是否不理解人類為什麼要隱藏真實感受？',
    '你第一次看到海洋時，感覺是熟悉還是恐懼？',
    '你是否需要固定的人，才能確認自己真正安全？',
    '你是否對光線、聲音或人群異常敏感？',
    '你是否常覺得某些地球制度不符合直覺？',
    '你是否記得一個不存在於地圖上的家？',
    '你是否曾經跨越非常長的距離，只為回到某個人身邊？',
    '如果有人告訴你「你不是地球人」，你會相信嗎？'
  ];
  const intro = document.getElementById('introPanel');
  const quiz = document.getElementById('quizPanel');
  const result = document.getElementById('resultPanel');
  const qText = document.getElementById('questionText');
  const progress = document.getElementById('progressBar');
  const progressRegion = progress.closest('[role="progressbar"]');
  const sameAnswer = document.getElementById('sameAnswer');
  let index = 0;

  const setState = (state) => {
    Object.entries({ intro, quiz, result }).forEach(([name, panel]) => {
      const isHidden = name !== state;
      panel.hidden = isHidden;
      panel.setAttribute('aria-hidden', String(isHidden));
    });
  };

  const render = () => {
    qText.textContent = questions[index];
    progress.style.width = `${((index + 1) / questions.length) * 100}%`;
    progressRegion.setAttribute('aria-valuenow', String(index + 1));
  };

  document.getElementById('startQuiz').addEventListener('click', () => {
    setState('quiz');
    render();
  });

  document.querySelectorAll('[data-answer]').forEach((button) => {
    button.addEventListener('click', () => {
      index += 1;
      if (index >= questions.length) {
        setState('result');
      } else {
        render();
      }
    });
  });

  document.getElementById('whySame').addEventListener('click', () => {
    sameAnswer.hidden = !sameAnswer.hidden;
    sameAnswer.setAttribute('aria-hidden', String(sameAnswer.hidden));
  });

  setState('intro');

  document.body.appendChild(document.createComment(' 訪客身分不影響測驗結果 '));
  document.body.appendChild(document.createComment(' 所有選項目前都導向同一結果 '));
  document.body.appendChild(document.createComment(' 結果命中率：100%，因為只有一個結果 '));
})();
