/**
 * Purpose: Provides rendering utilities for bubbles and clusters.
 * Boundaries: Only handles canvas drawing operations. No state mutations.
 */

/**
 * Render a single bubble
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} bubble - Bubble object
 * @param {boolean} showImage - Whether to show bubble image
 */
function renderBubble(ctx, bubble, showImage = false) {
    // Draw bubble circle
    ctx.beginPath();
    ctx.arc(bubble.x, bubble.y, bubble.r, 0, Math.PI * 2);
    ctx.fillStyle = bubble.color || '#666';
    ctx.fill();
    
    // Draw border
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw image if available and enabled
    if (showImage && bubble.image) {
        const img = new Image();
        img.src = bubble.image;
        img.onload = () => {
            const size = bubble.r * 1.5;
            ctx.drawImage(img, bubble.x - size/2, bubble.y - size/2, size, size);
        };
    }
}

/**
 * Render a group of bubbles
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} bubbles - Array of bubble objects
 * @param {boolean} showImage - Whether to show bubble images
 */
function renderBubbles(ctx, bubbles, showImage = false) {
    bubbles.forEach(bubble => renderBubble(ctx, bubble, showImage));
}

/**
 * Draw axes on the canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {number} chartHeight - Chart area height
 * @param {number} chartPaddingX - Horizontal padding
 * @param {number} chartPaddingTop - Top padding
 * @param {Array} bubbles - Array of bubble objects
 * @param {Date} minDate - Minimum date
 * @param {Date} maxDate - Maximum date
 */
function drawAxes(ctx, width, height, chartHeight, chartPaddingX, chartPaddingTop, bubbles, minDate, maxDate) {
    if (!bubbles.length || !minDate || !maxDate) return;
    
    // Draw x-axis
    ctx.beginPath();
    ctx.moveTo(chartPaddingX, height - chartPaddingTop);
    ctx.lineTo(width - chartPaddingX, height - chartPaddingTop);
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Draw y-axis
    ctx.beginPath();
    ctx.moveTo(chartPaddingX, chartPaddingTop);
    ctx.lineTo(chartPaddingX, height - chartPaddingTop);
    ctx.stroke();
    
    // Draw date ticks
    const dateRange = maxDate - minDate;
    const tickCount = 5;
    const tickSpacing = (width - 2 * chartPaddingX) / (tickCount - 1);
    
    for (let i = 0; i < tickCount; i++) {
        const x = chartPaddingX + i * tickSpacing;
        const date = new Date(minDate.getTime() + (dateRange * i / (tickCount - 1)));
        
        // Draw tick line
        ctx.beginPath();
        ctx.moveTo(x, height - chartPaddingTop);
        ctx.lineTo(x, height - chartPaddingTop + 5);
        ctx.stroke();
        
        // Draw date label
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(date.toLocaleDateString(), x, height - chartPaddingTop + 8);
    }
}

export { renderBubble, renderBubbles, drawAxes }; 