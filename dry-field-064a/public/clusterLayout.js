/**
 * ClusterLayout Module - Handles D3-based circle packing for expanding clusters
 */

/**
 * Pack a cluster's bubbles using d3.packSiblings algorithm
 * 
 * @param {Object} cluster - The cluster object containing bubbles
 * @param {number} CHART_PADDING_X - Chart padding on the X axis
 * @param {number} WIDTH - Chart width
 * @param {number} CHART_PADDING_TOP - Chart padding on the top
 * @param {number} CHART_HEIGHT - Chart height
 */
function packClusterBubbles(cluster, CHART_PADDING_X, WIDTH, CHART_PADDING_TOP, CHART_HEIGHT) {
    // d3.packSiblings expects an array of objects with x, y, r
    // We'll use the current radii, and pack around (0,0)
    const packed = cluster.bubbles.map(b => ({...b, x: 0, y: 0, r: b.r}));
    d3.packSiblings(packed);
    
    // Compute centroid of the cluster's current positions
    let sumX = 0, sumY = 0;
    for (const b of cluster.bubbles) {
        sumX += b.x;
        sumY += b.y;
    }
    const centroidX = sumX / cluster.bubbles.length;
    const centroidY = sumY / cluster.bubbles.length;
    
    // Compute bounding box of packed cluster
    const minX = Math.min(...packed.map(b => b.x - b.r));
    const maxX = Math.max(...packed.map(b => b.x + b.r));
    const minY = Math.min(...packed.map(b => b.y - b.r));
    const maxY = Math.max(...packed.map(b => b.y + b.r));
    const packedCenterX = (minX + maxX) / 2;
    const packedCenterY = (minY + maxY) / 2;
    
    // Offset packed positions to center at the cluster's centroid
    for (let i = 0; i < cluster.bubbles.length; i++) {
        cluster.bubbles[i].packedX = centroidX + (packed[i].x - packedCenterX);
        cluster.bubbles[i].packedY = centroidY + (packed[i].y - packedCenterY);
    }
    
    // --- Post-packing boundary correction (no scaling) ---
    // Calculate min/max after centering
    let shiftX = 0, shiftY = 0;
    const leftBound = CHART_PADDING_X;
    const rightBound = WIDTH - CHART_PADDING_X;
    const topBound = CHART_PADDING_TOP;
    const bottomBound = CHART_HEIGHT;
    
    // Find how much we need to shift to keep all bubbles inside bounds
    let minBubbleX = Infinity, maxBubbleX = -Infinity, minBubbleY = Infinity, maxBubbleY = -Infinity;
    for (const b of cluster.bubbles) {
        minBubbleX = Math.min(minBubbleX, b.packedX - b.r);
        maxBubbleX = Math.max(maxBubbleX, b.packedX + b.r);
        minBubbleY = Math.min(minBubbleY, b.packedY - b.r);
        maxBubbleY = Math.max(maxBubbleY, b.packedY + b.r);
    }
    
    if (minBubbleX < leftBound) shiftX = leftBound - minBubbleX;
    if (maxBubbleX > rightBound) shiftX = rightBound - maxBubbleX;
    if (minBubbleY < topBound) shiftY = topBound - minBubbleY;
    if (maxBubbleY > bottomBound) shiftY = bottomBound - maxBubbleY;
    
    // Apply the shift to all packed bubbles
    for (const b of cluster.bubbles) {
        b.packedX += shiftX;
        b.packedY += shiftY;
    }
}

/**
 * Animate bubbles to their packed positions with smooth transitions
 * 
 * @param {Object} cluster - The cluster object containing bubbles
 * @param {number} t - Animation speed factor (0-1)
 */
function animateClusterToPacked(cluster, t) {
    for (const b of cluster.bubbles) {
        b.x += (b.packedX - b.x) * t;
        b.y += (b.packedY - b.y) * t;
    }
}

/**
 * Updates cluster animation in the animation loop
 * 
 * @param {Object} cluster - The cluster to update
 * @param {number} CHART_PADDING_X - Chart padding on the X axis
 * @param {number} WIDTH - Chart width
 * @param {number} CHART_PADDING_TOP - Chart padding on the top
 * @param {number} CHART_HEIGHT - Chart height
 * @param {number} MAX_FRAMES - Maximum frames for animation
 * @param {Function} revertClusterSmoothly - Function to revert cluster
 * @returns {boolean} - Whether the cluster state was updated
 */
function updateClusterAnimation(cluster, CHART_PADDING_X, WIDTH, CHART_PADDING_TOP, CHART_HEIGHT, MAX_FRAMES, revertClusterSmoothly) {
    let updated = false;
    
    if (cluster.state === "expanding") {
        // On first frame, compute packed positions
        if (!cluster.packedInitialized) {
            packClusterBubbles(cluster, CHART_PADDING_X, WIDTH, CHART_PADDING_TOP, CHART_HEIGHT);
            cluster.packedInitialized = true;
            updated = true;
        }
        
        // Animate bubbles to packed positions
        animateClusterToPacked(cluster, 0.18); // t controls animation speed
        cluster.frameCount++;
        updated = true;
        
        if (cluster.frameCount >= MAX_FRAMES) {
            cluster.state = "expanded";
            for (const b of cluster.bubbles) {
                b.showTooltip = true;
            }
        }
    } else if (cluster.state === "reverting") {
        revertClusterSmoothly(cluster, WIDTH, HEIGHT);
        cluster.packedInitialized = false;
        updated = true;
    }
    
    return updated;
}

export { packClusterBubbles, animateClusterToPacked, updateClusterAnimation };
