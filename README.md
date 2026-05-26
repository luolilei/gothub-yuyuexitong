# gothub-yuyuexitong

移动端上门美容服务预约系统，包含微信小程序端、Node.js 后端、SQLite 数据库和管理员后台。

## 功能

- 用户登录：使用手机号、称呼和常用地址快速登录。
- 上门预约：选择美容服务、日期、时间、地址和备注后提交预约。
- 我的预约：用户可查看自己的预约记录和处理状态。
- 数据入库：预约数据写入本地 SQLite 数据库 `data/app.db`。
- 管理后台：管理员可查看所有预约，并修改预约状态。
- 小程序发布：`miniprogram` 目录可导入微信开发者工具继续配置和上传。

## 目录结构

```text
.
├── miniprogram/        # 微信小程序端
├── public/             # 管理员后台静态页面
├── server.js           # Node.js API 服务和静态后台服务
├── package.json        # 项目脚本
└── README.md
```

## 本地运行

项目使用 Node.js 24 自带的 `node:sqlite`，不需要安装第三方依赖。

```powershell
cd D:\loeley-work\codex\gothub-yuyuexitong
node server.js
```

启动后访问：

```text
http://localhost:4173
```

默认管理员口令：

```text
admin123
```

生产环境建议用环境变量修改：

```powershell
$env:ADMIN_TOKEN="your-strong-password"
node server.js
```

## 微信小程序调试

1. 打开微信开发者工具。
2. 选择“导入项目”。
3. 项目目录选择 `miniprogram`。
4. AppID 可先选择测试号，或替换为你自己的小程序 AppID。
5. 本地调试时后端地址默认为：

```js
http://localhost:4173
```

配置位置：

```text
miniprogram/app.js
```

发布到微信小程序前，需要把 `apiBase` 改成你的 HTTPS 后端域名，并在微信公众平台配置 request 合法域名。

## API 简表

| 方法 | 地址 | 说明 |
| --- | --- | --- |
| POST | `/api/login` | 用户登录或注册 |
| POST | `/api/appointments` | 提交预约 |
| GET | `/api/my-appointments` | 查看我的预约 |
| GET | `/api/admin/appointments` | 管理员查看所有预约 |
| POST | `/api/admin/appointments/status` | 管理员修改预约状态 |

## 数据库

首次启动服务时会自动创建：

```text
data/app.db
```

包含两张表：

- `users`：用户信息和登录 token。
- `appointments`：预约信息、状态和创建时间。

## 发布建议

- 后端部署到支持 Node.js 24 的服务器。
- 使用 HTTPS 域名提供 API 和后台访问。
- 设置强管理员口令：`ADMIN_TOKEN`。
- 微信公众平台配置服务器域名。
- 使用微信开发者工具上传并提交审核。
