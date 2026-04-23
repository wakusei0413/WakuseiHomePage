/**
 * 背景音频模块
 * 提供音频初始化、预加载和播放功能
 */

/**
 * 初始化背景音频
 * @param {Object} config — 来自 CONFIG.audio
 * @param {Object} logger — logger 对象（含 .log / .warn / .error）
 * @returns {HTMLAudioElement|null} — 创建的 audio 元素，若未启用或环境不支持则返回 null
 */
export function initAudio(config, logger) {
    if (!config || !config.enabled) {
        return null;
    }

    // 检查浏览器是否支持音频
    if (typeof Audio === 'undefined') {
        logger.warn('[音频] 浏览器不支持 HTMLAudioElement');
        return null;
    }

    const audio = new Audio();

    // 设置音源
    if (config.src) {
        audio.src = config.src;
    }

    // 设置音量
    if (typeof config.volume === 'number') {
        audio.volume = Math.max(0, Math.min(1, config.volume));
    }

    // 设置循环
    if (config.loop) {
        audio.loop = true;
    }

    // 预加载
    audio.load();
    logger.log('[音频] 音频开始预加载:', config.src || '无 src');

    // 监听加载错误
    audio.addEventListener('error', function () {
        logger.warn('[音频] 加载失败:', config.src || '无 src');
    });

    return audio;
}

/**
 * 尝试播放音频（应在加载完成、进入主页后调用）
 * @param {HTMLAudioElement|null} audio — initAudio 返回值
 * @param {Object} logger — logger 对象
 */
export function tryPlay(audio, logger) {
    if (!audio) {
        return;
    }

    const playPromise = audio.play();

    if (playPromise !== undefined) {
        playPromise
            .then(function () {
                if (logger) {
                    logger.log('[音频] 播放已开始');
                }
            })
            .catch(function (error) {
                if (logger) {
                    if (error.name === 'NotAllowedError') {
                        logger.warn('[音频] 浏览器阻止播放');
                    } else {
                        logger.warn('[音频] 播放失败:', error.message);
                    }
                }
            });
    }
}
