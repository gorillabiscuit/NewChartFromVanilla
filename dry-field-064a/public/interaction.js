import { REVERT_DELAY } from './constants.js';
import { applyOutwardForce } from './physics.js';
import { updateMousePosition } from './state.js';

/**
 * Setup mouse interaction handling for the canvas
 * @param {HTMLCanvasElement} canvas - The canvas element
 * @param {Array} clusters - Array of bubble clusters
 */
function setupMouseInteraction(canvas, clusters) {
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Update global mouse position
        updateMousePosition(mouseX, mouseY);

        // Handle cluster interactions
        for (const cluster of clusters) {
            let hovering = false;
            for (const b of cluster.bubbles) {
                const dx = mouseX - b.x;
                const dy = mouseY - b.y;
                const dist = Math.hypot(dx, dy);
                if (dist < b.r) {
                    hovering = true;
                    break;
                }
            }

            if (hovering) {
                cluster.hovering = true;
                if (cluster.state === "idle") {
                    cluster.state = "expanding";
                    applyOutwardForce(cluster);
                    cluster.frameCount = 0;
                }
                if (cluster.revertTimer) {
                    clearTimeout(cluster.revertTimer);
                    cluster.revertTimer = null;
                }
            } else {
                if (cluster.hovering) {
                    cluster.hovering = false;
                    if (!cluster.revertTimer) {
                        cluster.revertTimer = setTimeout(() => {
                            if (!cluster.hovering) {
                                cluster.state = "reverting";
                            }
                        }, REVERT_DELAY);
                    }
                }
            }
        }
    });
}

export { setupMouseInteraction }; 