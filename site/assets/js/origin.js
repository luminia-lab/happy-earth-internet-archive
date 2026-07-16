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
  let index = 0;

  const render = () => {
    qText.textContent = questions[index];
    progress.style.width = `${((index + 1) / questions.length) * 100}%`;
  };

  document.getElementById('startQuiz').addEventListener('click', () => {
    intro.classList.add('hidden');
    quiz.classList.remove('hidden');
    render();
  });

  document.querySelectorAll('[data-answer]').forEach((button) => {
    button.addEventListener('click', () => {
      index += 1;
      if (index >= questions.length) {
        quiz.classList.add('hidden');
        result.classList.remove('hidden');
      } else {
        render();
      }
    });
  });

  document.getElementById('whySame').addEventListener('click', () => {
    document.getElementById('sameAnswer').classList.toggle('hidden');
  });

  document.body.appendChild(document.createComment(' 訪客身分不影響測驗結果 '));
  document.body.appendChild(document.createComment(' 所有選項目前都導向同一結果 '));
  document.body.appendChild(document.createComment(' 結果命中率：100%，因為只有一個結果 '));
})();
