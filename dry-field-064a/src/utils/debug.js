import { getBubbleOverlap } from '../data/bubbleUtils.js';

/**
 * Purpose: Debugging utilities for development and troubleshooting.
 * Boundaries: Pure functions only. No state mutation or DOM manipulation.
 * @param {Array} allBubbles - Array of all bubbles
 */
function logOverlapStats(allBubbles) {
    let totalOverlap = 0;
    let maxOverlap = 0;
    let overlapCount = 0;

    for (let i = 0; i < allBubbles.length; i++) {
        for (let j = i + 1; j < allBubbles.length; j++) {
            const b1 = allBubbles[i];
            const b2 = allBubbles[j];
            const overlap = getBubbleOverlap(b1, b2);
            if (overlap > 0) {
                totalOverlap += overlap;
                maxOverlap = Math.max(maxOverlap, overlap);
                overlapCount++;
            }
        }
    }

    console.log(`Total overlap: ${totalOverlap.toFixed(2)}, Max overlap: ${maxOverlap.toFixed(2)}, Overlapping pairs: ${overlapCount}`);
}

export { logOverlapStats }; 