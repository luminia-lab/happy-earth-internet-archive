# 文章編輯方式

一般文章、新聞與活動正文只編輯：

`site/assets/data/content.json`

不要手動編輯 `dist/`；它會在每次部署時重新生成。

新增內容至少需要：

`slug`、`route`、`section`、`title`、`category`、`summary`、`publishedDate`、`updatedDate`、`author`、`tags`、`contentType`、`relatedArticles`、`content`

修改後執行：

```sh
node scripts/validate-site.mjs
node scripts/build-static-site.mjs
node scripts/validate-static-seo.mjs
SITE_ROOT=dist node scripts/validate-site.mjs
```
