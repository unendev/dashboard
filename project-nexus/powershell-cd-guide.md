# PowerShell 切换目录指南

## 基本命令

### 1. `Set-Location` 命令 (推荐)
```powershell
# 切换到指定目录
Set-Location "C:\Users\YourName\Documents"

# 简写形式 (cd 或 chdir)
cd "C:\Users\YourName\Documents"
chdir "C:\Users\YourName\Documents"
```

### 2. 使用相对路径
```powershell
# 切换到上级目录
cd ..

# 切换到上两级目录
cd ..\..

# 切换到当前目录的子目录
cd SubFolderName

# 切换到兄弟目录
cd ..\OtherFolder
```

## 特殊路径快捷方式

### 1. 系统特殊文件夹
```powershell
# 用户主目录
cd ~
cd $HOME

# 桌面目录
cd ~\Desktop
cd [Environment]::GetFolderPath("Desktop")

# 文档目录
cd ~\Documents
cd [Environment]::GetFolderPath("MyDocuments")

# 程序文件目录
cd $env:ProgramFiles
```

### 2. 环境变量路径
```powershell
# 系统根目录
cd $env:SystemRoot

# 临时文件夹
cd $env:TEMP

# 程序文件目录 (x86)
cd ${env:ProgramFiles(x86)}
```

## 实用技巧

### 1. 查看当前目录
```powershell
# 显示当前工作目录
Get-Location
pwd

# 显示完整路径
$PWD.Path
```

### 2. 目录历史导航
```powershell
# 回到之前的目录
cd -

# 查看目录栈
Get-Location -Stack

# 推入目录到栈
Push-Location "C:\SomePath"

# 从栈中弹出目录
Pop-Location
```

### 3. 驱动器切换
```powershell
# 切换到 D 盘
D:

# 切换到其他驱动器并保持当前路径结构
cd D:\SamePathStructure
```

### 4. 路径自动补全
```powershell
# 输入部分路径后按 Tab 键自动补全
cd C:\Use[TAB]  # 会自动补全为 C:\Users\
```

## 实际示例

```powershell
# 从当前目录切换到项目目录
cd "D:\Study\Vue-\dashboard\project-nexus"

# 切换到上级目录查看项目结构
cd ..

# 回到项目nexus目录
cd project-nexus

# 快速回到用户主目录
cd ~

# 再回到项目目录
cd "D:\Study\Vue-\dashboard\project-nexus"
```

## 注意事项

1. **路径分隔符**: PowerShell 支持 `/` 和 `\` 两种分隔符
2. **空格处理**: 路径包含空格时需要加引号
3. **大小写**: Windows 路径不区分大小写
4. **相对路径**: 基于当前工作目录计算

## 常用快捷命令

```powershell
# 快速回到项目根目录
function proj { cd "D:\Study\Vue-\dashboard\project-nexus" }

# 快速回到桌面
function desk { cd ~\Desktop }

# 添加到 PowerShell profile 中永久使用