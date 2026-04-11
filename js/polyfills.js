(function () {
    'use strict';

    if (typeof window.Promise === 'undefined') {
        var PENDING = 0;
        var FULFILLED = 1;
        var REJECTED = 2;

        function Promise(executor) {
            this._state = PENDING;
            this._value = undefined;
            this._handlers = [];

            var self = this;
            function resolve(value) {
                if (self._state !== PENDING) return;
                if (
                    value &&
                    (typeof value === 'object' || typeof value === 'function') &&
                    typeof value.then === 'function'
                ) {
                    value.then(resolve, reject);
                    return;
                }
                self._state = FULFILLED;
                self._value = value;
                drain(self);
            }

            function reject(reason) {
                if (self._state !== PENDING) return;
                self._state = REJECTED;
                self._value = reason;
                drain(self);
            }

            try {
                executor(resolve, reject);
            } catch (e) {
                reject(e);
            }
        }

        Promise.prototype.then = function (onFulfilled, onRejected) {
            var child = new Promise(function () {});
            this._handlers.push({
                onFulfilled: typeof onFulfilled === 'function' ? onFulfilled : null,
                onRejected: typeof onRejected === 'function' ? onRejected : null,
                child: child
            });
            drain(this);
            return child;
        };

        Promise.prototype['catch'] = function (onRejected) {
            return this.then(null, onRejected);
        };

        Promise.resolve = function (value) {
            return new Promise(function (resolve) {
                resolve(value);
            });
        };

        Promise.reject = function (reason) {
            return new Promise(function (_, reject) {
                reject(reason);
            });
        };

        Promise.all = function (iterable) {
            return new Promise(function (resolve, reject) {
                var items = Array.prototype.slice.call(iterable);
                var remaining = items.length;
                if (remaining === 0) {
                    resolve([]);
                    return;
                }
                var results = new Array(remaining);
                for (var i = 0; i < items.length; i++) {
                    (function (index) {
                        Promise.resolve(items[index]).then(function (value) {
                            results[index] = value;
                            remaining--;
                            if (remaining === 0) {
                                resolve(results);
                            }
                        }, reject);
                    })(i);
                }
            });
        };

        function drain(promise) {
            if (promise._state === PENDING) return;
            var handlers = promise._handlers.slice();
            promise._handlers = [];
            for (var i = 0; i < handlers.length; i++) {
                handle(promise, handlers[i]);
            }
        }

        function handle(promise, handler) {
            var cb = promise._state === FULFILLED ? handler.onFulfilled : handler.onRejected;
            if (cb === null) {
                if (promise._state === FULFILLED) {
                    fulfill(handler.child, promise._value);
                } else {
                    rejectPromise(handler.child, promise._value);
                }
                return;
            }
            try {
                var result = cb(promise._value);
                fulfill(handler.child, result);
            } catch (e) {
                rejectPromise(handler.child, e);
            }
        }

        function fulfill(promise, value) {
            if (
                value &&
                (typeof value === 'object' || typeof value === 'function') &&
                typeof value.then === 'function'
            ) {
                value.then(
                    function (v) {
                        fulfill(promise, v);
                    },
                    function (r) {
                        rejectPromise(promise, r);
                    }
                );
                return;
            }
            promise._state = FULFILLED;
            promise._value = value;
            drain(promise);
        }

        function rejectPromise(promise, reason) {
            promise._state = REJECTED;
            promise._value = reason;
            drain(promise);
        }

        window.Promise = Promise;
    }

    if (typeof String.prototype.padStart === 'undefined') {
        String.prototype.padStart = function padStart(targetLength, padString) {
            var str = String(this);
            if (padString === undefined) {
                padString = ' ';
            }
            var pad = String(padString);
            if (targetLength <= str.length) {
                return str;
            }
            var needed = targetLength - str.length;
            var repeated = '';
            while (repeated.length < needed) {
                repeated += pad;
            }
            return repeated.slice(0, needed) + str;
        };
    }

    if (typeof String.prototype.startsWith === 'undefined') {
        String.prototype.startsWith = function startsWith(searchString, position) {
            var str = String(this);
            var search = String(searchString);
            var pos = position ? Number(position) : 0;
            if (isNaN(pos)) {
                pos = 0;
            }
            if (pos < 0) {
                pos = 0;
            }
            return str.substr(pos, search.length) === search;
        };
    }

    if (typeof NodeList.prototype.forEach === 'undefined') {
        NodeList.prototype.forEach = Array.prototype.forEach;
    }
})();
