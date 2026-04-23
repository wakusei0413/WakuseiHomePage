/**
 * 配置校验模块
 * 功能：启动期校验 CONFIG 关键字段的存在性和类型
 */

export function validate(config) {
    const errors = [];

    function getPathValue(obj, path) {
        const parts = path.split('.');
        let current = obj;
        for (let i = 0; i < parts.length; i++) {
            if (current === undefined || current === null) return { missing: true, value: undefined };
            current = current[parts[i]];
        }
        return { missing: current === undefined || current === null, value: current };
    }

    function exists(path) {
        if (getPathValue(config, path).missing) {
            errors.push(path + ' is missing');
        }
    }

    function required(path, type, extra, label) {
        const result = getPathValue(config, path);
        const key = label || path;
        if (result.missing) {
            errors.push(key + ' is missing');
            return;
        }
        const val = result.value;
        if (type === 'string') {
            if (typeof val !== 'string') errors.push(key + ' must be a string');
            else if (extra === 'nonEmpty' && !val.length) errors.push(key + ' must be non-empty');
        } else if (type === 'number') {
            if (typeof val !== 'number') errors.push(key + ' must be a number');
            else if (extra === 'positive' && val <= 0) errors.push(key + ' must be a positive number');
        } else if (type === 'array') {
            if (!Array.isArray(val)) errors.push(key + ' must be an array');
            else if (extra === 'nonEmpty' && !val.length) errors.push(key + ' must be a non-empty array');
        } else if (type === 'enum' && !extra.includes(val)) {
            errors.push(key + ' must be one of: ' + extra.join(', '));
        }
    }

    function validateLink(link, i) {
        const p = 'socialLinks.links[' + i + ']';
        if (typeof link.name !== 'string' || !link.name.length) errors.push(p + '.name must be a non-empty string');
        if (typeof link.url !== 'string' || !link.url.length) errors.push(p + '.url must be a non-empty string');
        if (link.icon !== undefined && typeof link.icon !== 'string') errors.push(p + '.icon must be a string');
        if (link.color !== undefined && typeof link.color !== 'string') errors.push(p + '.color must be a string');
    }

    function validateStringArray(arr, path) {
        arr.forEach(function (item, i) {
            if (typeof item !== 'string' || !item.length) errors.push(path + '[' + i + '] must be a non-empty string');
        });
    }

    // Top-level keys
    [
        'profile',
        'socialLinks',
        'slogans',
        'wallpaper',
        'time',
        'loading',
        'debug',
        'footer',
        'animation',
        'effects',
        'contentProtection'
    ].forEach(exists);

    if (config.profile) {
        required('profile.name', 'string', 'nonEmpty', 'name');
        required('profile.status', 'string', undefined, 'status');
        required('profile.avatar', 'string', undefined, 'avatar');
    }

    if (config.socialLinks) {
        required('socialLinks.links', 'array', 'nonEmpty');
        if (Array.isArray(config.socialLinks.links)) {
            config.socialLinks.links.forEach(validateLink);
        }
        required('socialLinks.colorScheme', 'enum', ['cycle', 'same']);
    }

    if (config.slogans) {
        required('slogans.list', 'array', 'nonEmpty');
        if (Array.isArray(config.slogans.list)) {
            config.slogans.list.forEach(function (s, i) {
                if (typeof s !== 'string') errors.push('slogans.list[' + i + '] must be a string');
            });
        }
        required('slogans.mode', 'enum', ['random', 'sequence']);
        required('slogans.typeSpeed', 'number', 'positive');
        required('slogans.pauseDuration', 'number', 'positive');
        if (config.slogans.loop !== undefined && typeof config.slogans.loop !== 'boolean') {
            errors.push('slogans.loop must be a boolean');
        }
    }

    if (config.wallpaper) {
        required('wallpaper.apis', 'array', 'nonEmpty');
        if (Array.isArray(config.wallpaper.apis)) validateStringArray(config.wallpaper.apis, 'wallpaper.apis');
        required('wallpaper.raceTimeout', 'number', 'positive');
        required('wallpaper.maxRetries', 'number', 'positive');
        required('wallpaper.preloadCount', 'number', 'positive');
        if (config.wallpaper.infiniteScroll !== undefined) {
            required('wallpaper.infiniteScroll.enabled', 'enum', [true, false], 'infiniteScroll.enabled');
            if (
                config.wallpaper.infiniteScroll.batchSize !== undefined &&
                typeof config.wallpaper.infiniteScroll.batchSize !== 'number'
            ) {
                errors.push('infiniteScroll.batchSize must be a number');
            }
            if (
                config.wallpaper.infiniteScroll.maxImages !== undefined &&
                typeof config.wallpaper.infiniteScroll.maxImages !== 'number'
            ) {
                errors.push('infiniteScroll.maxImages must be a number');
            }
            if (
                config.wallpaper.infiniteScroll.speed !== undefined &&
                typeof config.wallpaper.infiniteScroll.speed !== 'number'
            ) {
                errors.push('infiniteScroll.speed must be a number');
            }
        }
    }
    if (config.time) {
        required('time.format', 'enum', ['24h', '12h']);
        required('time.updateInterval', 'number', 'positive');
        if (config.time.showWeekday !== undefined && typeof config.time.showWeekday !== 'boolean') {
            errors.push('time.showWeekday must be a boolean');
        }
        if (config.time.showDate !== undefined && typeof config.time.showDate !== 'boolean') {
            errors.push('time.showDate must be a boolean');
        }
    }

    if (config.loading) {
        required('loading.texts', 'array', 'nonEmpty');
        if (Array.isArray(config.loading.texts)) {
            config.loading.texts.forEach(function (t, i) {
                if (typeof t !== 'string' || !t.length)
                    errors.push('loading.texts[' + i + '] must be a non-empty string');
            });
        }
        if (config.loading.textSwitchInterval !== undefined && typeof config.loading.textSwitchInterval !== 'number') {
            errors.push('loading.textSwitchInterval must be a number');
        }
    }

    if (config.footer) {
        if (config.footer.text !== undefined && typeof config.footer.text !== 'string') {
            errors.push('footer.text must be a string');
        }
    }

    if (config.animation) {
        if (config.animation.cursorStyle !== undefined) {
            required('animation.cursorStyle', 'enum', ['block', 'line']);
        }
    }

    if (config.effects) {
        if (config.effects.scrollReveal !== undefined) {
            if (
                config.effects.scrollReveal.enabled !== undefined &&
                typeof config.effects.scrollReveal.enabled !== 'boolean'
            ) {
                errors.push('effects.scrollReveal.enabled must be a boolean');
            }
            if (
                config.effects.scrollReveal.offset !== undefined &&
                typeof config.effects.scrollReveal.offset !== 'number'
            ) {
                errors.push('effects.scrollReveal.offset must be a number');
            }
            if (
                config.effects.scrollReveal.delay !== undefined &&
                typeof config.effects.scrollReveal.delay !== 'number'
            ) {
                errors.push('effects.scrollReveal.delay must be a number');
            }
        }
    }

    if (config.debug) {
        if (config.debug.consoleLog !== undefined && typeof config.debug.consoleLog !== 'boolean') {
            errors.push('debug.consoleLog must be a boolean');
        }
    }

    if (config.contentProtection) {
        if (
            config.contentProtection.preventCopyAndDrag !== undefined &&
            typeof config.contentProtection.preventCopyAndDrag !== 'boolean'
        ) {
            errors.push('contentProtection.preventCopyAndDrag must be a boolean');
        }
    }

    return { valid: errors.length === 0, errors: errors };
}
