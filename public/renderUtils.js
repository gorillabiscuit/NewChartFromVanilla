import { state } from './state.js';

/**
 * Draw the chart (bubbles, clusters, axes, etc.)
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} WIDTH
 * @param {number} HEIGHT
 * @param {number} CHART_HEIGHT
 * @param {number} CHART_PADDING_X
 * @param {number} CHART_PADDING_TOP
 * @param {Array} singleBubbles
 * @param {Array} clusters
 * @param {Object} PROTOCOL_COLORS
 * @param {string} DEFAULT_PROTOCOL_COLOR
 * @param {Array} allBubbles
 * @param {Date|null} PADDED_MIN_DATE
 * @param {Date|null} PADDED_MAX_DATE
 */
function draw(ctx, WIDTH, HEIGHT, CHART_HEIGHT, CHART_PADDING_X, CHART_PADDING_TOP, singleBubbles, clusters, PROTOCOL_COLORS, DEFAULT_PROTOCOL_COLOR, allBubbles, PADDED_MIN_DATE, PADDED_MAX_DATE) {
    // Visually separate plot and label areas
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    
    // Draw background areas
    ctx.fillStyle = '#221E37';
    ctx.fillRect(0, 0, WIDTH, CHART_PADDING_TOP);
    ctx.fillRect(0, CHART_PADDING_TOP, CHART_PADDING_X, CHART_HEIGHT - CHART_PADDING_TOP);
    ctx.fillRect(0, CHART_HEIGHT, WIDTH, HEIGHT - CHART_HEIGHT);
    ctx.fillRect(CHART_PADDING_X - TICK_LENGTH, CHART_PADDING_TOP, WIDTH - (CHART_PADDING_X - TICK_LENGTH), CHART_HEIGHT - CHART_PADDING_TOP);

    // Draw axes
    drawAxes(ctx, WIDTH, HEIGHT, CHART_HEIGHT, CHART_PADDING_X, CHART_PADDING_TOP, allBubbles, PADDED_MIN_DATE, PADDED_MAX_DATE);

    // Helper function to draw a bubble
    function drawBubble(b) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.closePath();

        const loadingStatus = state.imageLoadingStatus.get(b.id);
        const showImage = state.showImages && b.img && b.img.complete && b.img.naturalWidth > 0;

        if (showImage) {
            // Use clipping path for circular image
            ctx.clip();
            ctx.drawImage(b.img, b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
            
            // Draw border
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 1;
            ctx.stroke();
        } else {
            // Fallback to color fill
            ctx.fillStyle = PROTOCOL_COLORS[b.protocol] || DEFAULT_PROTOCOL_COLOR;
            ctx.globalAlpha = 0.65;
            ctx.fill();
            ctx.globalAlpha = 1.0;
            
            // Draw border
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        ctx.restore();
    }

    // Draw single bubbles
    for (const b of singleBubbles) {
        drawBubble(b);
    }

    // Draw non-expanded clusters
    for (const cluster of clusters) {
        if (cluster.state !== "expanded" && cluster.state !== "expanding") {
            for (const b of cluster.bubbles) {
                drawBubble(b);
                
                // Add dashed outline for clustered bubbles
                ctx.setLineDash([6, 6]);
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.r + 2, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255,255,255,0.75)';
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }
    }

    // Draw expanded clusters on top
    for (const cluster of clusters) {
        if (cluster.state === "expanded" || cluster.state === "expanding") {
            for (const b of cluster.bubbles) {
                drawBubble(b);
                
                // Add dashed outline for expanded bubbles
                ctx.setLineDash([6, 6]);
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.r + 2, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255,255,255,0.75)';
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }
    }
}

// Export the draw function
export { draw }; 