/**
 * Hand Tracking Module - MediaPipe 手势追踪
 * 包含骨骼线可视化和改进的手势识别
 */

// MediaPipe 手部关键点连接定义
const HAND_CONNECTIONS = [
    // 手腕到各指根
    [0, 1], [0, 5], [0, 17],
    // 大拇指
    [1, 2], [2, 3], [3, 4],
    // 食指
    [5, 6], [6, 7], [7, 8],
    // 中指
    [9, 10], [10, 11], [11, 12],
    // 无名指
    [13, 14], [14, 15], [15, 16],
    // 小指
    [17, 18], [18, 19], [19, 20],
    // 手掌横向连接
    [5, 9], [9, 13], [13, 17]
];

// 关键点颜色
const LANDMARK_COLORS = {
    wrist: '#00f5ff',
    thumb: '#ff6600',
    index: '#00ff88',
    middle: '#ff00ff',
    ring: '#ffaa00',
    pinky: '#ff0066'
};

export class HandTracker {
    constructor(options = {}) {
        this.onGestureUpdate = options.onGestureUpdate || (() => {});
        this.onTrackingLost = options.onTrackingLost || (() => {});
        this.onLandmarksUpdate = options.onLandmarksUpdate || (() => {});
        
        this.hands = null;
        this.camera = null;
        this.video = null;
        
        // 骨骼绘制 Canvas
        this.skeletonCanvas = null;
        this.skeletonCtx = null;
        
        // 检测频率控制
        this.lastDetectionTime = 0;
        this.detectionInterval = options.detectionInterval || 33; // ~30fps
        
        // 手势状态
        this.gestureState = {
            isGunPose: false,
            isThumbUp: false,
            fingerTip: { x: 0.5, y: 0.5 },
            confidence: 0,
            landmarks: null
        };
        
        // 平滑处理
        this.smoothingFactor = 0.4;
        this.smoothedPosition = { x: 0.5, y: 0.5 };
        
        // 调试模式
        this.debug = true;
        this.debugElements = {};
    }

    /**
     * 初始化调试面板
     */
    initDebug() {
        this.debugElements = {
            hand: document.getElementById('debug-hand'),
            index: document.getElementById('debug-index'),
            others: document.getElementById('debug-others'),
            gun: document.getElementById('debug-gun'),
            thumb: document.getElementById('debug-thumb')
        };
    }

    /**
     * 更新调试信息
     */
    updateDebug(info) {
        if (!this.debug) return;
        
        for (const [key, value] of Object.entries(info)) {
            if (this.debugElements[key]) {
                this.debugElements[key].textContent = value;
                this.debugElements[key].className = 'debug-value ' + 
                    (value === '✓' || value.includes('✓') ? 'success' : 
                     value === '✗' || value.includes('✗') ? 'error' : '');
            }
        }
    }

    /**
     * 初始化骨骼绘制 Canvas
     */
    initSkeletonCanvas() {
        this.skeletonCanvas = document.getElementById('skeleton-canvas');
        if (this.skeletonCanvas) {
            this.skeletonCtx = this.skeletonCanvas.getContext('2d');
            this.resizeSkeletonCanvas();
            window.addEventListener('resize', () => this.resizeSkeletonCanvas());
        }
    }

    /**
     * 调整骨骼 Canvas 大小
     */
    resizeSkeletonCanvas() {
        if (this.skeletonCanvas) {
            this.skeletonCanvas.width = window.innerWidth;
            this.skeletonCanvas.height = window.innerHeight;
        }
    }

    /**
     * 绘制手部骨骼
     */
    drawSkeleton(landmarks) {
        if (!this.skeletonCtx || !landmarks) return;
        
        const ctx = this.skeletonCtx;
        const width = this.skeletonCanvas.width;
        const height = this.skeletonCanvas.height;
        
        // 清除画布
        ctx.clearRect(0, 0, width, height);
        
        // 镜像坐标转换
        const toScreen = (landmark) => ({
            x: (1 - landmark.x) * width,
            y: landmark.y * height
        });
        
        // 绘制连接线
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        
        for (const [start, end] of HAND_CONNECTIONS) {
            const p1 = toScreen(landmarks[start]);
            const p2 = toScreen(landmarks[end]);
            
            // 渐变色
            const gradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
            gradient.addColorStop(0, 'rgba(0, 245, 255, 0.8)');
            gradient.addColorStop(1, 'rgba(255, 0, 255, 0.8)');
            
            ctx.beginPath();
            ctx.strokeStyle = gradient;
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }
        
        // 绘制关键点
        landmarks.forEach((landmark, index) => {
            const pos = toScreen(landmark);
            
            // 确定颜色
            let color = LANDMARK_COLORS.wrist;
            if (index >= 1 && index <= 4) color = LANDMARK_COLORS.thumb;
            else if (index >= 5 && index <= 8) color = LANDMARK_COLORS.index;
            else if (index >= 9 && index <= 12) color = LANDMARK_COLORS.middle;
            else if (index >= 13 && index <= 16) color = LANDMARK_COLORS.ring;
            else if (index >= 17 && index <= 20) color = LANDMARK_COLORS.pinky;
            
            // 发光效果
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2);
            ctx.fillStyle = color + '40';
            ctx.fill();
            
            // 实心点
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            
            // 指尖特别标记
            if ([4, 8, 12, 16, 20].includes(index)) {
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 10, 0, Math.PI * 2);
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        });
        
        // 绘制食指瞄准线（如果是手枪手势）
        if (this.gestureState.isGunPose) {
            const indexTip = toScreen(landmarks[8]);
            const indexMcp = toScreen(landmarks[5]);
            
            // 计算延长线
            const dx = indexTip.x - indexMcp.x;
            const dy = indexTip.y - indexMcp.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const nx = dx / len;
            const ny = dy / len;
            
            const endX = indexTip.x + nx * 500;
            const endY = indexTip.y + ny * 500;
            
            // 绘制瞄准线
            const aimGradient = ctx.createLinearGradient(indexTip.x, indexTip.y, endX, endY);
            aimGradient.addColorStop(0, 'rgba(255, 0, 102, 0.8)');
            aimGradient.addColorStop(1, 'rgba(255, 0, 102, 0)');
            
            ctx.beginPath();
            ctx.strokeStyle = aimGradient;
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 5]);
            ctx.moveTo(indexTip.x, indexTip.y);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    /**
     * 初始化 MediaPipe Hands
     */
    async init(videoElement, onProgress) {
        this.video = videoElement;
        
        this.initDebug();
        this.initSkeletonCanvas();
        
        try {
            onProgress?.('加载手势识别模型...', 30);
            
            // 创建 Hands 实例，锁定版本
            this.hands = new Hands({
                locateFile: (file) => {
                    console.log('Loading MediaPipe file:', file);
                    return `https://unpkg.com/@mediapipe/hands@0.4.1646424915/${file}`;
                }
            });

            // 配置选项 - 降低阈值以提高检测率
            this.hands.setOptions({
                maxNumHands: 1,
                modelComplexity: 1,
                minDetectionConfidence: 0.5,  // 降低检测阈值
                minTrackingConfidence: 0.5
            });

            // 设置结果回调
            this.hands.onResults((results) => this.processResults(results));
            
            onProgress?.('初始化摄像头...', 60);

            // 获取摄像头
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                }
            });
            
            this.video.srcObject = stream;
            
            await new Promise((resolve, reject) => {
                this.video.onloadedmetadata = () => {
                    this.video.play().then(resolve).catch(reject);
                };
                this.video.onerror = reject;
            });
            
            onProgress?.('启动手势追踪...', 90);

            // 创建 Camera 工具
            this.camera = new Camera(this.video, {
                onFrame: async () => {
                    await this.detect();
                },
                width: 1280,
                height: 720
            });
            
            await this.camera.start();
            
            onProgress?.('系统就绪!', 100);
            
            return true;
            
        } catch (error) {
            console.error('Hand tracking initialization error:', error);
            throw error;
        }
    }

    /**
     * 执行检测（带频率限制）
     */
    async detect() {
        const now = Date.now();
        if (now - this.lastDetectionTime < this.detectionInterval) {
            return;
        }
        
        this.lastDetectionTime = now;
        
        try {
            await this.hands.send({ image: this.video });
        } catch (error) {
            console.warn('Hand detection error:', error);
        }
    }

    /**
     * 处理检测结果
     */
    processResults(results) {
        // 没有检测到手
        if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
            this.gestureState.isGunPose = false;
            this.gestureState.confidence = 0;
            this.gestureState.landmarks = null;
            
            // 清除骨骼绘制
            if (this.skeletonCtx) {
                this.skeletonCtx.clearRect(0, 0, this.skeletonCanvas.width, this.skeletonCanvas.height);
            }
            
            this.updateDebug({
                hand: '✗ 未检测到',
                index: '--',
                others: '--',
                gun: '--',
                thumb: '--'
            });
            
            this.onTrackingLost();
            return;
        }

        const landmarks = results.multiHandLandmarks[0];
        this.gestureState.landmarks = landmarks;
        
        // 绘制骨骼
        this.drawSkeleton(landmarks);
        
        // 获取关键点
        const wrist = landmarks[0];
        
        // 大拇指
        const thumbTip = landmarks[4];
        const thumbIp = landmarks[3];
        const thumbMcp = landmarks[2];
        
        // 食指
        const indexTip = landmarks[8];
        const indexDip = landmarks[7];
        const indexPip = landmarks[6];
        const indexMcp = landmarks[5];
        
        // 中指
        const middleTip = landmarks[12];
        const middleDip = landmarks[11];
        const middlePip = landmarks[10];
        
        // 无名指
        const ringTip = landmarks[16];
        const ringDip = landmarks[15];
        const ringPip = landmarks[14];
        
        // 小指
        const pinkyTip = landmarks[20];
        const pinkyDip = landmarks[19];
        const pinkyPip = landmarks[18];

        // ========== 改进的手势检测 ==========
        
        // 1. 检测食指是否伸直
        // 使用多个条件综合判断
        const indexFingerLen = this.distance(indexTip, indexMcp);
        const indexCurl = this.distance(indexTip, indexPip) / this.distance(indexPip, indexMcp);
        const indexExtended = indexCurl > 0.8 && indexTip.y < indexPip.y;
        
        // 2. 检测其他手指是否弯曲
        // 中指
        const middleCurl = this.distance(middleTip, wrist) / this.distance(middlePip, wrist);
        const middleFolded = middleCurl < 1.3 || middleTip.y > middlePip.y;
        
        // 无名指
        const ringCurl = this.distance(ringTip, wrist) / this.distance(ringPip, wrist);
        const ringFolded = ringCurl < 1.3 || ringTip.y > ringPip.y;
        
        // 小指
        const pinkyCurl = this.distance(pinkyTip, wrist) / this.distance(pinkyPip, wrist);
        const pinkyFolded = pinkyCurl < 1.3 || pinkyTip.y > pinkyPip.y;
        
        // 3. 大拇指状态检测（用于射击）
        // 大拇指向上 = 准备状态，大拇指向下 = 射击
        const thumbAngle = Math.atan2(thumbTip.y - thumbMcp.y, thumbTip.x - thumbMcp.x);
        const thumbUp = thumbTip.y < thumbIp.y - 0.02;
        
        // 综合判断手枪手势（放宽条件）
        const othersFolded = (middleFolded ? 1 : 0) + (ringFolded ? 1 : 0) + (pinkyFolded ? 1 : 0);
        const isGunPose = indexExtended && othersFolded >= 2; // 至少2个手指弯曲
        
        // 计算置信度
        let confidence = 0;
        if (indexExtended) confidence += 0.4;
        if (middleFolded) confidence += 0.2;
        if (ringFolded) confidence += 0.2;
        if (pinkyFolded) confidence += 0.2;

        // 更新调试信息
        this.updateDebug({
            hand: '✓ 已检测',
            index: indexExtended ? '✓ 伸直' : '✗ 弯曲',
            others: `中${middleFolded?'✓':'✗'} 无${ringFolded?'✓':'✗'} 小${pinkyFolded?'✓':'✗'}`,
            gun: isGunPose ? '✓ 手枪' : '✗ 否',
            thumb: thumbUp ? '👆 抬起' : '👇 按下'
        });

        // 平滑位置（镜像处理）
        const rawX = 1 - indexTip.x;
        const rawY = indexTip.y;
        
        this.smoothedPosition.x += (rawX - this.smoothedPosition.x) * this.smoothingFactor;
        this.smoothedPosition.y += (rawY - this.smoothedPosition.y) * this.smoothingFactor;

        // 更新状态
        this.gestureState = {
            isGunPose,
            isThumbUp: thumbUp,
            fingerTip: { ...this.smoothedPosition },
            confidence,
            landmarks
        };

        // 回调
        this.onGestureUpdate(this.gestureState);
        this.onLandmarksUpdate(landmarks);
    }

    /**
     * 计算两点距离
     */
    distance(p1, p2) {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dz = (p1.z || 0) - (p2.z || 0);
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /**
     * 获取当前手势状态
     */
    getState() {
        return { ...this.gestureState };
    }

    /**
     * 停止追踪
     */
    stop() {
        if (this.camera) {
            this.camera.stop();
        }
        if (this.video && this.video.srcObject) {
            this.video.srcObject.getTracks().forEach(track => track.stop());
        }
    }
}
