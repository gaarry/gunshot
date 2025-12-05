/**
 * Game Module - 游戏核心逻辑
 */

import * as THREE from 'three';
import { audioManager } from './audio.js';
import { ParticleSystem, showFloatText, showMuzzleFlash, showScreenFlash, popValue, HitStreakDisplay } from './effects.js';

export class Game {
    constructor() {
        // DOM 元素
        this.canvas = document.getElementById('game-canvas');
        this.crosshair = document.getElementById('crosshair');
        this.scoreDisplay = document.getElementById('score');
        this.comboDisplay = document.getElementById('combo');
        this.accuracyDisplay = document.getElementById('accuracy');
        this.gestureIndicator = document.getElementById('gesture-indicator');
        this.gestureStatus = document.getElementById('gesture-status');
        this.gestureHint = document.getElementById('gesture-hint');
        this.powerBar = document.getElementById('power-bar');
        
        // 游戏状态
        this.state = {
            score: 0,
            combo: 1,
            maxCombo: 1,
            hits: 0,
            shots: 0,
            lastHitTime: 0,
            comboTimeout: 2000,
            
            // 准心位置
            crosshairX: window.innerWidth / 2,
            crosshairY: window.innerHeight / 2,
            targetX: window.innerWidth / 2,
            targetY: window.innerHeight / 2,
            
            // 手势状态
            isGunPose: false,
            wasThumbUp: true,
            isShooting: false,
            shootCooldown: 200,
            
            // 锁定目标
            lockedTarget: null,
            wasLocked: false,
            
            // 游戏进行中
            running: false
        };
        
        // 飞盘配置
        this.discConfig = {
            maxCount: 4,
            colors: [0x00f5ff, 0xff00ff, 0x00ff88, 0xff6600, 0xffaa00],
            // 屏幕边界（世界坐标）
            bounds: {
                minX: -4,
                maxX: 4,
                minY: -2.5,
                maxY: 2.5
            },
            // 移动速度
            floatSpeed: 0.008,
            // 飞盘生存时间（毫秒），超时后移动到新位置
            lifeTime: 8000
        };
        
        // Three.js 组件
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.discs = [];
        this.particleSystem = null;
        this.laserLine = null;
        
        // 特效组件
        this.hitStreakDisplay = new HitStreakDisplay();
        
        // 磁吸瞄准配置
        this.magnetConfig = {
            range: 120,      // 磁吸范围（像素）
            strength: 0.6    // 磁吸强度
        };
        
        // 平滑移动配置
        this.smoothing = 0.12;
    }

    /**
     * 初始化游戏
     */
    init() {
        this.initThreeJS();
        this.initLaser();
        this.particleSystem = new ParticleSystem(this.scene);
        
        // 窗口大小变化
        window.addEventListener('resize', () => this.onResize());
    }

    /**
     * 初始化 Three.js
     */
    initThreeJS() {
        // 场景
        this.scene = new THREE.Scene();
        
        // 相机
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.z = 5;
        
        // 渲染器
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // 光照
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0x00f5ff, 0.8);
        directionalLight.position.set(5, 5, 5);
        this.scene.add(directionalLight);
        
        const backLight = new THREE.DirectionalLight(0xff00ff, 0.4);
        backLight.position.set(-5, -5, 5);
        this.scene.add(backLight);
    }

    /**
     * 初始化激光指示线
     */
    initLaser() {
        const material = new THREE.LineBasicMaterial({
            color: 0xff0066,
            transparent: true,
            opacity: 0.6,
            linewidth: 2
        });
        
        const geometry = new THREE.BufferGeometry();
        this.laserLine = new THREE.Line(geometry, material);
        this.laserLine.visible = false;
        this.scene.add(this.laserLine);
    }

    /**
     * 创建飞盘 - 在屏幕随机位置生成，作为靶子漂浮
     */
    createDisc() {
        const colorIndex = Math.floor(Math.random() * this.discConfig.colors.length);
        const color = this.discConfig.colors[colorIndex];
        const bounds = this.discConfig.bounds;
        
        // 飞盘主体 - 圆环
        const geometry = new THREE.TorusGeometry(0.4, 0.12, 16, 32);
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.95
        });
        const disc = new THREE.Mesh(geometry, material);
        
        // 中心靶心
        const centerGeometry = new THREE.CircleGeometry(0.25, 32);
        const centerMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        const center = new THREE.Mesh(centerGeometry, centerMaterial);
        disc.add(center);
        
        // 内环
        const innerRingGeometry = new THREE.TorusGeometry(0.15, 0.03, 8, 32);
        const innerRingMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.9
        });
        const innerRing = new THREE.Mesh(innerRingGeometry, innerRingMaterial);
        disc.add(innerRing);
        
        // 外发光环
        const glowGeometry = new THREE.TorusGeometry(0.5, 0.02, 8, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.5
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        disc.add(glow);
        
        // 在屏幕范围内随机位置生成（避开中心区域，确保分散）
        let posX, posY;
        let attempts = 0;
        do {
            posX = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
            posY = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
            attempts++;
        } while (this.isPositionOccupied(posX, posY) && attempts < 20);
        
        disc.position.set(posX, posY, 0);
        disc.rotation.x = Math.PI / 2;
        
        // 随机漂浮方向
        const angle = Math.random() * Math.PI * 2;
        const speed = this.discConfig.floatSpeed;
        
        disc.userData = {
            // 漂浮速度
            velocity: new THREE.Vector3(
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                0
            ),
            // 自转速度
            rotationSpeed: (Math.random() - 0.5) * 0.08,
            // 漂浮振幅和相位（用于正弦波漂浮）
            floatPhase: Math.random() * Math.PI * 2,
            floatAmplitude: 0.3 + Math.random() * 0.2,
            floatFrequency: 0.5 + Math.random() * 0.5,
            // 原始位置（用于围绕漂浮）
            originX: posX,
            originY: posY,
            // 颜色和分数
            color: color,
            points: 100,
            // 创建时间
            createdAt: Date.now(),
            // 缩放动画
            scale: 0.1
        };
        
        console.log(`🎯 创建飞盘: 位置(${posX.toFixed(2)}, ${posY.toFixed(2)})`);
        
        this.scene.add(disc);
        this.discs.push(disc);
        
        return disc;
    }
    
    /**
     * 检查位置是否被其他飞盘占用
     */
    isPositionOccupied(x, y, minDistance = 1.5) {
        for (const disc of this.discs) {
            const dx = disc.position.x - x;
            const dy = disc.position.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDistance) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * 重新定位飞盘到新位置
     */
    repositionDisc(disc) {
        const bounds = this.discConfig.bounds;
        let posX, posY;
        let attempts = 0;
        
        do {
            posX = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
            posY = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
            attempts++;
        } while (this.isPositionOccupied(posX, posY) && attempts < 20);
        
        // 更新原始位置
        disc.userData.originX = posX;
        disc.userData.originY = posY;
        disc.userData.createdAt = Date.now();
        disc.userData.floatPhase = Math.random() * Math.PI * 2;
        
        // 新的漂浮方向
        const angle = Math.random() * Math.PI * 2;
        disc.userData.velocity.set(
            Math.cos(angle) * this.discConfig.floatSpeed,
            Math.sin(angle) * this.discConfig.floatSpeed,
            0
        );
        
        console.log(`🔄 飞盘重定位: (${posX.toFixed(2)}, ${posY.toFixed(2)})`);
    }

    /**
     * 移除飞盘
     */
    removeDisc(disc) {
        const index = this.discs.indexOf(disc);
        if (index > -1) {
            this.discs.splice(index, 1);
            this.scene.remove(disc);
            
            // 清理资源
            disc.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        }
    }

    /**
     * 开始游戏
     */
    start() {
        this.state.running = true;
        
        console.log('🎮 游戏开始！生成飞盘...');
        
        // 初始化飞盘（错开时间生成，有入场效果）
        for (let i = 0; i < this.discConfig.maxCount; i++) {
            setTimeout(() => {
                const disc = this.createDisc();
                console.log(`✓ 飞盘 ${i + 1}/${this.discConfig.maxCount} 已生成`);
            }, i * 400);
        }
        
        // 开始游戏循环
        this.gameLoop();
    }

    /**
     * 更新手势状态
     */
    updateGesture(gestureState) {
        const { isGunPose, isThumbUp, fingerTip, confidence } = gestureState;
        
        this.state.isGunPose = isGunPose;
        
        if (isGunPose) {
            // 更新目标位置
            this.state.targetX = fingerTip.x * window.innerWidth;
            this.state.targetY = fingerTip.y * window.innerHeight;
            
            // 更新 UI
            this.gestureIndicator.classList.add('active');
            this.gestureStatus.textContent = isThumbUp ? '准备射击!' : '瞄准中...';
            this.gestureHint.textContent = isThumbUp ? '按下拇指射击' : '抬起拇指准备';
            this.powerBar.style.width = `${confidence * 100}%`;
            
            // 射击检测（拇指从上到下的瞬间）
            if (!isThumbUp && this.state.wasThumbUp && !this.state.isShooting) {
                this.shoot();
            }
            this.state.wasThumbUp = isThumbUp;
            
        } else {
            this.gestureIndicator.classList.remove('active');
            this.gestureStatus.textContent = '等待手势';
            this.gestureHint.textContent = '请做出手枪手势';
            this.powerBar.style.width = '0%';
            this.state.wasThumbUp = true;
        }
    }

    /**
     * 手势丢失
     */
    onGestureLost() {
        this.state.isGunPose = false;
        this.gestureIndicator.classList.remove('active');
        this.gestureStatus.textContent = '等待手势';
        this.gestureHint.textContent = '请做出手枪手势';
        this.powerBar.style.width = '0%';
    }

    /**
     * 射击
     */
    shoot() {
        if (this.state.isShooting) return;
        
        this.state.isShooting = true;
        this.state.shots++;
        
        // 恢复音频上下文
        audioManager.resume();
        
        // 播放射击音效和特效
        audioManager.playShoot();
        showMuzzleFlash(this.state.crosshairX, this.state.crosshairY);
        showScreenFlash(this.state.crosshairX, this.state.crosshairY);
        
        // 检测命中
        if (this.state.lockedTarget) {
            this.hitTarget(this.state.lockedTarget);
        } else {
            this.miss();
        }
        
        // 更新命中率
        this.updateAccuracy();
        
        // 射击冷却
        setTimeout(() => {
            this.state.isShooting = false;
        }, this.state.shootCooldown);
    }

    /**
     * 命中目标
     */
    hitTarget(disc) {
        this.state.hits++;
        
        const now = Date.now();
        const timeSinceLastHit = now - this.state.lastHitTime;
        
        // 连击判定
        if (timeSinceLastHit < this.state.comboTimeout) {
            this.state.combo = Math.min(this.state.combo + 1, 10);
        } else {
            this.state.combo = 1;
        }
        this.state.lastHitTime = now;
        
        if (this.state.combo > this.state.maxCombo) {
            this.state.maxCombo = this.state.combo;
        }
        
        // 计算分数
        const basePoints = disc.userData.points;
        const comboBonus = this.state.combo;
        const totalPoints = basePoints * comboBonus;
        
        // 更新分数
        this.state.score += totalPoints;
        this.scoreDisplay.textContent = this.state.score;
        popValue(this.scoreDisplay);
        
        // 更新连击显示
        this.comboDisplay.textContent = `x${this.state.combo}`;
        popValue(this.comboDisplay);
        this.hitStreakDisplay.show(this.state.combo);
        
        // 播放音效
        if (this.state.combo >= 5) {
            audioManager.playPerfectHit();
            showFloatText('PERFECT!', this.state.crosshairX, this.state.crosshairY - 60, 'perfect');
        } else {
            audioManager.playHit();
            showFloatText('HIT!', this.state.crosshairX, this.state.crosshairY - 60, 'hit');
        }
        
        if (this.state.combo > 1) {
            audioManager.playCombo(this.state.combo);
            showFloatText(`+${totalPoints}`, this.state.crosshairX, this.state.crosshairY - 20, 'hit');
        }
        
        // 创建爆炸效果
        this.particleSystem.createExplosion(disc.position.clone(), disc.userData.color, 25);
        this.particleSystem.createSparks(disc.position.clone(), 0xffffff, 8);
        
        // 移除飞盘
        this.removeDisc(disc);
        
        // 延迟生成新飞盘
        setTimeout(() => {
            if (this.discs.length < this.discConfig.maxCount) {
                this.createDisc();
            }
        }, 300);
        
        this.state.lockedTarget = null;
    }

    /**
     * 未命中
     */
    miss() {
        this.state.combo = 1;
        this.comboDisplay.textContent = 'x1';
        this.hitStreakDisplay.hide();
        
        audioManager.playMiss();
        showFloatText('MISS', this.state.crosshairX, this.state.crosshairY - 60, 'miss');
    }

    /**
     * 更新命中率
     */
    updateAccuracy() {
        if (this.state.shots === 0) return;
        
        const accuracy = Math.round((this.state.hits / this.state.shots) * 100);
        this.accuracyDisplay.textContent = `${accuracy}%`;
    }

    /**
     * 屏幕坐标转世界坐标
     */
    screenToWorld(screenX, screenY) {
        const vec = new THREE.Vector3(
            (screenX / window.innerWidth) * 2 - 1,
            -(screenY / window.innerHeight) * 2 + 1,
            0.5
        );
        vec.unproject(this.camera);
        vec.sub(this.camera.position).normalize();
        const distance = -this.camera.position.z / vec.z;
        return this.camera.position.clone().add(vec.multiplyScalar(distance));
    }

    /**
     * 世界坐标转屏幕坐标
     */
    worldToScreen(position) {
        const vec = position.clone();
        vec.project(this.camera);
        return {
            x: (vec.x + 1) / 2 * window.innerWidth,
            y: (-vec.y + 1) / 2 * window.innerHeight
        };
    }

    /**
     * 游戏更新
     */
    update() {
        // 磁吸辅助瞄准
        let finalTargetX = this.state.targetX;
        let finalTargetY = this.state.targetY;
        let nearestDist = Infinity;
        let nearestDisc = null;
        
        // 找最近的飞盘
        for (const disc of this.discs) {
            const screenPos = this.worldToScreen(disc.position);
            const dx = screenPos.x - this.state.targetX;
            const dy = screenPos.y - this.state.targetY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < nearestDist && dist < this.magnetConfig.range) {
                nearestDist = dist;
                nearestDisc = disc;
            }
        }
        
        // 应用磁吸
        if (nearestDisc && this.state.isGunPose) {
            const screenPos = this.worldToScreen(nearestDisc.position);
            const magnetStrength = (1 - nearestDist / this.magnetConfig.range) * this.magnetConfig.strength;
            
            finalTargetX = this.state.targetX + (screenPos.x - this.state.targetX) * magnetStrength;
            finalTargetY = this.state.targetY + (screenPos.y - this.state.targetY) * magnetStrength;
            
            this.state.lockedTarget = nearestDisc;
            this.crosshair.classList.add('locked');
            
            // 首次锁定音效
            if (!this.state.wasLocked) {
                audioManager.playLock();
                this.state.wasLocked = true;
            }
        } else {
            this.state.lockedTarget = null;
            this.crosshair.classList.remove('locked');
            this.state.wasLocked = false;
        }
        
        // 平滑移动准心
        this.state.crosshairX += (finalTargetX - this.state.crosshairX) * this.smoothing;
        this.state.crosshairY += (finalTargetY - this.state.crosshairY) * this.smoothing;
        
        // 更新准心位置
        this.crosshair.style.left = `${this.state.crosshairX}px`;
        this.crosshair.style.top = `${this.state.crosshairY}px`;
        
        // 更新激光线
        if (this.state.isGunPose) {
            const crosshairWorld = this.screenToWorld(this.state.crosshairX, this.state.crosshairY);
            const startPos = new THREE.Vector3(crosshairWorld.x, crosshairWorld.y - 6, 0);
            
            const positions = new Float32Array([
                startPos.x, startPos.y, startPos.z,
                crosshairWorld.x, crosshairWorld.y, crosshairWorld.z
            ]);
            
            this.laserLine.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            this.laserLine.visible = true;
        } else {
            this.laserLine.visible = false;
        }
        
        // 更新飞盘
        const bounds = this.discConfig.bounds;
        const now = Date.now();
        
        for (const disc of this.discs) {
            const data = disc.userData;
            
            // 出生动画：缩放渐变
            if (data.scale < 1) {
                data.scale = Math.min(1, data.scale + 0.05);
                disc.scale.setScalar(data.scale);
            }
            
            // 自转
            disc.rotation.z += data.rotationSpeed;
            
            // 轻微摇摆效果
            disc.rotation.x = Math.PI / 2 + Math.sin(now * 0.002 + data.floatPhase) * 0.15;
            disc.rotation.y = Math.sin(now * 0.0015 + data.floatPhase) * 0.1;
            
            // 围绕原点漂浮（正弦波运动）
            const time = now * 0.001;
            const floatX = Math.sin(time * data.floatFrequency + data.floatPhase) * data.floatAmplitude;
            const floatY = Math.cos(time * data.floatFrequency * 0.7 + data.floatPhase) * data.floatAmplitude * 0.6;
            
            disc.position.x = data.originX + floatX;
            disc.position.y = data.originY + floatY;
            
            // 缓慢移动原点（让飞盘整体缓慢漂移）
            data.originX += data.velocity.x;
            data.originY += data.velocity.y;
            
            // 边界反弹
            if (data.originX < bounds.minX || data.originX > bounds.maxX) {
                data.velocity.x *= -1;
                data.originX = Math.max(bounds.minX, Math.min(bounds.maxX, data.originX));
            }
            if (data.originY < bounds.minY || data.originY > bounds.maxY) {
                data.velocity.y *= -1;
                data.originY = Math.max(bounds.minY, Math.min(bounds.maxY, data.originY));
            }
            
            // 超时重新定位（让玩家不会因为飞盘太远而打不到）
            const age = now - data.createdAt;
            if (age > this.discConfig.lifeTime) {
                this.repositionDisc(disc);
            }
        }
        
        // 维持飞盘数量
        while (this.discs.length < this.discConfig.maxCount) {
            this.createDisc();
        }
        
        // 更新粒子
        this.particleSystem.update();
    }

    /**
     * 游戏循环
     */
    gameLoop() {
        if (!this.state.running) return;
        
        requestAnimationFrame(() => this.gameLoop());
        
        try {
            this.update();
            this.renderer.render(this.scene, this.camera);
        } catch (error) {
            console.error('游戏循环错误:', error);
            // 即使出错也继续运行
        }
    }

    /**
     * 窗口大小变化
     */
    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    /**
     * 暂停游戏
     */
    pause() {
        this.state.running = false;
    }

    /**
     * 恢复游戏
     */
    resume() {
        if (!this.state.running) {
            this.state.running = true;
            this.gameLoop();
        }
    }
}
