/**
 * Effects Module - 视觉特效系统
 */

import * as THREE from 'three';

/**
 * 显示浮动文字
 */
export function showFloatText(text, x, y, type = 'hit') {
    const floatText = document.createElement('div');
    floatText.className = `float-text ${type}`;
    floatText.textContent = text;
    floatText.style.left = `${x}px`;
    floatText.style.top = `${y}px`;
    document.body.appendChild(floatText);
    
    // 自动移除
    setTimeout(() => {
        if (floatText.parentNode) {
            floatText.parentNode.removeChild(floatText);
        }
    }, 1000);
}

/**
 * 显示枪口火焰
 */
export function showMuzzleFlash(x, y) {
    const flash = document.createElement('div');
    flash.className = 'muzzle-flash';
    flash.style.left = `${x}px`;
    flash.style.top = `${y}px`;
    document.body.appendChild(flash);
    
    setTimeout(() => {
        if (flash.parentNode) {
            flash.parentNode.removeChild(flash);
        }
    }, 150);
}

/**
 * 显示屏幕闪光
 */
export function showScreenFlash(x, y) {
    const flash = document.createElement('div');
    flash.className = 'screen-flash';
    flash.style.setProperty('--flash-x', `${(x / window.innerWidth) * 100}%`);
    flash.style.setProperty('--flash-y', `${(y / window.innerHeight) * 100}%`);
    document.body.appendChild(flash);
    
    setTimeout(() => {
        if (flash.parentNode) {
            flash.parentNode.removeChild(flash);
        }
    }, 150);
}

/**
 * 面板数值弹跳动画
 */
export function popValue(element) {
    element.classList.add('pop');
    setTimeout(() => element.classList.remove('pop'), 100);
}

/**
 * 粒子爆炸系统 (Three.js)
 */
export class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.geometry = new THREE.SphereGeometry(0.05, 6, 6);
    }

    /**
     * 创建爆炸效果
     */
    createExplosion(position, color, count = 20) {
        for (let i = 0; i < count; i++) {
            const material = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 1
            });
            
            const particle = new THREE.Mesh(this.geometry, material);
            particle.position.copy(position);
            
            // 随机方向
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const speed = 0.08 + Math.random() * 0.12;
            
            particle.userData = {
                velocity: new THREE.Vector3(
                    Math.sin(phi) * Math.cos(theta) * speed,
                    Math.sin(phi) * Math.sin(theta) * speed,
                    Math.cos(phi) * speed * 0.5
                ),
                life: 1.0,
                decay: 0.02 + Math.random() * 0.02
            };
            
            this.scene.add(particle);
            this.particles.push(particle);
        }
    }

    /**
     * 创建火花效果
     */
    createSparks(position, color, count = 10) {
        for (let i = 0; i < count; i++) {
            const sparkGeometry = new THREE.BufferGeometry();
            const positions = new Float32Array([0, 0, 0, 0, 0, 0]);
            sparkGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            
            const material = new THREE.LineBasicMaterial({
                color: color,
                transparent: true,
                opacity: 1
            });
            
            const spark = new THREE.Line(sparkGeometry, material);
            spark.position.copy(position);
            
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.15 + Math.random() * 0.1;
            
            spark.userData = {
                velocity: new THREE.Vector3(
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed,
                    (Math.random() - 0.5) * 0.1
                ),
                life: 1.0,
                decay: 0.04
            };
            
            this.scene.add(spark);
            this.particles.push(spark);
        }
    }

    /**
     * 更新粒子
     */
    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // 应用速度
            particle.position.add(particle.userData.velocity);
            
            // 应用重力和阻力
            particle.userData.velocity.y -= 0.003;
            particle.userData.velocity.multiplyScalar(0.96);
            
            // 衰减
            particle.userData.life -= particle.userData.decay;
            particle.material.opacity = particle.userData.life;
            
            // 缩放
            if (particle.scale) {
                particle.scale.setScalar(particle.userData.life);
            }
            
            // 移除死亡粒子
            if (particle.userData.life <= 0) {
                this.scene.remove(particle);
                particle.geometry.dispose();
                particle.material.dispose();
                this.particles.splice(i, 1);
            }
        }
    }

    /**
     * 清理所有粒子
     */
    clear() {
        for (const particle of this.particles) {
            this.scene.remove(particle);
            particle.geometry.dispose();
            particle.material.dispose();
        }
        this.particles = [];
    }
}

/**
 * 连击特效显示
 */
export class HitStreakDisplay {
    constructor() {
        this.element = document.getElementById('hit-streak');
        this.countElement = document.getElementById('streak-count');
        this.hideTimeout = null;
    }

    show(count) {
        if (count < 2) {
            this.hide();
            return;
        }

        this.countElement.textContent = count;
        this.element.classList.add('visible');
        
        // 添加弹跳效果
        this.countElement.style.transform = 'scale(1.3)';
        setTimeout(() => {
            this.countElement.style.transform = 'scale(1)';
        }, 100);

        // 自动隐藏
        clearTimeout(this.hideTimeout);
        this.hideTimeout = setTimeout(() => this.hide(), 2000);
    }

    hide() {
        this.element.classList.remove('visible');
    }
}
