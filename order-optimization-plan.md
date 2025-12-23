# 订单系统优化方案

> 项目: 校园服务微信小程序
> 创建日期: 2025-12-23
> 状态: ✅ 已完成

---

## 一、优化概览

### 1.1 新订单状态流程
```
unpaid → pending → in_progress → waiting_confirm → completed
    ↓                   ↓              ↓
 cancelled          aftersale      appealing
```

### 1.2 已解决的问题

| 问题 | 解决方案 | 状态 |
|-----|---------|------|
| 缺少取消订单功能 | 新增 `/api/order/{id}/cancel` API | ✅ |
| consulting状态冗余 | 支付后直接进入pending状态 | ✅ |
| 接单无并发控制 | 使用事务+状态校验防止重复接单 | ✅ |
| 无订单编号 | 新增 orderNo 字段 (格式: CS20251223XXXX) | ✅ |
| 服务类型无约束 | 新增 ServiceType 枚举，前端下拉选择 | ✅ |
| 售后/申诉无后续流程 | 新增管理员处理API | ✅ |

---

## 二、已完成的优化

### Phase 1: 核心流程优化 ✅

#### 1.1 取消订单功能
- [x] 数据库: 添加 `cancelled` 状态和 `cancelledAt/cancelReason/cancelledBy` 字段
- [x] 用户API: `POST /api/order/{id}/cancel`
- [x] 管理员API: `POST /api/admin/orders/{id}/cancel`
- [x] 小程序: 订单详情页增加取消按钮

#### 1.2 接单并发控制
- [x] 事务内二次校验订单状态和workerId
- [x] 增加isAccepting检查
- [x] 增加进行中订单检查

#### 1.3 简化订单流程
- [x] 移除 `consulting` 状态
- [x] 支付后直接进入 `pending` 状态
- [x] 同时设置 `paidAt` 和 `readyAt`

---

### Phase 2: 数据模型优化 ✅

#### 2.1 订单编号
- [x] 新增 `orderNo` 字段 (唯一索引)
- [x] 格式: `CS` + 日期(YYYYMMDD) + 4位序号
- [x] 示例: `CS202312230001`

#### 2.2 服务类型枚举
- [x] 新增 `ServiceType` 枚举
- [x] 类型: delivery, shopping, printing, tutoring, errand, cleaning, other
- [x] 小程序发布页改为下拉选择

---

### Phase 3: 售后申诉处理 ✅

#### 3.1 售后处理API
- [x] `POST /api/admin/aftersales/{id}/resolve`
- [x] 动作: approve(退款), reject(驳回), continue(继续服务)

#### 3.2 申诉处理API
- [x] `POST /api/admin/appeals/{id}/resolve`
- [x] 动作: favor_user(支持用户), favor_worker(支持兼职者), refund(退款)

---

### Phase 4: UI/UX优化 ✅

#### 4.1 订单卡片
- [x] 显示订单编号 (#CS20251223XXXX)
- [x] 更新状态标签 (新增"已取消"状态)

#### 4.2 订单详情页
- [x] 头部显示订单编号和状态标签
- [x] 新增订单时间线 (创建→支付→接单→完成→确认)
- [x] 取消订单显示取消原因

#### 4.3 状态映射更新
- [x] 移除 consulting 状态
- [x] 新增 cancelled 状态

---

### Phase 5: 数据库索引 ✅

- [x] 新增 `createdAt` 索引
- [x] 新增 `serviceType` 索引
- [x] 更新 seed 脚本适配新 Schema

---

## 三、修改的文件清单

### 后端
| 文件 | 操作 |
|-----|------|
| `prisma/schema.prisma` | 修改 |
| `src/app/api/order/route.ts` | 修改 |
| `src/app/api/order/[id]/pay/route.ts` | 修改 |
| `src/app/api/order/[id]/take/route.ts` | 修改 |
| `src/app/api/order/[id]/cancel/route.ts` | 新建 |
| `src/app/api/admin/orders/[id]/cancel/route.ts` | 新建 |
| `src/app/api/admin/aftersales/[id]/resolve/route.ts` | 新建 |
| `src/app/api/admin/appeals/[id]/resolve/route.ts` | 新建 |
| `scripts/seed.ts` | 修改 |

### 小程序
| 文件 | 操作 |
|-----|------|
| `pages/release/index.js` | 修改 |
| `pages/release/index.wxml` | 修改 |
| `pages/release/index.less` | 修改 |
| `pages/orders/index.js` | 修改 |
| `pages/orders/index.wxml` | 修改 |
| `pages/order-detail/index.js` | 修改 |
| `pages/order-detail/index.wxml` | 修改 |
| `pages/order-detail/index.less` | 修改 |

---

## 四、下一步操作

1. 运行数据库迁移:
   ```bash
   cd backend
   npx prisma migrate dev --name order_optimization
   ```

2. 重新生成 Prisma Client:
   ```bash
   npx prisma generate
   ```

3. 重新填充测试数据 (可选):
   ```bash
   npx ts-node scripts/seed.ts
   ```

4. 重启开发服务器测试

---

## 五、API 变更汇总

### 新增 API

| 方法 | 路径 | 说明 |
|-----|------|------|
| POST | `/api/order/{id}/cancel` | 用户取消订单 |
| POST | `/api/admin/orders/{id}/cancel` | 管理员取消订单 |
| POST | `/api/admin/aftersales/{id}/resolve` | 处理售后 |
| POST | `/api/admin/appeals/{id}/resolve` | 处理申诉 |

### 移除 API

| 方法 | 路径 | 说明 |
|-----|------|------|
| POST | `/api/order/{id}/ready` | 不再需要 (支付即发布) |

### 修改 API

| 方法 | 路径 | 变更 |
|-----|------|------|
| POST | `/api/order` | 新增 serviceType, orderNo 字段 |
| POST | `/api/order/{id}/pay` | 状态直接变为 pending |
| GET | `/api/order` | 返回数据新增 orderNo, serviceType 等字段 |
