import { MAX_FRAMES } from './config/constants.js';
import { packClusterBubbles, animateClusterToPacked } from './utils/clusterLayout.js';
import { revertClusterSmoothly } from './utils/physics.js';
import { draw } from './utils/renderUtils.js';
import { updateTooltip } from './ui/uiComponents.js';
import { state, subscribe, getState } from './state/state.js';

/**
 * Purpose: Handles the main animation loop and cluster animations for the chart.
 * Boundaries: Coordinates rendering and animation. No direct data fetching or UI event handling.
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context
 * @param {HTMLElement} tooltip - The tooltip element
 * @param {HTMLCanvasElement} canvas - The canvas element
 */
function animate(ctx, tooltip, canvas, clusters, singleBubbles, allBubbles, showImages, WIDTH, HEIGHT, CHART_HEIGHT, CHART_PADDING_X, CHART_PADDING_TOP, PROTOCOL_COLORS, DEFAULT_PROTOCOL_COLOR, PADDED_MIN_DATE, PADDED_MAX_DATE, draw, updateTooltip, packClusterBubbles, animateClusterToPacked, revertClusterSmoothly, MAX_FRAMES) {
    let animationFrameId = null;
    let isAnimating = false;

    // Initial render function - called once when data is loaded
    function initialRender() {
        const latestState = getState();
        if (latestState.status === 'ready') {
            draw(
                ctx,
                latestState.width || WIDTH,
                latestState.height || HEIGHT,
                latestState.chartHeight || CHART_HEIGHT,
                latestState.chartPaddingX || CHART_PADDING_X,
                latestState.chartPaddingTop || CHART_PADDING_TOP,
                latestState.singleBubbles,
                clusters,
                latestState.showImages,
                PROTOCOL_COLORS,
                DEFAULT_PROTOCOL_COLOR,
                latestState.allBubbles,
                latestState.paddedMinDate || PADDED_MIN_DATE,
                latestState.paddedMaxDate || PADDED_MAX_DATE
            );
        }
    }

    function loop() {
        const latestState = getState();
        let needsUpdate = false;

        // Check if any clusters need animation
        for (const cluster of latestState.clusters) {
            if (cluster.state === "expanding" || cluster.state === "reverting") {
                needsUpdate = true;
                break;
            }
        }

        if (needsUpdate) {
            // Update clusters
            for (const cluster of latestState.clusters) {
                if (cluster.state === "expanding") {
                    if (!cluster.packedInitialized) {
                        packClusterBubbles(
                            cluster,
                            latestState.chartPaddingX || CHART_PADDING_X,
                            latestState.width || WIDTH,
                            latestState.chartPaddingTop || CHART_PADDING_TOP,
                            latestState.chartHeight || CHART_HEIGHT
                        );
                        cluster.packedInitialized = true;
                    }
                    animateClusterToPacked(cluster, 0.18);
                    cluster.frameCount++;
                    if (cluster.frameCount >= MAX_FRAMES) {
                        cluster.state = "expanded";
                        for (const b of cluster.bubbles) {
                            b.showTooltip = true;
                        }
                    }
                } else if (cluster.state === "reverting") {
                    revertClusterSmoothly(
                        cluster,
                        latestState.width || WIDTH,
                        latestState.height || HEIGHT
                    );
                    cluster.packedInitialized = false;
                    cluster.frameCount = 0;
                    
                    // Check if reversion is complete
                    const isComplete = cluster.bubbles.every(bubble => {
                        const dx = bubble.x - bubble.originalX;
                        const dy = bubble.y - bubble.originalY;
                        return Math.hypot(dx, dy) < 1; // Consider complete if within 1 pixel
                    });
                    
                    if (isComplete) {
                        cluster.state = "collapsed";
                        for (const b of cluster.bubbles) {
                            b.showTooltip = false;
                        }
                    }
                }
            }

            // Redraw chart with latest state
            draw(
                ctx,
                latestState.width || WIDTH,
                latestState.height || HEIGHT,
                latestState.chartHeight || CHART_HEIGHT,
                latestState.chartPaddingX || CHART_PADDING_X,
                latestState.chartPaddingTop || CHART_PADDING_TOP,
                latestState.singleBubbles,
                clusters,
                latestState.showImages,
                PROTOCOL_COLORS,
                DEFAULT_PROTOCOL_COLOR,
                latestState.allBubbles,
                latestState.paddedMinDate || PADDED_MIN_DATE,
                latestState.paddedMaxDate || PADDED_MAX_DATE
            );
        }

        // Only request next frame if we're still animating
        if (needsUpdate) {
            animationFrameId = requestAnimationFrame(loop);
        } else {
            isAnimating = false;
        }
    }

    // Subscribe to state changes
    subscribe((newState) => {
        // Handle initial render when data is ready
        if (newState.status === 'ready' && !isAnimating) {
            initialRender();
        }

        // Check if we need to start animation
        let shouldAnimate = false;
        for (const cluster of newState.clusters) {
            if (cluster.state === "expanding" || cluster.state === "reverting") {
                shouldAnimate = true;
                break;
            }
        }

        // Start animation if needed and not already running
        if (shouldAnimate && !isAnimating) {
            isAnimating = true;
            animationFrameId = requestAnimationFrame(loop);
        }

        // Update tooltip independently of animation
        updateTooltip(
            tooltip,
            newState.mousePosition.x,
            newState.mousePosition.y,
            newState.singleBubbles,
            clusters,
            canvas,
            newState.allBubbles
        );
    });

    // Return cleanup function
    return () => {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
    };
}

export { animate }; 