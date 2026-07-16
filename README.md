# 幸福地球｜Earth Internet Culture Archive

《透光者／盧米尼亞》的虛構地球網路環境。它不是冬禾專屬頁面；凝霜、棠原、瑪黑、雅銘及其他地球出訪角色都能在不同篇章中接觸同一批網站。

## 目前包含

- `/`：幸福地球公開生活內容首頁
- `/archive/`：地球網路文化衝擊資料庫
- `/vigor/`：皇家命門研究院，生猛壯陽內容農場頁
- `/lucky/`：桃園幸福生活節，可反覆填寫的假中獎流程
- `/travel/`：雙人紐西蘭幸福之旅，獨立旅遊活動頁
- `/origin/`：星際靈魂來源鑑定所
- `/articles/`：生活與旅遊文章索引
- `/events/`：活動公告與報導索引
- `/news/`：社會報導、聲明與更正索引
- `/backstage/`：幸福地球內容製作中心

## 安全界線

- 完全靜態，沒有後端、資料庫或分析追蹤。
- 所有表單都由瀏覽器前端模擬，不會送出、儲存或傳輸資料。
- 不連接 LINE、不進行付款、不販售藥品。
- 所有醫師、機構、案例、療效、留言與抽獎均為虛構。
- 壯陽頁使用露骨成人文案，適合作品內的突發文化衝擊場景。

## 直接部署到 GitHub Pages

1. 建立新的 GitHub repository。
2. 把本 ZIP 的所有檔案上傳到 repository 根目錄。
3. 到 repository 的 **Settings → Pages**。
4. Source 選擇 **GitHub Actions**。
5. 推送後，`.github/workflows/deploy-pages.yml` 會自動發布 `site/`。

不需要 Node.js、不需要 build，也沒有 Manus 依賴。

## 本機預覽

在 repository 根目錄執行：

```bash
python -m http.server 8000 --directory site
```

然後開啟：

```text
http://localhost:8000/
```

不要直接雙擊 HTML；透過簡單 HTTP server 預覽，路徑會比較穩定。

## Vigor 圖片

Vigor 的六個語義化圖片位置詳見：

```text
site/assets/images/README.md
```

六張 Vigor 原創生成圖已轉為 WebP 並接入公開頁；語義化檔名與用途請見 `IMAGE_SWAP_GUIDE.md`。

## 文章系統

完整治理 metadata 位於：

```text
content/articles-metadata.json
```

此檔不會部署到 GitHub Pages。公開頁使用 `site/assets/data/content.json`；個別文章路由以 `data-slug` 套用 `site/assets/js/article-page.js` 共用模板。

## 文案修改

這一版採純靜態多頁 HTML，方便直接改字：

- 壯陽頁：`site/vigor/index.html`
- 抽獎頁：`site/lucky/index.html`
- 紐西蘭活動頁：`site/travel/index.html`
- 公開文章資料：`site/assets/data/content.json`
- 內部文章 metadata：`content/articles-metadata.json`
- 靈魂測驗題目：`site/assets/js/origin.js`
- 抽獎流程：`site/assets/js/lucky.js`
- 共用樣式：`site/assets/css/`

## 為什麼改成純靜態網站

原 Manus 專案是 React/Vite，部分圖片與工具依賴 Manus 內部環境。本版重做為 HTML/CSS/JavaScript：

- 可直接放 GitHub。
- 沒有套件安裝與版本問題。
- GitHub Pages 子目錄可以正常運作。
- 每一頁都能單獨編輯。
- 日後換圖片、加假文章或增加其他地球文化衝擊頁面都更簡單。
