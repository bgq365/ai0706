# V3 调用 V2 接口文档

## 目标
V3 是独立部署、独立数据库的异常运单审批系统。所有运单真实性校验、详情拉取、SKU 归属校验都通过 V2 HTTP API 完成，而不是直接连接 V2 数据库。

## 推荐接口

### 1. 查询运单详情
- `GET /api/v1/waybills/:waybillNo`
- Header:
  - `Authorization: Bearer <token>`
  - `X-Request-Id: <request-id>`
- 200:
```json
{
  "data": {
    "waybillNo": "WB20260706001",
    "customerName": "上海星芒贸易",
    "receiverName": "赵晴",
    "receiverPhone": "13800000001",
    "amount": 860,
    "status": "待出库",
    "warehouseId": "wh-sh-01",
    "syncedAt": "2026-07-06T09:00:00.000Z"
  }
}
```

### 2. 搜索运单
- `GET /api/v1/waybills?keyword=WB20260706&page=1&per_page=20`

### 3. 校验 SKU 归属
- `GET /api/v1/skus/:skuCode/ownership?waybillNo=WB20260706001`

### 4. 可选回写异常标记
- `POST /api/v1/waybills/:waybillNo/exception-marker`
- 用于在 V2 详情页提示该运单存在未关闭异常。

## 鉴权
- 优先使用 `Bearer Token` 或 `X-API-Key`
- 不要求 OAuth，但不能开放裸接口

## 超时与重试
- 读接口超时建议 `3-5s`
- 读接口允许 `1-2` 次重试
- 写接口默认不自动重试，避免重复回写

## 降级策略
- 发起异常上报、扫描真实性校验时优先实时调用 V2
- V2 不可用时：
  - 详情展示允许回退到 `waybill_snapshots`
  - 页面必须标注“数据可能非最新”
  - 不允许把快照伪装成实时结果
