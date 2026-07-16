# 幸福地球 v0.3 大量文章包

- 保留既有內容：5 篇
- 新增內容：24 篇
- 合計公開內容：29 篇

## 本批新增
- `articles/marine-aquarium-beginner-guide/` — 海水缸新手入門：先養水，再養魚（useful）
- `articles/tainan-heavy-motorcycle-school-sponsored/` — 台南重機駕訓怎麼選？場地、車種與道路感一次看（sponsored）
- `news/typhoon-closure-notice-20260711/` — 2026年7月11日颱風停班停課資訊：請以官方公告為準（useful）
- `articles/taiwanese-fried-chicken-hidden-combos/` — 鹽酥雞隱藏吃法：不是全部加辣就叫會吃（clickbait-but-mostly-true）
- `articles/meeting-english-words-examples/` — 會議英文常用單字與例句：從開場到收尾都用得到（useful）
- `news/intersection-redesign-controversy-comments/` — 路口改造引爭議：多一座庇護島，為什麼網友吵成兩派？（mixed）
- `articles/fish-bone-stuck-in-throat/` — 魚刺卡到喉嚨怎麼辦？不要吞飯、喝醋或硬挖（useful）
- `news/local-care-politician-press-release/` — 林議員關懷地方建設：傾聽鄉親需求，持續為幸福市打拚（sponsored）
- `articles/world-cup-2026-final-analysis/` — 2026世界盃決賽前分析：西班牙對阿根廷，勝負可能在這三區（useful）
- `news/drunk-and-drug-impaired-driving/` — 酒駕、毒駕不是運氣問題：反應變慢之前，你通常不會先知道（useful）
- `articles/the-meaning-of-meaning/` — 看完這篇，你就會知道看完這篇代表你看完了（mixed）
- `articles/relationship-fades-signs/` — 感情變淡不是不愛了？三個你早就知道的跡象（clickbait-but-mostly-true）
- `articles/silent-people-understand-most/` — 真正懂你的人，往往什麼都不說（clickbait-but-mostly-true）
- `articles/home-is-a-feeling/` — 家不是一個地方，而是一種回到家裡的感覺（clickbait-but-mostly-true）
- `articles/after-thirty-realizations/` — 三十歲以後才懂的五件事，看完沉默了（clickbait-but-mostly-true）
- `articles/family-needs-communication/` — 一家人最重要的不是有話說，而是把話說出來（clickbait-but-mostly-true）
- `articles/letting-go-is-growing-up/` — 真正的成熟，是學會放下你已經拿不動的東西（clickbait-but-mostly-true）
- `articles/details-show-love/` — 在乎你的人，會記得那些他記得的小事（clickbait-but-mostly-true）
- `articles/quality-life-small-habits/` — 生活品質，往往藏在每天都會做的事情裡（clickbait-but-mostly-true）
- `articles/tired-because-sensible/` — 你不是累，你只是太久沒有不累了（clickbait-but-mostly-true）
- `articles/breakfast-personality/` — 早餐吃什麼，暴露了你今天早餐吃了什麼（clickbait-but-mostly-true）
- `articles/love-does-not-make-you-guess/` — 真正愛你的人，不會讓你猜，除非他沒有說（clickbait-but-mostly-true）
- `articles/declutter-your-life/` — 丟掉這七樣東西，家裡就會少七樣東西（clickbait-but-mostly-true）
- `articles/simple-happiness/` — 幸福其實很簡單，複雜的是把簡單說得很複雜（clickbait-but-mostly-true）

## 施工規則

1. 以目前 GitHub main 為基準，不得退回舊版。
2. 將本包內檔案覆蓋／新增至相同 repository 路徑。
3. 不得自行改寫文章內容、人物、日期或分類。
4. 2026 世界盃文章為 2026-07-16 決賽前版本；決賽後需另行更新。
5. 颱風頁不自行宣告任何縣市停班停課，只引導核對官方公告。
6. 台南重機與政治人物文章中的業者、人物與地點均為虛構。
7. 魚刺、酒駕毒駕文章不得改成偏方或具體規避執法教學。

## 驗證

```bash
node scripts/validate-site.mjs
for file in site/assets/js/*.js; do node --check "$file"; done
```

另請以 390×844 Chromium 抽查：首頁、文章索引、海水缸、魚刺、世界盃、廢文、娛樂頻道查詢。
