# 🔫 AR 手势射击游戏 | AR Gesture Shooter

一个基于 WebAR 技术的手势射击游戏，使用摄像头识别"手枪"手势进行瞄准和射击。

![Game Preview](https://img.shields.io/badge/Status-Ready-brightgreen)
![Three.js](https://img.shields.io/badge/Three.js-0.150.1-blue)
![MediaPipe](https://img.shields.io/badge/MediaPipe-0.4.1646424915-orange)

## ✨ 特性

### 🎮 核心玩法
- **手枪手势识别** - 食指伸直瞄准，中指/无名指/小指握拳
- **射击触发** - 大拇指快速按下触发射击
- **飞盘敌人** - 从屏幕四周飞向中心，同屏保持 4 个
- **磁吸辅助瞄准** - 准心在 120px 范围内自动吸附目标
- **连击系统** - 2 秒内连续命中增加倍率，最高 x10

### 🎨 视觉效果
- **赛博朋克 UI** - 青色 + 粉紫色科技风格
- **动态准心** - 锁定目标时变色并脉动
- **激光指示线** - 显示瞄准方向
- **粒子爆炸** - 击中目标产生彩色粒子
- **枪口火焰** - 射击时的闪光效果
- **浮动文字** - HIT/MISS/PERFECT 状态提示

### 🔧 技术特点
- **MediaPipe 版本锁定** - 使用 `0.4.1646424915` 版本，防止 WASM 不匹配
- **防崩溃加载** - 全屏 Loading，模型加载完成后才进入游戏
- **try-catch 保护** - 手势识别循环带异常处理
- **性能优化** - AI 检测 ~20fps，渲染 60fps

## 📁 项目结构

```
fruitninja/
├── index.html          # 主页面
├── css/
│   └── style.css       # 样式文件
├── js/
│   ├── main.js         # 入口文件
│   ├── game.js         # 游戏核心逻辑
│   ├── hand-tracking.js # 手势追踪模块
│   ├── audio.js        # 音频系统
│   └── effects.js      # 视觉特效
├── vercel.json         # Vercel 部署配置
└── README.md           # 说明文档
```

## 🚀 快速开始

### 本地运行

由于浏览器安全策略，需要通过 HTTP 服务器运行：

```bash
# 使用 Python
python3 -m http.server 8080

# 或使用 Node.js
npx serve .

# 或使用 PHP
php -S localhost:8080
```

然后访问 `http://localhost:8080`

### Vercel 部署

1. Fork 或克隆此仓库
2. 在 [Vercel](https://vercel.com) 导入项目
3. 点击 Deploy，等待部署完成
4. 访问生成的 URL 即可开始游戏

或使用 Vercel CLI：

```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel
```

## 🎯 操作说明

| 动作 | 手势 |
|------|------|
| **瞄准** | 食指伸直指向目标，其他手指握拳 |
| **射击** | 保持手枪手势，大拇指快速按下 |
| **连击** | 2 秒内连续命中，倍率叠加 |

### 手势示意

```
     👆 食指伸直（瞄准）
    ✊ 其他手指握拳
    👍 大拇指按下（射击）
```

### 快捷键

| 按键 | 功能 |
|------|------|
| `D` | 切换调试面板显示/隐藏 |
| `空格` | 手动射击（调试用，需先做出手枪手势） |

### 调试功能

游戏内置调试面板，显示：
- 🖐️ **手部骨骼线** - 实时显示手部21个关键点和连接线
- 📊 **手势状态** - 显示食指伸直状态、其他手指弯曲状态
- 🎯 **瞄准线** - 手枪手势时从食指延伸的虚线瞄准线

## 🛠️ 技术栈

- **Three.js** `0.150.1` - 3D 渲染引擎
- **MediaPipe Hands** `0.4.1646424915` - 手势识别
- **Web Audio API** - 程序化音效生成
- **CSS3** - 科技感 UI 动画

## ⚠️ 注意事项

1. **浏览器支持** - 推荐使用 Chrome/Edge/Safari 最新版
2. **摄像头权限** - 需要允许访问摄像头
3. **HTTPS** - 生产环境需要 HTTPS（Vercel 自动提供）
4. **光线条件** - 良好的光线有助于手势识别
5. **手势距离** - 保持手距摄像头 30-60cm 效果最佳

## 📊 性能优化

| 指标 | 目标 | 实现方式 |
|------|------|----------|
| 渲染帧率 | 60fps | requestAnimationFrame |
| 检测频率 | ~20fps | 50ms 间隔限制 |
| 粒子数量 | <100 | 自动回收机制 |
| 内存占用 | 稳定 | 资源及时释放 |

## 🎨 自定义配置

### 修改飞盘数量

```javascript
// js/game.js
this.discConfig = {
    maxCount: 4,  // 修改这里
    // ...
};
```

### 修改磁吸范围

```javascript
// js/game.js
this.magnetConfig = {
    range: 120,      // 磁吸范围（像素）
    strength: 0.6    // 磁吸强度
};
```

### 修改连击时间

```javascript
// js/game.js
this.state = {
    comboTimeout: 2000,  // 连击判定时间（毫秒）
    // ...
};
```

## 📝 更新日志

### v1.0.0
- ✅ 基础手势射击功能
- ✅ 飞盘敌人系统
- ✅ 磁吸辅助瞄准
- ✅ 连击系统
- ✅ 科技感 UI
- ✅ 粒子特效
- ✅ 音效系统

## 📄 License

MIT License - 自由使用和修改

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

Made with ❤️ using Three.js and MediaPipe

