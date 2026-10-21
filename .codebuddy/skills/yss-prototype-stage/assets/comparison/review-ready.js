// Readiness is not proof of correct scenario behavior. The browser test checks that separately.
window.addEventListener('load', () => window.parent.postMessage({ type: 'yss-comparison-ready' }, '*'));
