# Docker 构建和运行说明

您已成功创建 `Dockerfile` 和 `.dockerignore` 文件。现在，请按照以下步骤构建和运行您的 Docker 镜像：

## 1. 构建 Docker 镜像

在您的项目根目录（即 `Dockerfile` 所在的目录）中打开终端，然后运行以下命令：

```bash
docker build -t project-nexus .
```

*   `-t project-nexus`：为您的镜像指定一个名称（`project-nexus`）。您可以替换为您喜欢的任何名称。
*   `.`：表示 Dockerfile 位于当前目录。

此命令将根据 `Dockerfile` 中的指示构建镜像。这可能需要一些时间，具体取决于您的网络速度和机器性能。

## 2. 运行 Docker 容器

镜像构建成功后，您可以使用以下命令运行一个 Docker 容器：

```bash
docker run -p 3000:3000 project-nexus
```

*   `-p 3000:3000`：将主机的 3000 端口映射到容器的 3000 端口。Next.js 默认在 3000 端口运行。如果您的 Next.js 应用配置为在其他端口运行，请相应地修改此端口映射。
*   `project-nexus`：这是您在构建步骤中为镜像指定的名称。

现在，您的 Next.js 应用应该在 Docker 容器中运行，并且可以通过访问 `http://localhost:3000` 从您的主机浏览器中访问。

## 3. 后台运行 (可选)

如果您想让容器在后台运行，可以使用 `-d` 标志：

```bash
docker run -d -p 3000:3000 project-nexus
```

要查看正在运行的容器，请使用 `docker ps`。
要停止后台运行的容器，首先使用 `docker ps` 找到容器 ID，然后运行 `docker stop <容器ID>`。

---
**请您确认是否已收到这些说明。**
