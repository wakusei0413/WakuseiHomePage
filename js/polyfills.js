/**
 * 旧版浏览器最小 Polyfills
 * 仅补齐当前站点初始化路径会用到的基础 API。
 */
(function () {
    'use strict';

    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = function (callback) {
            return window.setTimeout(function () {
                callback(new Date().getTime());
            }, 16);
        };
    }

    if (!window.cancelAnimationFrame) {
        window.cancelAnimationFrame = function (id) {
            window.clearTimeout(id);
        };
    }

    if (window.NodeList && !NodeList.prototype.forEach) {
        NodeList.prototype.forEach = function (callback, thisArg) {
            var i;
            for (i = 0; i < this.length; i++) {
                callback.call(thisArg, this[i], i, this);
            }
        };
    }

    if (!String.prototype.padStart) {
        String.prototype.padStart = function (targetLength, padString) {
            var result = String(this);
            var fill = typeof padString === 'undefined' ? ' ' : String(padString || ' ');

            targetLength = targetLength >> 0;

            if (result.length >= targetLength) {
                return result;
            }

            while (fill.length < targetLength - result.length) {
                fill += fill;
            }

            return fill.slice(0, targetLength - result.length) + result;
        };
    }

    if (window.Element && !Element.prototype.matches) {
        Element.prototype.matches =
            Element.prototype.msMatchesSelector ||
            Element.prototype.webkitMatchesSelector ||
            function (selector) {
                var node = this;
                var nodes = (node.document || node.ownerDocument).querySelectorAll(selector);
                var i = 0;

                while (nodes[i] && nodes[i] !== node) {
                    i++;
                }

                return !!nodes[i];
            };
    }

    if (window.Element && !Element.prototype.closest) {
        Element.prototype.closest = function (selector) {
            var node = this;

            while (node && node.nodeType === 1) {
                if (node.matches(selector)) {
                    return node;
                }

                node = node.parentElement || node.parentNode;
            }

            return null;
        };
    }
})();
