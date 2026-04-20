/**
 * 打字机效果模块
 * 功能：循环展示 Slogan，支持随机/顺序模式
 */
(function () {
    'use strict';

    var pendingTimers = [];

    function initTypewriter() {
        var textEl = document.getElementById('typewriterText');
        var cursor = document.getElementById('cursor');
        var container = document.getElementById('bioContainer');

        if (!textEl) return;

        var slogans = App.config.slogans.list;
        var typeSpeed = App.config.slogans.typeSpeed || 60;
        var pauseDuration = App.config.slogans.pauseDuration || 5000;
        var loop = App.config.slogans.loop !== false;
        var mode = App.config.slogans.mode || 'random';

        var currentIndex = -1;

        if (container) container.style.minHeight = '100px';

        if (cursor && App.config.animation) {
            if (App.config.animation.cursorStyle === 'line') {
                cursor.textContent = '|';
            }
        }

        function getNextSlogan() {
            if (mode === 'random') {
                var newIndex;
                do {
                    newIndex = Math.floor(Math.random() * slogans.length);
                } while (newIndex === currentIndex && slogans.length > 1);
                currentIndex = newIndex;
            } else {
                currentIndex = (currentIndex + 1) % slogans.length;
            }
            return slogans[currentIndex];
        }

        function typeText(text, callback) {
            textEl.textContent = '';
            var i = 0;
            function type() {
                if (i < text.length) {
                    textEl.textContent += text.charAt(i);
                    i++;
                    pendingTimers.push(setTimeout(type, typeSpeed));
                } else {
                    if (callback) callback();
                }
            }
            type();
        }

        function clearText(callback) {
            var currentText = textEl.textContent;
            var i = currentText.length;
            function clear() {
                if (i > 0) {
                    textEl.textContent = currentText.substring(0, i - 1);
                    i--;
                    pendingTimers.push(setTimeout(clear, 20));
                } else {
                    if (callback) callback();
                }
            }
            clear();
        }

        function runTypewriter() {
            var slogan = getNextSlogan();
            App.logger.log(
                '[Slogan ' + (currentIndex + 1) + '/' + slogans.length + ']:',
                slogan.substring(0, 30) + '...'
            );

            typeText(slogan, function () {
                if (loop) {
                    pendingTimers.push(
                        setTimeout(function () {
                            clearText(function () {
                                pendingTimers.push(setTimeout(runTypewriter, 300));
                            });
                        }, pauseDuration)
                    );
                } else {
                    if (cursor) {
                        cursor.style.animation = 'blink 1.5s step-end infinite';
                        cursor.style.opacity = '0.5';
                    }
                }
            });
        }

        pendingTimers.push(setTimeout(runTypewriter, typeSpeed * 5));
    }

    function destroyTypewriter() {
        for (var i = 0; i < pendingTimers.length; i++) {
            clearTimeout(pendingTimers[i]);
        }
        pendingTimers = [];
    }

    window.App = window.App || {};
    window.App.typewriter = { init: initTypewriter, destroy: destroyTypewriter };
})();
