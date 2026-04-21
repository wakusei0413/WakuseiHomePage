/**
 * Slogan 选择器模块
 * 功能：纯函数，按随机或顺序模式从列表中选取下一条 Slogan
 */

export function createSloganSelector(mode, slogans) {
    let currentIndex = -1;

    function next() {
        if (mode === 'random') {
            let newIndex;
            do {
                newIndex = Math.floor(Math.random() * slogans.length);
            } while (newIndex === currentIndex && slogans.length > 1);
            currentIndex = newIndex;
        } else {
            currentIndex = (currentIndex + 1) % slogans.length;
        }
        return { index: currentIndex, text: slogans[currentIndex] };
    }

    return { next };
}
