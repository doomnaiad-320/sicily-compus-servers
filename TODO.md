# 校园服务小程序 - 开发计划

## 项目结构
```
Campus_services/
├── backend/          # Next.js 后端 + 管理后台
├── miniprogem/       # 微信小程序
└── dev.md            # 需求文档
```

## 技术方案
- **认证方案**: JWT Token
- **图片上传**: Next.js /api/upload + 本地存储
- **Admin 认证**: 环境变量配置账号密码，登录后签发 JWT

## 角色说明
- 一个用户可以同时是普通用户和兼职者
- 通过"我的"页面的角色切换开关切换视角
- 用户视角：发布订单、查看我的订单
- 兼职者视角：接单、查看我的接单、收入统计

---

## 阶段一：后端基础搭建

### 1.1 初始化后端项目
- [x] 创建 Next.js 项目 (TypeScript + App Router)
- [x] 安装 Prisma ORM
- [x] 配置 SQLite 数据库 (开发环境)
- [x] 配置环境变量
- [x] 配置 JWT 认证中间件
- [x] 配置图片上传接口

### 1.2 数据库模型设计
- [x] User 用户表 (openid, 昵称, 头像, 手机号, 当前角色视角)
- [x] Worker 兼职者表 (用户ID, 身份证图片, 技能, 审核状态, 支付宝账号, 余额, 接单状态)
- [x] WorkerStats 兼职者统计表 (兼职者ID, 接单量, 完成量, 好评数, 差评数, 总工作时长)
- [x] Address 地址表 (用户ID, 地址详情, 是否默认)
- [x] Order 订单表 (用户ID, 兼职者ID, 类型, 描述, 金额, 状态, 地址)
- [x] Message 消息表 (发送者, 接收者, 订单ID, 内容, 消息类型, 动作类型)
- [x] Review 评价表 (订单ID, 评分, 内容, 是否好评)
- [x] Withdrawal 提现表 (兼职者ID, 金额, 状态, 支付宝账号)
- [x] AfterSale 售后表 (订单ID, 原因, 状态, 处理结果)
- [x] Appeal 申诉表 (订单ID, 用户ID, 原因, 状态, 处理结果)
- [x] AdminAudit 审核记录表 (类型, 目标ID, 操作, 原因, 审核时间)

---

## 阶段二：后端 API 开发

### 2.1 用户相关 API
- [x] POST /api/user/login - 微信登录 (模拟 openid)
- [x] GET /api/user/info - 获取用户信息
- [x] PUT /api/user/info - 更新用户信息
- [x] PUT /api/user/switch-role - 切换角色视角 (user/worker)
- [x] GET /api/user/address - 地址列表
- [x] POST /api/user/address - 添加地址
- [x] PUT /api/user/address/:id - 更新地址
- [x] DELETE /api/user/address/:id - 删除地址

### 2.2 兼职者相关 API
- [x] POST /api/worker/apply - 申请成为兼职者
- [x] GET /api/worker/status - 获取认证状态
- [x] PUT /api/worker/toggle - 切换接单状态
- [x] GET /api/worker/stats - 收入统计 (接单量、好评率等)
- [x] GET /api/worker/balance - 余额查询
- [x] PUT /api/worker/alipay - 设置支付宝账号

### 2.3 订单相关 API
- [x] POST /api/order - 发布订单 (状态: 待支付)
- [x] POST /api/order/:id/pay - 模拟支付订单 (状态: 待支付 → 待咨询)
- [x] GET /api/order - 订单列表 (用户/兼职者视角)
- [x] GET /api/order/:id - 订单详情
- [x] PUT /api/order/:id - 更新订单
- [x] DELETE /api/order/:id - 删除订单 (仅待支付状态)
- [x] POST /api/order/:id/ready - 用户发布"请接单" (状态: 待咨询 → 待接单)
- [x] POST /api/order/:id/take - 兼职者接单 (状态: 待接单 → 服务中)
- [x] POST /api/order/:id/complete - 兼职者完成服务 (状态: 服务中 → 待确认)
- [x] POST /api/order/:id/confirm - 用户确认完成 (状态: 待确认 → 已完成)
- [x] POST /api/order/:id/aftersale - 申请售后 (状态: 待确认 → 售后中)
- [x] POST /api/order/:id/appeal - 申诉 (任意状态可发起)

### 2.4 售后相关 API
- [x] GET /api/aftersale/:orderId - 获取售后详情
- [x] POST /api/aftersale/:orderId/resolve - 售后处理完成 (状态: 售后中 → 待确认)

### 2.5 消息相关 API
- [x] GET /api/message/conversations - 对话列表
- [x] GET /api/message/:conversationId - 消息记录
- [x] POST /api/message - 发送消息 (支持普通消息和动作按钮消息)

### 2.6 评价相关 API
- [x] POST /api/review - 提交评价 (订单完成后)
- [x] GET /api/review/worker/:id - 兼职者评价列表

### 2.7 提现相关 API
- [x] POST /api/withdrawal - 申请提现
- [x] GET /api/withdrawal - 提现记录

### 2.8 图片上传 API
- [x] POST /api/upload - 上传图片 (身份证等)

### 2.9 Admin 相关 API
- [x] POST /api/admin/login - 管理员登录
- [x] GET /api/admin/dashboard - 仪表盘数据统计
- [x] GET /api/admin/users - 用户列表
- [x] PUT /api/admin/users/:id/disable - 禁用用户
- [x] GET /api/admin/workers - 兼职者列表 (含待审核)
- [x] POST /api/admin/workers/:id/audit - 审核兼职者 (通过/拒绝+原因)
- [x] GET /api/admin/orders - 订单列表
- [x] GET /api/admin/orders/:id - 订单详情
- [x] POST /api/admin/appeals/:id/handle - 处理申诉
- [x] GET /api/admin/reviews - 评价列表
- [x] DELETE /api/admin/reviews/:id - 删除评价
- [x] GET /api/admin/withdrawals - 提现列表
- [x] POST /api/admin/withdrawals/:id/approve - 审核提现 (通过/拒绝)

---

## 阶段三：管理后台

### 3.1 搭建管理后台
- [x] 克隆/搭建基础框架到 backend 项目
- [x] 配置 admin 登录 (单账号，环境变量配置)
- [x] 配置顶部导航（订单/兼职者/提现/评价/申诉/售后/用户）

### 3.2 管理页面开发
- [x] 仪表盘 - 数据统计（用户数、订单数、收入等）
- [x] 用户管理 - 列表、禁用占位
- [x] 兼职者管理 - 列表、审核 (通过/拒绝+原因)
- [x] 订单管理 - 列表、查看详情
- [x] 申诉管理 - 列表、处理申诉（含搜索/分页）
- [x] 评价管理 - 列表、删除（含搜索/分页）
- [x] 提现管理 - 列表、审核打款（含搜索/分页）
- [x] 售后处理 - 列表、处理（含搜索/分页）

---

## 阶段四：小程序改造

### 4.1 基础配置
- [ ] 配置 API 请求基础地址
- [ ] 封装请求拦截器 (JWT token 处理)
- [ ] 配置用户/兼职者角色判断逻辑

### 4.2 页面改造

#### 登录页 (login)
- [ ] 改造为微信一键登录
- [ ] 登录后跳转首页

#### 首页 (home)
- [ ] 用户视角：显示可发布订单入口 + 我的订单列表
- [ ] 兼职者视角：显示可接订单列表 (待接单状态)
- [ ] 订单卡片展示 (类型、描述、金额、状态)

#### 我的页面 (my)
- [ ] 角色切换开关 (用户/兼职者视角)
- [ ] 用户菜单：我的订单、地址管理、申请成为兼职者
- [ ] 兼职者菜单：接单状态开关、我的接单、收入统计、提现、设置

#### 发布页 (release)
- [ ] 改造为发布订单表单
- [ ] 选择服务类型、填写描述、选择地址、设置金额
- [ ] 提交后跳转支付 (模拟)

#### 消息页 (message)
- [ ] 对话列表展示
- [ ] 未读消息标记

#### 聊天页 (chat)
- [ ] 消息列表展示 (支持普通消息和动作按钮消息)
- [ ] 发送消息
- [ ] 动作按钮：请接单、已完成、申请售后

#### 数据中心 (dataCenter)
- [ ] 改造为兼职者收入统计
- [ ] 日/周/月收入图表
- [ ] 接单量、好评率、工作时长统计

### 4.3 新增页面

#### 地址管理页
- [ ] 地址列表
- [ ] 添加/编辑/删除地址
- [ ] 设置默认地址

#### 订单详情页
- [ ] 订单信息展示
- [ ] 根据订单状态显示不同操作按钮
- [ ] 进入聊天入口

#### 订单列表页 (我的订单/我的接单)
- [ ] 按状态筛选订单
- [ ] 订单卡片点击进入详情

#### 兼职者认证页
- [ ] 上传身份证图片
- [ ] 手机号验证 (验证码固定 1111)
- [ ] 填写技能
- [ ] 提交申请

#### 提现页面
- [ ] 余额显示
- [ ] 设置/修改支付宝账号
- [ ] 输入提现金额
- [ ] 提现记录列表

#### 评价页面
- [ ] 订单完成后弹出评价
- [ ] 评分 + 评价内容

#### 申诉页面
- [ ] 填写申诉原因
- [ ] 提交申诉

#### 售后页面
- [ ] 填写售后原因
- [ ] 提交售后申请

---

## 订单状态流转

```
待支付 (unpaid)
    ↓ 用户支付
待咨询 (consulting)
    ↓ 用户在聊天中点击"请接单"
待接单 (pending)
    ↓ 兼职者接单
服务中 (in_progress)
    ↓ 兼职者完成服务
待确认 (waiting_confirm)
    ↓ 用户确认
已完成 (completed) → 评价

售后中 (aftersale) ← 用户在待确认状态申请售后
    ↓ 兼职者继续服务完成
待确认 (waiting_confirm)

申诉中 (appealing) ← 用户申诉 (任意状态可发起，后台处理)
```

---

## 兼职者审核状态

```
未申请 (none)
    ↓ 提交申请
审核中 (pending)
    ↓ 后台审核
已通过 (approved) / 已拒绝 (rejected)
    ↓ 拒绝后可修改重新提交
审核中 (pending)
```

---

## 简化说明

1. **微信登录**：模拟 openid，不接入真实微信登录
2. **支付**：模拟支付，直接改状态
3. **身份证验证**：验证是一张图片即可
4. **短信验证**：固定验证码 1111
5. **聊天**：轮询获取消息，不用 WebSocket
6. **Admin**：单账号，写在环境变量

---

## 开发顺序

### 第一优先级：核心流程
1. 后端项目初始化 + 数据库模型
2. 用户登录 API
3. 订单发布 + 支付 API
4. 订单接单 + 状态流转 API
5. 小程序登录 + 首页 + 发布订单

### 第二优先级：完善功能
6. 消息/聊天 API + 小程序聊天页
7. 评价 API + 小程序评价页
8. 兼职者认证 API + 小程序认证页
9. 地址管理 API + 小程序地址页

### 第三优先级：扩展功能
10. 售后/申诉 API + 小程序相关页面
11. 提现 API + 小程序提现页
12. 兼职者统计 API + 小程序统计页

### 第四优先级：管理后台
13. 管理后台搭建
14. 各管理页面开发

---

请确认此计划，确认后开始开发。
