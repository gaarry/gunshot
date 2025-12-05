/**
 * Main Entry Point - 游戏入口
 */

import { Game } from './game.js';
import { HandTracker } from './hand-tracking.js';
import { audioManager } from './audio.js';

// ==================== DOM Elements ====================
const loadingScreen = document.getElementById('loading-screen');
const loadingBar = document.getElementById('loading-bar');
const loadingText = document.getElementById('loading-text');
const video = document.getElementById('video');

const steps = {
    engine: document.getElementById('step-1'),
    model: document.getElementById('step-2'),
    camera: document.getElementById('step-3'),
    ready: document.getElementById('step-4')
};

// ==================== Global Instances ====================
let game = null;
let handTracker = null;

// ==================== Loading Progress ====================
function updateLoadingProgress(text, progress) {
    loadingText.textContent = text;
    loadingBar.style.width = `${progress}%`;
    
    // 更新步骤状态
    if (progress >= 20) {
        steps.engine.classList.add('done');
    }
    if (progress >= 50) {
        steps.model.classList.remove('active');
        steps.model.classList.add('done');
    }
    if (progress >= 80) {
        steps.camera.classList.remove('active');
        steps.camera.classList.add('done');
    }
    if (progress >= 100) {
        steps.ready.classList.remove('active');
        steps.ready.classList.add('done');
    }
    
    // 当前活跃步骤
    if (progress < 20) {
        steps.engine.classList.add('active');
    } else if (progress < 50) {
        steps.engine.classList.remove('active');
        steps.model.classList.add('active');
    } else if (progress < 80) {
        steps.model.classList.remove('active');
        steps.camera.classList.add('active');
    } else if (progress < 100) {
        steps.camera.classList.remove('active');
        steps.ready.classList.add('active');
    }
}

// ==================== Initialization ====================
async function init() {
    console.log('🎮 AR Gesture Shooter - 初始化开始');
    
    try {
        // Step 1: 初始化游戏引擎
        updateLoadingProgress('初始化游戏引擎...', 10);
        
        game = new Game();
        game.init();
        console.log('✓ 游戏引擎初始化完成');
        
        // 初始化音频管理器
        audioManager.init();
        
        updateLoadingProgress('游戏引擎就绪', 20);
        
        // Step 2: 初始化手势追踪
        console.log('🖐️ 开始初始化手势追踪...');
        
        handTracker = new HandTracker({
            detectionInterval: 33, // ~30fps 检测
            onGestureUpdate: (state) => {
                if (game) {
                    game.updateGesture(state);
                }
            },
            onTrackingLost: () => {
                if (game) {
                    game.onGestureLost();
                }
            },
            onLandmarksUpdate: (landmarks) => {
                // 可以在这里处理原始关键点数据
            }
        });
        
        await handTracker.init(video, (text, progress) => {
            console.log(`📊 ${text} (${progress}%)`);
            updateLoadingProgress(text, progress);
        });
        
        // Step 3: 完成加载
        updateLoadingProgress('系统就绪!', 100);
        console.log('✓ 所有模块初始化完成');
        
        // 延迟隐藏加载屏幕
        await new Promise(resolve => setTimeout(resolve, 800));
        
        loadingScreen.classList.add('hidden');
        
        // 开始游戏
        game.start();
        console.log('🎯 游戏开始!');
        
    } catch (error) {
        console.error('❌ 初始化失败:', error);
        loadingText.textContent = `初始化失败: ${error.message}`;
        loadingBar.style.background = 'linear-gradient(90deg, #ff3366, #ff6644)';
        
        // 显示更友好的错误信息
        if (error.name === 'NotAllowedError') {
            loadingText.textContent = '请允许访问摄像头以继续游戏';
        } else if (error.name === 'NotFoundError') {
            loadingText.textContent = '未找到摄像头设备';
        } else if (error.message.includes('MediaPipe')) {
            loadingText.textContent = '手势识别模型加载失败，请刷新重试';
        }
    }
}

// ==================== Event Listeners ====================

// 页面可见性变化
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        game?.pause();
    } else {
        game?.resume();
    }
});

// 点击恢复音频上下文
document.addEventListener('click', () => {
    audioManager.resume();
}, { once: true });

// 触摸恢复音频上下文
document.addEventListener('touchstart', () => {
    audioManager.resume();
}, { once: true });

// 键盘快捷键
document.addEventListener('keydown', (e) => {
    // D 键切换调试面板
    if (e.key === 'd' || e.key === 'D') {
        const debugPanel = document.getElementById('debug-panel');
        if (debugPanel) {
            debugPanel.style.display = debugPanel.style.display === 'none' ? 'block' : 'none';
        }
    }
    
    // 空格键手动射击（调试用）
    if (e.key === ' ' && game && game.state.isGunPose) {
        game.shoot();
    }
});

// ==================== Start ====================
init();
