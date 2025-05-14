/**
 * Calculates the overlap between two bubbles.
 * @param {Object} b1
 * @param {Object} b2
 * @returns {number}
 */
function getBubbleOverlap(b1, b2) {
    const dx = b1.x - b2.x;
    const dy = b1.y - b2.y;
    const dist = Math.hypot(dx, dy);
    const overlap = (b1.r + b2.r) - dist;
    return overlap;
}

export { getBubbleOverlap }; 