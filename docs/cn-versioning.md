# 中文版版本管理

`package.json` 的 `version` 保留英文原版版本号。`cn-version.json` 记录该英文版本和中文修订号；正式中文版版本为 `<英文版本>-cn.<修订号>`，例如 `2.37.0-cn.1`。

发布仅含中文改动的版本时：

1. 将 `cn-version.json` 的 `revision` 加一。
2. 在 `data/changelog-cn.json` 追加相应版本的中文更新记录。
3. 运行 `node node/version-bump.js` 更新 `js/utils.js` 中的页面及缓存版本。
4. 运行 `npm run check:release-version`，确认无误后使用 `v<完整中文版版本>` 创建发布 tag。

跟进新的英文版本时，先将 `package.json`、`package-lock.json` 和 `cn-version.json` 的英文版本更新到同一个值，并把中文修订号重置为 `1`；然后按上述步骤更新页面版本与中文日志。不要直接运行 `npm version`：它会在中文版本同步前触发版本脚本并创建英文版 tag。英文原版更新记录仍保存在 `data/changelog.json`。发布工作流要求 tag 与当前中文版版本一致，以防误发旧代码。
