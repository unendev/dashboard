# Docker Compose 使用说明

您已成功创建了 `docker-compose.yml` 和 `docker.env` 文件，搭建了一套完整的、隔离的容器化应用环境。这些文件现在位于 `deployment/docker/` 目录下。

**在使用前，请务必完成以下关键步骤：**

1.  **修改密码**：打开 `deployment/docker/docker.env` 文件，将 `your_strong_password` 替换为您自己的安全密码。请确保 `POSTGRES_PASSWORD`、`POSTGRES_PRISMA_URL` 和 `POSTGRES_URL_NON_POOLING` 中的密码都已更新。

---

## 1. 首次启动和构建

**请先进入 `deployment/docker` 目录：**
```bash
cd deployment/docker
```
然后运行以下命令：

```bash
docker-compose up --build
```

*   `--build`：此标志会强制 Docker Compose 根据您的 `Dockerfile` 构建 `app` 服务的新镜像。
*   此命令会同时启动 `db` 和 `app` 两个服务。由于设置了健康检查，`app` 服务会等待 `db` 完全就绪后才启动。
*   您将在终端看到两个服务的实时日志。

## 2. 应用数据库迁移 (首次启动后)

当您看到 `app` 服务成功启动的日志后，**打开一个新的终端窗口，并进入 `deployment/docker` 目录**，然后运行以下命令来执行数据库迁移：

```bash
cd deployment/docker
docker-compose exec app npm run db:migrate
```

*   `docker-compose exec app`：在正在运行的 `app` 容器内执行一个命令。
*   `npm run db:migrate`：这是您 `package.json` 中定义的迁移命令 (`prisma migrate deploy`)。此命令会将您的 `prisma/schema.prisma` 模型同步到 Docker 容器内的 PostgreSQL 数据库中。

完成此步骤后，您的应用和数据库就完全准备好了。您可以通过浏览器访问 `http://localhost:3000` 来查看应用。

## 3. 日常启动和停止

**请先进入 `deployment/docker` 目录：**
```bash
cd deployment/docker
```

*   **启动应用 (后台运行)**：
    ```bash
    docker-compose up -d
    ```
    *   `-d` (detached mode) 会在后台启动并运行所有服务。

*   **查看服务状态和日志**：
    ```bash
    docker-compose ps
    docker-compose logs -f app
    ```
    *   `ps`：查看正在运行的服务。
    *   `logs -f app`：实时跟踪 `app` 服务的日志。

*   **停止应用**：
    ```bash
    docker-compose down
    ```
    *   此命令会停止并移除容器。由于我们使用了数据卷，您的数据库数据**不会**丢失。

## 4. 重新构建镜像

当您修改了 `Dockerfile` 或者 Next.js 应用的源代码（并希望在生产模式下测试）时，**请先进入 `deployment/docker` 目录**，然后重新构建 `app` 服务的镜像：

```bash
cd deployment/docker
docker-compose build app
# 或者直接使用 up --build
docker-compose up --build -d
```

---
**请您确认是否已收到这些说明。**
