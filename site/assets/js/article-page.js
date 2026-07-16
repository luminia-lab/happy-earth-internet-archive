(function () {
  'use strict';

  const shell = document.querySelector('[data-article-shell]');
  if (!shell) return;
  const slug = shell.dataset.slug;
  const root = shell.dataset.root || '../../';

  const fillerOverrides = {
    'relationship-fades-signs': [
      { type: 'paragraph', text: '感情變淡不一定是不愛了，也可能只是聊天變少、見面變少，或兩個人都開始把「等一下再說」說得很熟。' },
      { type: 'heading', text: '第一個跡象：聊天變少' },
      { type: 'paragraph', text: '如果以前一天聊很多句，現在只剩下「到了」「吃了」「睡了」，代表聊天內容確實變少。至於是不是感情變淡，還要看那些沒打出來的話是不是有人願意當面說。' },
      { type: 'heading', text: '第二個跡象：期待下降' },
      { type: 'paragraph', text: '當你不再期待對方回覆，可能是因為你更有安全感，也可能是因為你已經不期待。兩者看起來很像，差別通常在你看到訊息時還會不會想點開。' },
      { type: 'heading', text: '第三個跡象：相處只剩日程' },
      { type: 'paragraph', text: '如果每次見面都只是在完成排定好的行程，關係可能正在變得像行事曆。行事曆沒有錯，但行事曆通常不會主動抱你。' },
      { type: 'note', text: '三個跡象都出現，不代表一定不愛；一個都沒有，也不代表一定很愛。最直接的方法仍然是問。' }
    ],
    'silent-people-understand-most': [
      { type: 'paragraph', text: '真正懂你的人，往往什麼都不說。也有些人什麼都不說，是因為他真的不知道要說什麼。' },
      { type: 'heading', text: '沉默有很多種' },
      { type: 'paragraph', text: '有人沉默是陪伴，有人沉默是疲累，有人沉默是尊重，也有人沉默是正在看手機。外表都很安靜，內在原因可能差很多。' },
      { type: 'paragraph', text: '所以不要只因為一個人沒有說話，就立刻認定他已經看透你的人生。也可能他只是沒有聽清楚。' },
      { type: 'note', text: '懂不懂一個人，通常要看長期回應，而不是單次沉默。' }
    ],
    'home-is-a-feeling': [
      { type: 'paragraph', text: '有人說家不是一個地方，而是一種感覺。這句話很有道理，因為當你回到家時，通常確實會有回到家的感覺。' },
      { type: 'heading', text: '那些讓人知道自己回家了的小事' },
      { type: 'list', items: ['門鎖轉開的聲音', '冰箱裡那盒不知道誰留下的東西', '總是找不到另一隻的室內拖鞋', '一坐下就不想再站起來的椅子'] },
      { type: 'paragraph', text: '真正讓人想回去的，不一定是房子多漂亮，而是你知道裡面的東西就算亂，也亂得很熟悉。' },
      { type: 'note', text: '家可以是一個地方，也可以是一群人；有時候兩者剛好都在同一個地址。' }
    ],
    'after-thirty-realizations': [
      { type: 'paragraph', text: '三十歲以後，有些事情會突然變得很清楚，主要是因為你已經活到三十歲以後。' },
      { type: 'heading', text: '五件很多人早就知道，但三十歲後還是會再知道一次的事' },
      { type: 'list', items: ['時間會過去，而且過去之後就已經過去了。', '昨天比今天早一天，明天則通常比今天晚一天。', '熬夜會累，但早睡時你可能正在睡覺，無法享受自己早睡。', '存款要先存才會有，花掉之後通常就會變少。', '看完這五點之後，你的人生已經比剛開始看時多過了幾十秒。'] },
      { type: 'note', text: '沉默不一定是被說中，也可能只是不知道要回什麼。' }
    ],
    'family-needs-communication': [
      { type: 'paragraph', text: '一家人最重要的不是有話說，而是把話說出來。因為話如果一直放在心裡，通常只有放話的人知道。' },
      { type: 'heading', text: '說出來，不代表對方立刻聽懂' },
      { type: 'paragraph', text: '你可以說得很清楚，對方也可以聽得很模糊。這時候需要再說一次；如果再說一次還是模糊，就可能需要換一種說法，或換一個比較不餓的時間。' },
      { type: 'paragraph', text: '家庭溝通的理想狀態，是大家都願意聽；現實狀態，則常常是每個人都在等別人先聽。' },
      { type: 'note', text: '溝通不是保證和解，而是讓彼此至少知道正在吵什麼。' }
    ],
    'letting-go-is-growing-up': [
      { type: 'paragraph', text: '真正的成熟，是學會放下你已經拿不動的東西。尤其那個東西如果很重，放下通常會立刻比較輕鬆。' },
      { type: 'heading', text: '不是每一種放下都叫成長' },
      { type: 'paragraph', text: '放下責任可能叫逃避，放下購物袋可能叫休息，放下手機可能叫沒電。只有你知道自己放下的是什麼。' },
      { type: 'paragraph', text: '有些人一直勸別人放下，是因為那個東西不是他在拿。真正需要放下的人，通常已經知道手很痠。' },
      { type: 'note', text: '放下之前，先確認那不是別人的東西，也不是你搭車時忘記帶走的行李。' }
    ],
    'details-show-love': [
      { type: 'paragraph', text: '在乎你的人，會記得那些他記得的小事。至於忘記的小事，他通常就不記得了。' },
      { type: 'heading', text: '哪些細節看起來很像在乎' },
      { type: 'list', items: ['記得你不吃的東西，但還是會問一次確認', '知道你冷，卻不知道你把外套放在哪裡', '記得重要日子，也記得提醒你自己記得', '看出你心情不好，但先問是不是肚子餓'] },
      { type: 'paragraph', text: '細節可以代表在意，也可能代表對方記性很好。真正的差別，往往在於他記得之後有沒有做什麼。' },
      { type: 'note', text: '愛不一定藏在細節裡；有些時候，它也會很明顯地放在桌上。' }
    ],
    'quality-life-small-habits': [
      { type: 'paragraph', text: '生活品質，往往藏在每天都會做的事情裡。因為每天不會做的事情，通常比較難每天影響生活。' },
      { type: 'heading', text: '三個微小到幾乎看不見的改變' },
      { type: 'list', items: ['杯子用完就洗，下一次就會有一個洗過的杯子。', '垃圾滿了就丟，垃圾桶裡的垃圾就會減少。', '燈不用時關掉，關掉的燈通常就不會亮。'] },
      { type: 'paragraph', text: '真正的生活品質，不一定是昂貴用品，也可能只是不用在需要剪東西時找剪刀找十分鐘。' },
      { type: 'note', text: '改善日常很有效，但前提是你真的去做，而不是只把文章存起來。' }
    ],
    'tired-because-sensible': [
      { type: 'paragraph', text: '你不是累，你只是太久沒有不累了。換句話說，你很可能真的累。' },
      { type: 'heading', text: '有些疲累不是一杯咖啡能解決' },
      { type: 'paragraph', text: '咖啡可以讓你在累的時候比較清醒，但不一定能讓你不累。這兩件事常被混在一起，直到咖啡喝完。' },
      { type: 'paragraph', text: '如果每天都告訴自己再撐一下，久了以後「一下」可能會累積成很長一段時間。休息不是什麼都不做，而是先停止繼續消耗。' },
      { type: 'note', text: '持續疲倦、睡眠問題或身體不適，應尋求專業評估；本文不能替你補眠。' }
    ],
    'breakfast-personality': [
      { type: 'paragraph', text: '早餐吃什麼，常常能暴露你今天早餐吃了什麼。以下分析準確率取決於你有沒有照實回答。' },
      { type: 'heading', text: '選飯糰的人' },
      { type: 'paragraph', text: '你今天很可能想吃飯糰，或現場只剩飯糰。你做事務實，至少在付款前已經決定要買飯糰。' },
      { type: 'heading', text: '選蛋餅的人' },
      { type: 'paragraph', text: '你重視層次感，也可能只是喜歡蛋餅。如果加起司，代表你今天的蛋餅裡可能有起司。' },
      { type: 'heading', text: '什麼都沒吃的人' },
      { type: 'paragraph', text: '你沒有吃早餐。至於原因，可能很多，但共同點是早餐沒有被你吃掉。' },
      { type: 'note', text: '本測驗僅供娛樂；午餐人格需等午餐後才能判斷。' }
    ],
    'love-does-not-make-you-guess': [
      { type: 'paragraph', text: '真正愛你的人，不會讓你猜，除非他沒有說。沒有說時，你通常只能猜；猜對了叫默契，猜錯了叫你怎麼會不知道。' },
      { type: 'heading', text: '不讓你猜，也不代表每件事都會主動說' },
      { type: 'paragraph', text: '有人覺得愛就是心有靈犀，有人覺得愛就是把需求說清楚。兩種都可以，但只有第二種比較不需要通靈。' },
      { type: 'paragraph', text: '如果一句「你應該懂」反覆出現，關係裡真正被考驗的可能不是愛，而是閱讀理解。' },
      { type: 'note', text: '穩定關係可以有默契，但不應把猜測當成唯一溝通工具。' }
    ],
    'declutter-your-life': [
      { type: 'paragraph', text: '丟掉這七樣東西，家裡就會少七樣東西。只要沒有同時買進八樣，物品總數通常會下降。' },
      { type: 'heading', text: '七樣可以先檢查的東西' },
      { type: 'list', items: ['已經乾掉但一直捨不得丟的筆', '只剩一隻、又確定不會找到另一隻的襪子', '過期很久仍放在抽屜裡的優惠券', '不知道是哪台機器的說明書', '完全不合身卻被期待有一天會合身的衣服', '留著也不會再看的空盒子', '看完這篇後仍打算「改天再整理」的念頭'] },
      { type: 'paragraph', text: '前六樣丟掉後，家裡少六樣；第七樣若也成功放下，才會完整少七樣。' },
      { type: 'note', text: '證件、合約、保固資料與有保存期限要求的文件，不要因為想湊滿七樣就亂丟。' }
    ],
    'simple-happiness': [
      { type: 'paragraph', text: '幸福其實很簡單，複雜的是把簡單說得很複雜。為了說明這件事，我們需要先用一段比較複雜的方式討論簡單。' },
      { type: 'heading', text: '第一步：先理解什麼叫簡單' },
      { type: 'paragraph', text: '簡單通常指不複雜，但不複雜不一定很容易；容易也不一定很簡單。當你開始分辨這些差別時，原本簡單的事情就會開始變得比較複雜。' },
      { type: 'heading', text: '第二步：把複雜放回簡單裡' },
      { type: 'paragraph', text: '有人喝到一杯剛好的水就很幸福，有人需要一套完整的方法論才能確認自己正在幸福。兩者都可以，差別只是前者已經喝完水。' },
      { type: 'note', text: '幸福可能很簡單；這篇文章主要負責把它說得比較長。' }
    ]
  };

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
      const article = { ...sourceArticle };
      if (fillerOverrides[slug]) article.content = fillerOverrides[slug];
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
