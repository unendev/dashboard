# 小黑盒爬虫个性化内容验证问题

## 背景

有一个小黑盒(Heybox)爬虫，目标是获取用户的个性化首页内容。爬虫通过注入用户Token来模拟登录状态。

## 爬虫工作流程

1. **步骤0 - 获取通用首页**：创建新页面，不设置Cookie，访问 `https://www.xiaoheihe.cn/app/bbs/home`
2. **步骤1 - 获取个性化首页**：创建新页面，设置Cookie（x_xhh_tokenid + user_pkey），访问同一URL
3. **对比分析**：比较两个列表的帖子ID，计算相似度

## 爬虫获取的数据

### 通用首页（未登录）- 10个帖子
```
1. 泰坦陨落2可真是个好游戏老父亲快奔五的人了，到我的出租屋里给我送洗完的衣服，看到
2. 玩家90190937yes sir没吃多少啊，就几百万10
3. 《秋叶原迷踪》TGS访谈：所有人都是主角的群像剧"十分期待。"实景游戏，在游戏业
4. 玩完之后，成功的找到对象了3464
5. 看不惯某会社的僵尸互啃？盘点那些绝美吻戏CG！前言你是否还在为自己推的角色小鹿乱
6. 何无虑我用三角洲复刻了战地三的名场面00:4989555
7. 关于我成功骗到朋友激活男娘恋爱物语这件事也是成功骗到朋友激活男娘恋爱物语了共7张
8. 知只大冒险2【更新日志】1.0.8版本上线！亲爱的知只们1.0.8 版本更新现已
9. 系希罗酱呀~别问了，是男生求放过99359
10. 飞天炸鸡XD和平精英画质拉满就是帅20136
```

### 个性化首页（已登录/注入Token）- 10个帖子
```
1. 游戏生涯拼图一半都是戴森球计划8865
2. 看见大份史，赶快搬过来了00:10167579
3. 干嘛......——————————————————————————10+张21
4. 外设博主不敢说的真话：到底怎么选鼠标以下只是我的个人思考，不代表购买建议这也是外
5. 兄弟谢谢你的航天zsbd41
6. 今日广西学生be like：你为啥直接给我表白啊？！星轨里不是这样的！ 你应该先
7. ASh牌连狙! 疾风大砍! S7新赛季更新公告025
8. 只爱夏夜我一向爱民如子，这四个怎么个事？看着膈应死我了。。。。。。。2315
9. 小猫咪热爱生活的方式，可能让人类有点迷惑 | 动物游戏节来喽我在做这款游戏的时候
10. 我不生产表情包，只是表情包的搬运工耶！10+张88192
```

### 用户实际在浏览器中看到的真实个性化首页（部分）
```
1. 若葉睦头人 Lv.19 - 发一些用大香蕉2做的僵毁梗图（僵尸毁灭工程）
2. 游戏资讯BOT Lv.9 - 小岛秀夫曾经常逃课打游戏！没有马里奥可能都不会入行（PC游戏）
3. 皮皮毛一只 Lv.19 - 无人深空关于深空异象的那些事（无人深空攻略）
```

## 爬虫对比分析结果
```
个性化首页帖子数: 10
通用首页帖子数: 10
共同帖子数: 0
个性化独有帖子数: 10
通用独有帖子数: 10
内容相似度: 0.0%
判断：已获取到个性化内容（内容差异较大）
```

## 用户提出的问题

1. **有没有可能两组内容虽然不同，但都不是个性化内容？**
   - 内容不同可能是其他原因导致的（时间差、随机轮转、缓存等）

2. **个性化与非个性化的逻辑差异在哪？为什么会导致内容不同？**
   - 爬虫代码中，两者访问的是同一个URL
   - 唯一区别是Cookie/Token的有无

3. **用户1个月没登录小黑盒，Token为什么仍然生效？**
   - 爬虫日志显示登录状态检测为"已登录"
   - Cookie验证显示 x_xhh_tokenid=True, user_pkey=True

4. **用户观察到的现象**：
   - 多次测试中，同一边的内容是一致的（不是随机变化的）
   - 用户实际在浏览器中看到的真实个性化首页内容，与爬虫获取的"个性化首页"内容不同

## 核心问题

请分析：
1. 爬虫获取的"通用首页"和"个性化首页"内容不同的真正原因是什么？
2. 如何判断爬虫获取的内容是否真的是个性化推荐内容？
3. 为什么爬虫获取的"个性化首页"与用户实际看到的真实个性化首页不一致？

## 相关代码片段

### 爬虫获取通用首页
```python
# 创建新页面，不设置Cookie，访问通用首页
page_no_auth = await context.new_page()
await page_no_auth.goto(HEYBOX_HOME_URL, wait_until='networkidle', timeout=60000)
await asyncio.sleep(5)
posts_no_auth = await extract_posts_from_page(page_no_auth, POST_LIMIT, "通用首页")
```

### 爬虫获取个性化首页
```python
# 预先设置Cookie
cookies_to_add = [
    {'name': 'x_xhh_tokenid', 'value': HEYBOX_TOKEN_ID, 'domain': '.xiaoheihe.cn', 'path': '/'},
    {'name': 'user_pkey', 'value': HEYBOX_USER_PKEY, 'domain': '.xiaoheihe.cn', 'path': '/'}
]
await context.add_cookies(cookies_to_add)
page = await context.new_page()
await page.goto(HEYBOX_HOME_URL, wait_until='networkidle', timeout=60000)
posts = await extract_posts_from_page(page, POST_LIMIT, "个性化首页")
```

### 帖子提取逻辑
```python
posts_data = await page.evaluate("""
    () => {
        const posts = [];
        const links = document.querySelectorAll('a[href*="/app/bbs/link/"]');
        links.forEach((link, index) => {
            if (index >= 20) return;
            const href = link.href || link.getAttribute('href');
            const fullText = link.textContent || '';
            if (href && fullText) {
                posts.push({ href: href, text: fullText.trim() });
            }
        });
        return posts;
    }
""")
```
