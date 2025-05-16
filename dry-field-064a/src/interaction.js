import { REVERT_DELAY } from './config/constants.js';
import { applyOutwardForce } from './utils/physics.js';
import { updateMousePosition } from './state/state.js';
import EventManager from './event/EventManager.js';

/**
 * Purpose: Handles mouse and user interactions with the chart canvas.
 * Boundaries: Only manages event listeners and interaction logic. No direct state mutation outside of event handling.
 */

/**
 * Calculate mouse position relative to canvas, accounting for scaling
 * @param {MouseEvent} event - The mouse event
 * @param {HTMLCanvasElement} canvas - The canvas element
 * @returns {{x: number, y: number}} The calculated mouse position
 */
function calculateMousePosition(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // Calculate position accounting for canvas scaling
    const x = (event.clientX - rect.left) * (canvas.width / (rect.width * dpr));
    const y = (event.clientY - rect.top) * (canvas.height / (rect.height * dpr));
    
    return { x, y };
}

/**
 * Handle cluster interactions based on mouse position
 * @param {Array} clusters - Array of bubble clusters
 * @param {{x: number, y: number}} mousePos - Current mouse position
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 */
function handleClusterInteractions(clusters, mousePos, width, height) {
    for (const cluster of clusters) {
        let hovering = false;
        for (const b of cluster.bubbles) {
            const dx = mousePos.x - b.x;
            const dy = mousePos.y - b.y;
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
                applyOutwardForce(cluster, width, height);
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
}

/**
 * Setup mouse interaction handling for the canvas
 * @param {HTMLCanvasElement} canvas - The canvas element
 * @param {Array} clusters - Array of bubble clusters
 * @param {HTMLElement} tooltip - The tooltip element
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @returns {EventManager} The event manager instance
 */
function setupMouseInteraction(canvas, clusters, tooltip, width, height) {
    const eventManager = new EventManager(canvas);
    
    // Handle mouseout
    eventManager.on('mouseout', () => {
        tooltip.style.visibility = 'hidden';
    });

    // Handle mousemove
    eventManager.on('mousemove', (e) => {
        const mousePos = calculateMousePosition(e, canvas);
        updateMousePosition(mousePos.x, mousePos.y);
        handleClusterInteractions(clusters, mousePos, width, height);
    });

    return eventManager;
}

export { setupMouseInteraction, calculateMousePosition, handleClusterInteractions }; 