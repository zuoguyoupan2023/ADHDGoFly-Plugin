# 模型能力登记表

> 用途：记录已经查到的模型能力和本插件实测状态。官方资料只能证明“接口支持”，不能替代本插件的实际请求验证。
>
> 最后核对：2026-07-20

## 字段定义

| 字段 | 含义 |
|---|---|
| provider / model | 供应商与 API 模型 ID |
| endpoint | 本插件实际使用的请求地址 |
| text / vision / audio / video | 是否支持对应输入能力 |
| nativeBatchVision | 是否值得验证一次请求发送多张图片；不等于插件串行队列 |
| contextWindow / maxOutputTokens | 官方或供应商资料中的上下文/输出上限；未知时不填猜测值 |
| requestFormat | 请求载荷格式 |
| sourceCheckedAt | 官方资料核对日期 |
| pluginValidation | 本插件实测状态 |

## 当前登记

| provider / model | endpoint | text | vision | audio | video | nativeBatchVision | contextWindow | pluginValidation |
|---|---|---:|---:|---:|---:|---:|---:|---|
| Moonshot / `kimi-k3` | `https://api.moonshot.ai/v1/chat/completions` | 是 | 是 | 未声明 | 是（官方视觉文档列出） | 待本插件验证 | 1,048,576 | 待用户 API Key 实测 |
| Moonshot / `kimi-k2.6` | `https://api.moonshot.ai/v1/chat/completions` | 是 | 是 | 未声明 | 是（官方视觉文档列出） | 待验证 | 待以官方模型资料核对 | 未验证 |
| OpenAI / 视觉模型 | `https://api.openai.com/v1/chat/completions` | 是 | 按具体模型 | 按具体模型 | 按具体模型 | 按具体模型 | 按具体模型 | 未验证 |
| Google / Gemini | Gemini API 专用格式 | 是 | 按具体模型 | 按具体模型 | 按具体模型 | 按具体模型 | 按具体模型 | 未验证 |

## Kimi K3 本插件验证记录

- 官方接口格式：OpenAI-compatible Chat Completions；图片使用 `messages[].content[]` 中的 `image_url` + `text`。
- 本插件已切换到官方 API 地址 `https://api.moonshot.ai/v1/chat/completions`。
- 待验证项目：单图描述、图片 OCR、图表/论文图片理解、两张图片一次请求、图片+正文联合理解、失败降级。
- 当前插件工作区的多图默认仍是“逐图串行”，不自动假设 K3 的原生多图能力已验证。

## 来源

- Kimi Vision 官方文档：<https://platform.kimi.ai/docs/guide/use-kimi-vision-model>
- Kimi K3 官方发布/更新说明：<https://www.kimi.com/code/docs/en/kimi-code/whats-new.html>
- Google Gemini 文件输入文档：<https://ai.google.dev/gemini-api/docs/file-input-methods>
- OpenAI 模型与音频接口文档：<https://platform.openai.com/docs/models>
