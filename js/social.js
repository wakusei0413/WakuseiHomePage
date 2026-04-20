/**
 * 社交链接模块
 * 功能：根据 CONFIG 动态生成社交链接
 */
(function () {
    'use strict';

    function initSocialLinks() {
        if (!App.config.socialLinks || !App.config.socialLinks.links) return;

        var socialContainer = document.getElementById('socialLinks');
        if (!socialContainer) return;

        var links = App.config.socialLinks.links;
        var colorScheme = App.config.socialLinks.colorScheme || 'cycle';
        var cycleColors = ['#ffe600', '#ff3e3e', '#3e59ff'];
        var legacyCompatMode = App.utils.isLegacyCompatMode();

        socialContainer.innerHTML = '';

        links.forEach(function (link, index) {
            var color = link.color;

            if (!color) {
                if (colorScheme === 'same') {
                    color = cycleColors[0];
                } else {
                    color = cycleColors[index % cycleColors.length];
                }
            }

            var a = document.createElement('a');
            a.href = link.url;
            a.setAttribute('aria-label', link.name);
            var isMailto = link.url.indexOf('mailto:') === 0;
            a.target = isMailto ? '_self' : '_blank';
            a.rel = isMailto ? '' : 'noopener noreferrer';

            a.className = 'social-link social-link--custom';
            a.style.setProperty('--custom-color', color);
            if (legacyCompatMode) {
                a.style.color = color;
            }

            var label = document.createElement('span');
            label.className = 'link-label';
            label.textContent = link.name;

            if (!legacyCompatMode && link.icon) {
                var icon = document.createElement('i');
                icon.className = link.icon;
                icon.setAttribute('aria-hidden', 'true');
                a.appendChild(icon);
            }

            a.appendChild(label);
            socialContainer.appendChild(a);
        });

        App.logger.log('[配置] 已生成 ' + links.length + ' 个社交链接');
    }

    function applyProfileConfig() {
        var config = App.config.profile;

        var nameEl = document.querySelector('.name');
        if (nameEl && config.name) {
            nameEl.textContent = config.name;
        }

        var statusTextEl = document.querySelector('.status-text');
        if (statusTextEl && config.status) {
            statusTextEl.textContent = config.status;
        }

        var avatarImg = document.querySelector('.avatar-image');
        var avatarBox = document.getElementById('avatarBox');
        if (config.avatar) {
            if (avatarImg) avatarImg.src = config.avatar;
            if (avatarBox && !('objectFit' in document.documentElement.style)) {
                avatarBox.style.backgroundImage = 'url(' + config.avatar + ')';
            }
        }

        var footerTextEl = document.getElementById('footerText');
        if (footerTextEl && App.config.footer) {
            var text = App.config.footer.text || 'BUILT WITH PASSION';
            var year = new Date().getFullYear();
            footerTextEl.textContent = text + ' \u2022 ' + year;
        }

        App.logger.log('[配置] 个人信息已应用');
    }

    function detectObjectFit() {
        if (!('objectFit' in document.documentElement.style)) {
            document.documentElement.className += ' no-object-fit';
        }
    }

    detectObjectFit();

    window.App = window.App || {};
    window.App.social = { initLinks: initSocialLinks, applyProfile: applyProfileConfig };
})();
