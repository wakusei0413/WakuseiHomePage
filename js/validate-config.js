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
            if (current === undefined || current === null) {
                return { missing: true, value: undefined };
            }
            current = current[parts[i]];
        }
        return {
            missing: current === undefined || current === null,
            value: current
        };
    }

    function exists(obj, path) {
        if (getPathValue(obj, path).missing) {
            errors.push(path + ' is missing');
            return;
        }
    }

    function validateValue(path, value, type, extra, label) {
        const errorPath = label || path;

        if (type === 'string') {
            if (typeof value !== 'string') {
                errors.push(errorPath + ' must be a string');
            } else if (extra === 'nonEmpty' && value.length === 0) {
                errors.push(errorPath + ' must be non-empty');
            }
        } else if (type === 'number') {
            if (typeof value !== 'number') {
                errors.push(errorPath + ' must be a number');
            } else if (extra === 'positive' && value <= 0) {
                errors.push(errorPath + ' must be a positive number');
            }
        } else if (type === 'array') {
            if (!Array.isArray(value)) {
                errors.push(errorPath + ' must be an array');
            } else if (extra === 'nonEmpty' && value.length === 0) {
                errors.push(errorPath + ' must be a non-empty array');
            }
        } else if (type === 'enum') {
            if (!extra.includes(value)) {
                errors.push(errorPath + ' must be one of: ' + extra.join(', '));
            }
        }
    }

    function required(obj, path, type, extra, label) {
        const result = getPathValue(obj, path);
        const errorPath = label || path;

        if (result.missing) {
            errors.push(errorPath + ' is missing');
            return;
        }
        validateValue(path, result.value, type, extra, label);
    }

    // Top-level keys (existence only — they are objects)
    exists(config, 'profile');
    exists(config, 'socialLinks');
    exists(config, 'slogans');
    exists(config, 'wallpaper');
    exists(config, 'time');
    exists(config, 'loading');
    exists(config, 'debug');

    if (config.profile) {
        required(config, 'profile.name', 'string', 'nonEmpty', 'name');
        required(config, 'profile.status', 'string', undefined, 'status');
        required(config, 'profile.avatar', 'string', undefined, 'avatar');
    }

    if (config.socialLinks) {
        required(config.socialLinks, 'links', 'array', 'nonEmpty');
        if (Array.isArray(config.socialLinks.links)) {
            config.socialLinks.links.forEach(function (link, i) {
                const prefix = 'socialLinks.links[' + i + ']';
                if (typeof link.name !== 'string' || link.name.length === 0) {
                    errors.push(prefix + '.name must be a non-empty string');
                }
                if (typeof link.url !== 'string' || link.url.length === 0) {
                    errors.push(prefix + '.url must be a non-empty string');
                }
                if (link.icon !== undefined && typeof link.icon !== 'string') {
                    errors.push(prefix + '.icon must be a string');
                }
                if (link.color !== undefined && typeof link.color !== 'string') {
                    errors.push(prefix + '.color must be a string');
                }
            });
        }
        required(config.socialLinks, 'colorScheme', 'enum', ['cycle', 'same']);
    }

    if (config.slogans) {
        required(config.slogans, 'list', 'array', 'nonEmpty');
        if (Array.isArray(config.slogans.list)) {
            config.slogans.list.forEach(function (s, i) {
                if (typeof s !== 'string') {
                    errors.push('slogans.list[' + i + '] must be a string');
                }
            });
        }
        required(config.slogans, 'mode', 'enum', ['random', 'sequence']);
        required(config.slogans, 'typeSpeed', 'number', 'positive');
        required(config.slogans, 'pauseDuration', 'number', 'positive');
    }

    if (config.wallpaper) {
        required(config.wallpaper, 'apis', 'array', 'nonEmpty');
        if (Array.isArray(config.wallpaper.apis)) {
            config.wallpaper.apis.forEach(function (api, i) {
                if (typeof api !== 'string' || api.length === 0) {
                    errors.push('wallpaper.apis[' + i + '] must be a non-empty string');
                }
            });
        }
        required(config.wallpaper, 'raceTimeout', 'number', 'positive');
        required(config.wallpaper, 'maxRetries', 'number', 'positive');
        required(config.wallpaper, 'preloadCount', 'number', 'positive');
    }

    if (config.time) {
        required(config.time, 'format', 'enum', ['24h', '12h']);
        required(config.time, 'updateInterval', 'number', 'positive');
    }

    return {
        valid: errors.length === 0,
        errors: errors
    };
}
