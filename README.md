# Hz：线上访问与更新说明

更新日期：2026-10-17

## 访问网站

正式公开网址：**https://3359514748.github.io/hz-blog/**

源码与说明：https://github.com/3359514748/hz-blog

已在 GitHub Pages 发布。浏览网站不需要登录 GitHub、ChatGPT 或打开 Codex，也不依赖原电脑开机。手机、其他电脑及其他网络均可使用同一个网址；实际可达性和速度仍受当地网络对 GitHub Pages 的连接情况影响。

已核实首次 GitHub 部署成功，并通过不发送登录凭据的请求确认首页、脚本和暗色样式均返回 HTTP 200。不同运营商、不同地区或真实手机网络尚未逐一实测。

## 当前是怎么发布的

- 仓库：`3359514748/hz-blog`，公开。
- 发布源：`main` 分支，`/ (root)` 根目录。
- GitHub 自动运行 `pages build and deployment`。
- 网页文件在仓库根目录：`index.html`、`style.css`、`dark.css`、`app.js`。
- `.nojekyll` 让网页作为静态文件直接发布。

这里使用 GitHub 原生的分支发布，不需要手动配置先前源码包里的自定义 Actions 工作流。此前 ZIP 中的 `dist/` 路径是独立打包方案；维护当前线上仓库时，请以仓库根目录为准。

## 怎么更新文章

**现在还没有文章上传后台或 Markdown 自动导入。** 当前迁移解决的是公开托管和跨设备浏览。

最省事的方式：在本对话中发送正文或 Markdown 附件，说明“更新到 GitHub 版 Hz”，附标题、分类、摘要、日期。我会修改 GitHub 仓库并检查发布结果。

自己维护时，在仓库根目录编辑 `app.js`：

| 内容 | 数据位置 |
| --- | --- |
| 博客文章 | `articles` 数组 |
| 知识笔记 | `notes` 数组 |
| 项目展示 | `projects` 数组 |
| 全站短想法 | `seedIdeas` 数组 |

正文使用 HTML。保存并提交到 `main` 后，在仓库 Actions 中等待该次发布成功，再刷新公开网址。

新增条目要使用唯一 `id`。当前首页精选点击目标固定为 `garden`，博客分类列表及部分“示例”提示也为固定文案；更换精选、增减分类或替换示例时要同步调整。当前文章通过弹窗阅读，尚未提供独立文章链接。

这与参考站的“Markdown 文件 + 索引”仍有差别。如果要按参考站的方式长期写作，下一步应增加 Markdown 内容管理与文章独立链接，不能只把 `.md` 文件放进现有仓库就期待它自动显示。

## 跨设备访问与跨设备保存的区别

已提交到 GitHub 并发布的文章，所有设备都能看到。

页面“保存到本机”的想法，仍只存在当前设备、当前域名下的浏览器存储中。换手机、换浏览器或清理数据后不会自动出现。Sites 旧网址里的本机记录也不会迁到 GitHub 新网址。希望全站可见的短想法应加入仓库，私密草稿的云端同步则需要额外的身份和存储设计。

## 后续以哪个版本为准

建议将 GitHub 仓库作为公开网站的主版本。现有 Sites 网址仍是单独的私有副本，没有与 GitHub 自动同步；本次没有改变其访问范围。

GitHub 仓库和 Pages 网站均为公开内容。不要把不打算公开的文章、附件或草稿上传到该仓库；当前也没有以登录保护的私密知识库栏目。

## 参考

- [GitHub Pages 是什么](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [配置发布分支和目录](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

