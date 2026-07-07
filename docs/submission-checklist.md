# 考核提交内容

## 系统地址

- 系统 A 地址：
  - 本地联调地址：`http://localhost:3000`
  - 部署地址：[https://ai0706-system-a.vercel.app](https://ai0706-system-a.vercel.app)
- 系统 B 地址：
  - 生产地址：[https://ai0706.vercel.app](https://ai0706.vercel.app)

## 反思题

- 见 [docs/reflection.md](/D:/AIProjects/ai0706/docs/reflection.md)

## 需求理解与假设说明

- 见 [docs/assumptions.md](/D:/AIProjects/ai0706/docs/assumptions.md)

## 大模型调用说明

- 见 [docs/llm-usage.md](/D:/AIProjects/ai0706/docs/llm-usage.md)

## 当前可验证事实

- system B 已部署到 Vercel，并可通过健康检查确认配置状态。
- 已新建独立 system A 项目：`D:\AIProjects\ai0706-system-a`
- system A 已部署到 Vercel： [https://ai0706-system-a.vercel.app](https://ai0706-system-a.vercel.app)
- 已完成 system A 本机接口验证：
  - `GET /api/health`
  - `GET /api/v1/waybills/:waybillNo`
  - `GET /api/v1/skus/:skuCode/ownership`
  - `POST /api/v1/waybills/:waybillNo/exception-marker`
- 已完成 system B 指向本机 system A 的联调验证。
- system B 已重新部署生产环境，并已配置为指向公网 system A：
  - `V2_API_BASE_URL=https://ai0706-system-a.vercel.app`
  - `ENABLE_V2_LIVE=true`
  - `ENABLE_SUPABASE=false`

## 联调说明

本机联调时使用的 system A 鉴权方式为：

- `Authorization: Bearer replace-with-system-a-token`

system B 指向 system A 时，对应环境变量为：

- `ENABLE_V2_LIVE=true`
- `V2_API_BASE_URL=http://localhost:3000`
- `V2_API_TOKEN=replace-with-system-a-token`
