import { MAX_FRAMES } from './constants.js';
import { packClusterBubbles, animateClusterToPacked } from './clusterLayout.js';
import { revertClusterSmoothly } from './physics.js';
import { draw } from './renderUtils.js';
import { updateTooltip } from './uiComponents.js';
import state from './state.js';

/**
 * Main animation loop that handles cluster animations and rendering
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context
 * @param {HTMLElement} tooltip - The tooltip element
 * @param {HTMLCanvasElement} canvas - The canvas element
 */
function animate(ctx, tooltip, canvas) {
    const { clusters, singleBubbles, allBubbles, showImages, mouseX, mouseY,
            width: WIDTH, height: HEIGHT, chartHeight: CHART_HEIGHT,
            chartPaddingX: CHART_PADDING_X, chartPaddingTop: CHART_PADDING_TOP,
            paddedMinDate: PADDED_MIN_DATE, paddedMaxDate: PADDED_MAX_DATE } = state;

    for (const cluster of clusters) {
        if (cluster.state === "expanding") {
            // On first frame, compute packed positions
            if (!cluster.packedInitialized) {
                packClusterBubbles(cluster, CHART_PADDING_X, WIDTH, CHART_PADDING_TOP, CHART_HEIGHT);
                cluster.packedInitialized = true;
            }
            // Animate bubbles to packed positions
            animateClusterToPacked(cluster, 0.18); // t controls animation speed
            cluster.frameCount++;
            if (cluster.frameCount >= MAX_FRAMES) {
                cluster.state = "expanded";
                for (const b of cluster.bubbles) {
                    b.showTooltip = true;
                }
            }
        } else if (cluster.state === "reverting") {
            revertClusterSmoothly(cluster, WIDTH, HEIGHT);
            cluster.packedInitialized = false;
        }
    }

    // Draw the current state
    draw(
        ctx, WIDTH, HEIGHT, CHART_HEIGHT,
        CHART_PADDING_X, CHART_PADDING_TOP,
        singleBubbles, clusters, showImages,
        PROTOCOL_COLORS, DEFAULT_PROTOCOL_COLOR,
        allBubbles, PADDED_MIN_DATE, PADDED_MAX_DATE
    );

    // Update tooltip
    updateTooltip(tooltip, mouseX, mouseY, singleBubbles, clusters, canvas, allBubbles);

    // Continue animation loop
    requestAnimationFrame(() => animate(ctx, tooltip, canvas));
}

export { animate }; 