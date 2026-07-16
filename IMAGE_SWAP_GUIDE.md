# 圖片替換工作表

| 現有檔案 | 出現頁面 | 建議替換素材 |
|---|---|---|
| `doctor-shared.svg` | 首頁、壯陽頁 | 虛構老中醫／白袍醫師人物照 |
| `couple-shared.svg` | 壯陽、抽獎、靈魂頁 | 同一對夫妻，故意跨站重複使用 |
| `sensual-gif-placeholder.svg` | 壯陽頁兩處 | 生猛但可控的成人 GIF／裁切動圖 |
| `winner-placeholder.svg` | 抽獎頁 | 得獎者拼貼、彩帶或手機獎品圖 |
| `acupoint-placeholder.svg` | 壯陽頁 | 命門、腎俞穴或古醫書示意圖 |

## 成人 GIF 建議

壯陽頁的衝擊不只靠裸露，而是靠「毫無預警地直接播放」。可準備：

1. 第一張：進入案例區前，突然出現的床上動作 GIF。
2. 第二張：滑到「撐滿」標題前，再出現更近、更生猛的 GIF。
3. 圖片寬度建議至少 720px。
4. 每段 2–5 秒循環，檔案盡量壓在 3MB 以內，避免手機載入過慢。

將檔案命名為：

```text
sensual-gif-01.gif
sensual-gif-02.gif
```

放到：

```text
site/assets/images/
```

再在 `site/vigor/index.html` 把兩處 `sensual-gif-placeholder.svg` 分別改成新檔名。
