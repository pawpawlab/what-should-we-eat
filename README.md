# 就吃这个 🍜

帮两个人**快速决定「今天吃什么」**的手机端小工具。

核心不是帮你发现更多餐厅，而是：**在有限信息下，替两个犹豫的人做一个足够好的决定。**

> 选位置 → 各自表达偏好 → 系统决策 → 就吃这个。一次只推荐一家。

---

## 快速开始

```bash
# 1. 克隆（新电脑第一次）
git clone https://github.com/pawpawlab/what-should-we-eat.git
cd what-should-we-eat

# 2. 安装依赖
npm install

# 3. 创建本地环境变量（⚠️ .env.local 不会进 Git，含密钥，每台电脑都要单独建一次）
cp .env.example .env.local
# 然后编辑 .env.local，填入下方「环境变量」表里的 4 个 Key
# （可从另一台开发机的 .env.local 复制，或从 Vercel 项目设置里拿）

# 4. 启动
npm run dev
```

打开 http://localhost:3000 （建议用浏览器移动端模拟器，基准宽度 390px）。

> 未配置 Key 时项目也能跑：地图/餐厅接口会返回空状态，Room 自动回退到本地 `localStorage`。要体验真实餐厅推荐和跨设备同步，需按下方说明配置高德与 Supabase。

餐厅与地点数据来自高德 Web 服务。未配置 Key 或接口无结果时，页面会展示空状态，不再使用虚拟餐厅兜底。

### 多设备协作（换电脑继续开发）

```bash
git pull        # 开工前先拉最新
# …coding…
git add -A && git commit -m "说明" && git push   # 收工推送
```

> 只有代码通过 Git 同步；`.env.local`（密钥）和 `node_modules`、`.next` 构建产物都不会同步，
> 新电脑按上面「快速开始」重新 `npm install` + 建 `.env.local` 即可。

### 双人流程怎么体验

Room 默认用 `localStorage` + 跨标签实时同步（`BroadcastChannel` / `storage` 事件），因此可以：

1. A：首页 → 选位置 → 选口味 → 生成邀请链接 `/r/XXXXX?role=guest`
2. 复制链接，在**同一浏览器的新标签页**打开（模拟 B）
3. B：选口味 → 提交
4. A 的邀请页会**自动进入匹配**，双方都能看到推荐结果
5. 换一个 / 就它了 → 打开地图导航

> 真正的跨设备同步需要接入 Supabase（见下方 Phase 3）。公网版本使用 Next.js API 读写房间，浏览器不直接写数据库。

---

## 目录结构

```
app/                      页面与路由（App Router）
  page.tsx                01 首页
  location/               02 选择位置 + 03 搜索范围（含定位失败 Bottom Sheet）
  preference/             04 我的偏好（Host）
  invite/                 05 邀请朋友 + 06 等待朋友（实时）
  r/[id]/                 07 好友入口
  r/[id]/preference/      08 好友填写偏好
  matching/               09 匹配 Loading（Bubble 融合动画）
  result/                 10 推荐结果 + 换一个 + 快挑完了 + Zero Result
  done/                   11 完成页（地图导航）
  api/                    后端接口（餐厅 / 地点，第三方 Key 只在 Server 使用）
components/               通用 Mobile 组件（Chip/Button/BottomAction/BottomSheet/Bubble/AppBar/MobileShell）
features/                 领域功能（room / preference / matching / recommendation）
lib/
  restaurant-provider/    餐厅数据源（Mock / 高德 / 工厂 / 客户端加载器）
  recommendation-engine/  ⭐ 独立的规则推荐引擎（不写在组件里）
  room/                   Room 仓储（localStorage / API 云端同步）+ 草稿 + 埋点
config/                   选项常量（品类/价格/半径）
types/                    统一 TypeScript 数据模型
```

---

## 推荐算法（Rule-based，非 LLM）

位于 [`lib/recommendation-engine`](lib/recommendation-engine)，权重集中在 [`config.ts`](lib/recommendation-engine/config.ts)：

```
附近餐厅 → Hard Filter → 单人软偏好打分 → 双方匹配分 → 餐厅质量分 → 距离分 → Top N → 带权随机 → 推荐一家
```

- **保护最不满意的一方**：`pairScore = min(a,b)*0.6 + avg(a,b)*0.4`
- **最终分**：`final = pairMatch*0.65 + quality*0.20 + distance*0.15`
- **带权随机**：从 Top N 里按分数加权抽取，所以是「替你决定」而非「搜索排序」

---

## 环境变量

复制 `.env.example` 为 `.env.local`。需要配置高德 Web 服务 Key 才会返回真实餐厅；未配置或接口失败时展示空状态。

| 变量 | 说明 |
| --- | --- |
| `AMAP_WEB_SERVICE_KEY` | 高德 Web 服务 Key（仅 Server 使用，Phase 5）|
| `NEXT_PUBLIC_AMAP_JS_KEY` | 高德 JS Key |
| `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Supabase 云端房间同步（公网使用）|

---

## 启用真实跨设备同步（Supabase）

1. 建一个 Supabase 项目，在 SQL Editor 执行 [`lib/supabase/schema.sql`](lib/supabase/schema.sql)（建表 + RLS，不开放匿名读写）
2. 在 `.env.local` 填入 `NEXT_PUBLIC_SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY`
3. 重启 `npm run dev` —— [`getRoomRepository()`](lib/room/repository.ts) 检测到配置后会**自动**从本地 localStorage 切换到 API 云端同步
4. 未配置时无缝回退本地实现，代码零改动

公网版本采用「服务端读写 + 房间 token 校验」策略：创建者保存 host token，邀请链接携带 guest token。

## 启用高德真实 POI

1. `.env.local` 填入 `AMAP_WEB_SERVICE_KEY`
2. [`getServerRestaurantProvider()`](lib/restaurant-provider/index.ts) 会自动切到 [`AmapRestaurantProvider`](lib/restaurant-provider/amap-provider.ts)
3. **坐标系已处理**：浏览器定位是 WGS-84，请求高德前会用 [`wgs84ToGcj02`](lib/geo.ts) 转成 GCJ-02（高德输入提示得到的坐标本就是 GCJ-02，不会重复转换）
4. 真实 API 异常或无结果时，[`/api/restaurants/nearby`](app/api/restaurants/nearby/route.ts) 返回空列表，结果页展示空状态

## 产品限制

极轻量、单任务、两人共同决策工具。**不做**登录/注册/收藏/评论/Feed/排行榜/AI Chat/长列表/桌面后台。每加一个功能都先问：这是在减少决策成本，还是又给用户增加选择？
