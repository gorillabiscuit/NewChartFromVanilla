import { REVERT_DELAY } from './config/constants.js';
import { applyOutwardForce } from './utils/physics.js';
import { dispatch, getState } from './state/state.js';
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
    let clusterStatesChanged = false;
    const updatedClusters = clusters.map(cluster => {
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

        const updatedCluster = { ...cluster };
        if (hovering) {
            if (!cluster.hovering) {
                updatedCluster.hovering = true;
                if (cluster.state === "idle") {
                    updatedCluster.state = "expanding";
                    applyOutwardForce(updatedCluster, width, height);
                    updatedCluster.frameCount = 0;
                }
                if (cluster.revertTimer) {
                    clearTimeout(cluster.revertTimer);
                    updatedCluster.revertTimer = null;
                }
                clusterStatesChanged = true;
            }
        } else {
            if (cluster.hovering) {
                updatedCluster.hovering = false;
                if (!cluster.revertTimer) {
                    updatedCluster.revertTimer = setTimeout(() => {
                        if (!updatedCluster.hovering) {
                            dispatch({ 
                                type: 'UPDATE_CLUSTER_STATE', 
                                payload: { 
                                    clusterId: updatedCluster.id, 
                                    state: "reverting" 
                                }
                            });
                        }
                    }, REVERT_DELAY);
                }
                clusterStatesChanged = true;
            }
        }
        return updatedCluster;
    });

    if (clusterStatesChanged) {
        dispatch({ 
            type: 'UPDATE_CLUSTERS', 
            payload: updatedClusters 
        });
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
        dispatch({ 
            type: 'SET_MOUSE_POSITION', 
            payload: { x: -1, y: -1 } 
        });
    });

    // Handle mousemove
    eventManager.on('mousemove', (e) => {
        const mousePos = calculateMousePosition(e, canvas);
        dispatch({ 
            type: 'SET_MOUSE_POSITION', 
            payload: { x: mousePos.x, y: mousePos.y } 
        });
        console.log('Mouse moved:', mousePos);
        // Always use the latest clusters from state
        const latestClusters = getState().clusters;
        console.log('Latest clusters:', latestClusters);
        handleClusterInteractions(latestClusters, mousePos, width, height);
    });

    return eventManager;
}

export { setupMouseInteraction, calculateMousePosition, handleClusterInteractions }; 