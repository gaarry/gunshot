/**
 * Audio Module - 游戏音频系统
 * 使用 Web Audio API 生成程序化音效
 */

class AudioManager {
    constructor() {
        this.context = null;
        this.masterGain = null;
        this.enabled = true;
    }

    /**
     * 初始化音频上下文
     */
    init() {
        if (this.context) return;
        
        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.context.createGain();
            this.masterGain.gain.value = 0.5;
            this.masterGain.connect(this.context.destination);
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
            this.enabled = false;
        }
    }

    /**
     * 恢复音频上下文（需要用户交互后调用）
     */
    async resume() {
        if (this.context && this.context.state === 'suspended') {
            await this.context.resume();
        }
    }

    /**
     * 创建振荡器音效
     */
    createOscillator(type, frequency, duration, gainValue = 0.3) {
        if (!this.enabled || !this.context) return;

        const oscillator = this.context.createOscillator();
        const gainNode = this.context.createGain();

        oscillator.type = type;
        oscillator.frequency.value = frequency;
        
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);

        return { oscillator, gainNode, duration };
    }

    /**
     * 射击音效
     */
    playShoot() {
        if (!this.enabled || !this.context) return;

        const now = this.context.currentTime;

        // 低频冲击
        const bass = this.context.createOscillator();
        const bassGain = this.context.createGain();
        bass.type = 'sine';
        bass.frequency.setValueAtTime(150, now);
        bass.frequency.exponentialRampToValueAtTime(40, now + 0.1);
        bassGain.gain.setValueAtTime(0.4, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        bass.connect(bassGain);
        bassGain.connect(this.masterGain);
        bass.start(now);
        bass.stop(now + 0.1);

        // 高频点击
        const click = this.context.createOscillator();
        const clickGain = this.context.createGain();
        click.type = 'square';
        click.frequency.setValueAtTime(1200, now);
        click.frequency.exponentialRampToValueAtTime(400, now + 0.03);
        clickGain.gain.setValueAtTime(0.15, now);
        clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        click.connect(clickGain);
        clickGain.connect(this.masterGain);
        click.start(now);
        click.stop(now + 0.03);

        // 噪音层
        this.playNoise(0.05, 0.1);
    }

    /**
     * 命中音效
     */
    playHit() {
        if (!this.enabled || !this.context) return;

        const now = this.context.currentTime;

        // 上升音调
        const rise = this.context.createOscillator();
        const riseGain = this.context.createGain();
        rise.type = 'sine';
        rise.frequency.setValueAtTime(400, now);
        rise.frequency.exponentialRampToValueAtTime(1200, now + 0.08);
        rise.frequency.exponentialRampToValueAtTime(800, now + 0.15);
        riseGain.gain.setValueAtTime(0.2, now);
        riseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        rise.connect(riseGain);
        riseGain.connect(this.masterGain);
        rise.start(now);
        rise.stop(now + 0.2);

        // 打击感
        const impact = this.context.createOscillator();
        const impactGain = this.context.createGain();
        impact.type = 'square';
        impact.frequency.setValueAtTime(200, now);
        impact.frequency.exponentialRampToValueAtTime(50, now + 0.1);
        impactGain.gain.setValueAtTime(0.15, now);
        impactGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        impact.connect(impactGain);
        impactGain.connect(this.masterGain);
        impact.start(now);
        impact.stop(now + 0.1);

        // 碎裂噪音
        this.playNoise(0.08, 0.15);
    }

    /**
     * 完美命中音效
     */
    playPerfectHit() {
        if (!this.enabled || !this.context) return;

        const now = this.context.currentTime;

        // 基础命中
        this.playHit();

        // 额外的和弦
        [800, 1000, 1200].forEach((freq, i) => {
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.1, now + i * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3 + i * 0.05);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now + i * 0.05);
            osc.stop(now + 0.3 + i * 0.05);
        });
    }

    /**
     * 未命中音效
     */
    playMiss() {
        if (!this.enabled || !this.context) return;

        const now = this.context.currentTime;

        // 下降音调
        const fall = this.context.createOscillator();
        const fallGain = this.context.createGain();
        fall.type = 'sawtooth';
        fall.frequency.setValueAtTime(300, now);
        fall.frequency.exponentialRampToValueAtTime(80, now + 0.25);
        fallGain.gain.setValueAtTime(0.08, now);
        fallGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        fall.connect(fallGain);
        fallGain.connect(this.masterGain);
        fall.start(now);
        fall.stop(now + 0.25);
    }

    /**
     * 连击音效
     */
    playCombo(comboLevel) {
        if (!this.enabled || !this.context) return;

        const now = this.context.currentTime;
        const baseFreq = 400 + comboLevel * 100;

        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.setValueAtTime(baseFreq * 1.5, now + 0.05);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.15);
    }

    /**
     * 白噪声生成
     */
    playNoise(gain, duration) {
        if (!this.enabled || !this.context) return;

        const bufferSize = this.context.sampleRate * duration;
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.context.createBufferSource();
        const noiseGain = this.context.createGain();
        const filter = this.context.createBiquadFilter();

        noise.buffer = buffer;
        filter.type = 'highpass';
        filter.frequency.value = 1000;

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.masterGain);

        noiseGain.gain.setValueAtTime(gain, this.context.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + duration);

        noise.start();
        noise.stop(this.context.currentTime + duration);
    }

    /**
     * 目标锁定音效
     */
    playLock() {
        if (!this.enabled || !this.context) return;

        const now = this.context.currentTime;

        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.setValueAtTime(1000, now + 0.05);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.1);
    }

    /**
     * 设置主音量
     */
    setVolume(value) {
        if (this.masterGain) {
            this.masterGain.gain.value = Math.max(0, Math.min(1, value));
        }
    }
}

// 导出单例
export const audioManager = new AudioManager();

