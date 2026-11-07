const hero = document.querySelector('#motion-hero');

if (hero) {
    const canvas = document.querySelector('#motion-canvas');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let scene;
    let failed = false;

    function showFallback(error) {
        if (failed) return;
        failed = true;
        hero.dataset.state = 'fallback';
        canvas.removeAttribute('tabindex');
        canvas.setAttribute('aria-hidden', 'true');
        hero.querySelector('.motion-fallback').removeAttribute('aria-hidden');
        try {
            scene?.dispose();
        } catch (disposeError) {
            console.error('Robot scene cleanup:', disposeError);
        }
        console.error('Robot name animation:', error);
    }

    async function initialize() {
        try {
            const { createMotionScene } = await import('./motion-scene.js');
            scene = createMotionScene({ canvas, container: hero, onError: showFallback });
            if (failed) {
                scene.dispose();
                return;
            }
            if (reducedMotion.matches) {
                scene.showName();
                scene.setPlaying(false);
            } else {
                scene.setPlaying(true);
            }
            hero.dataset.state = 'ready';

            reducedMotion.addEventListener('change', event => {
                if (failed) return;
                if (event.matches) {
                    scene.showName();
                    scene.setPlaying(false);
                } else {
                    scene.seek(0);
                    scene.setPlaying(true);
                }
            });
            window.addEventListener('pagehide', event => {
                // Preserve WebGL state when returning via the browser's Back cache.
                if (!event.persisted) scene.dispose();
            });
        } catch (error) {
            showFallback(error);
        }
    }

    initialize();
}
