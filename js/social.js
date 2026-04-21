/**
 * 社交链接模块
 * 功能：根据 CONFIG 动态生成社交链接
 */

import { CONFIG } from '../config.js';
import { logger } from './logger.js';
import { utils } from './utils.js';

function initSocialLinks() {
    if (!CONFIG.socialLinks || !CONFIG.socialLinks.links) return;

    const socialContainer = document.getElementById('socialLinks');
    if (!socialContainer) return;

    const links = CONFIG.socialLinks.links;
    const colorScheme = CONFIG.socialLinks.colorScheme || 'cycle';
    const cycleColors = ['#ffe600', '#ff3e3e', '#3e59ff'];
    const legacyCompatMode = utils.isLegacyCompatMode();

    socialContainer.innerHTML = '';

    links.forEach(function (link, index) {
        let color = link.color;

        if (!color) {
            if (colorScheme === 'same') {
                color = cycleColors[0];
            } else {
                color = cycleColors[index % cycleColors.length];
            }
        }

        const a = document.createElement('a');
        a.href = link.url;
        a.setAttribute('aria-label', link.name);
        const isMailto = link.url.indexOf('mailto:') === 0;
        a.target = isMailto ? '_self' : '_blank';
        a.rel = isMailto ? '' : 'noopener noreferrer';

        a.className = 'social-link social-link--custom';
        a.style.setProperty('--custom-color', color);
        if (legacyCompatMode) {
            a.style.color = color;
        }

        const label = document.createElement('span');
        label.className = 'link-label';
        label.textContent = link.name;

        if (!legacyCompatMode && link.icon) {
            const icon = document.createElement('i');
            icon.className = link.icon;
            icon.setAttribute('aria-hidden', 'true');
            a.appendChild(icon);
        }

        a.appendChild(label);
        socialContainer.appendChild(a);
    });

    logger.log('[配置] 已生成 ' + links.length + ' 个社交链接');
}

function applyProfileConfig() {
    const config = CONFIG.profile;

    const nameEl = document.querySelector('.name');
    if (nameEl && config.name) {
        nameEl.textContent = config.name;
    }

    const statusTextEl = document.querySelector('.status-text');
    if (statusTextEl && config.status) {
        statusTextEl.textContent = config.status;
    }

    const avatarImg = document.querySelector('.avatar-image');
    const avatarBox = document.getElementById('avatarBox');
    if (config.avatar) {
        if (avatarImg) avatarImg.src = config.avatar;
        if (avatarBox && !('objectFit' in document.documentElement.style)) {
            avatarBox.style.backgroundImage = 'url(' + config.avatar + ')';
        }
    }

    const footerTextEl = document.getElementById('footerText');
    if (footerTextEl && CONFIG.footer) {
        const text = CONFIG.footer.text || 'BUILT WITH PASSION';
        const year = new Date().getFullYear();
        footerTextEl.textContent = text + ' \u2022 ' + year;
    }

    logger.log('[配置] 个人信息已应用');
}

function detectObjectFit() {
    if (!('objectFit' in document.documentElement.style)) {
        document.documentElement.className += ' no-object-fit';
    }
}

detectObjectFit();

export { initSocialLinks, applyProfileConfig };
