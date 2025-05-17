/**
 * @fileoverview Pure utility functions for bubble clustering and data processing.
 * 
 * Module Boundaries:
 * - This module contains pure functions for data processing
 * - All functions should be side-effect free
 * - No state mutations or UI updates
 * - No direct data fetching
 * 
 * Allowed Dependencies:
 * - /utils/* - For pure utility functions
 * 
 * Forbidden:
 * - Direct state mutations
 * - Direct DOM manipulation
 * - Window assignments
 * - Global variables
 * - Data fetching
 * - UI updates
 */

import { bubblesOverlap } from './bubbleUtils.js';

/**
 * Purpose: Provides functions for transforming and clustering blockchain loan data for visualization.
 * Boundaries: Only transforms data. No state mutation or DOM manipulation.
 */

/**
 * Calculates the overlap between two bubbles.
 * @param {Object} b1
 * @param {Object} b2
 * @returns {number}
 */
// (bubblesOverlap is already in bubbleUtils.js, so we will not duplicate it here)

/**
 * Gets the value at the specified percentile in the array.
 * @param {Array} arr - Array of numbers
 * @param {number} p - Percentile (0-100)
 * @returns {number}
 */
function getPercentile(arr, p) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.floor((p / 100) * (sorted.length - 1));
    return sorted[idx];
}

/**
 * Create a loan bubble from API data.
 * @param {Object} loan
 * @param {number} minAPR
 * @param {number} maxAPR
 * @param {number} minDue
 * @param {number} maxDue
 * @param {number} minUSD
 * @param {number} maxUSD
 * @param {number} CHART_PADDING_X
 * @param {number} WIDTH
 * @param {number} CHART_PADDING_TOP
 * @param {number} CHART_HEIGHT
 * @param {number} BUBBLE_PADDING_FACTOR
 * @param {boolean} isAllLoansMode
 * @param {boolean} showImages
 * @param {number} APR_CLIP_TOP
 * @param {number} APR_CLIP_BOTTOM
 * @returns {Object|null}
 */
function createLoanBubbleFromAPI(loan, minAPR, maxAPR, minDue, maxDue, minUSD, maxUSD, CHART_PADDING_X, WIDTH, CHART_PADDING_TOP, CHART_HEIGHT, BUBBLE_PADDING_FACTOR, isAllLoansMode, showImages, APR_CLIP_TOP, APR_CLIP_BOTTOM) {
    // Handle empty or missing optional fields with fallbacks
    const name = loan.nftName && loan.nftName.trim() ? loan.nftName : (loan.nftProjectName && loan.nftProjectName.trim() ? loan.nftProjectName : 'NFT Loan');
    
    // Fix any URL encoding issues in the image URIs
    let imageUrl = '';
    if (loan.nftImageSmallUri && loan.nftImageSmallUri.trim()) {
        imageUrl = loan.nftImageSmallUri.trim();
    } else if (loan.nftImageLargeUri && loan.nftImageLargeUri.trim()) {
        imageUrl = loan.nftImageLargeUri.trim();
    } else if (loan.nftProjectImageUri && loan.nftProjectImageUri.trim()) {
        imageUrl = loan.nftProjectImageUri.trim();
    } else {
        imageUrl = 'https://via.placeholder.com/56x56.png?text=NFT';
    }
    
    // Cleanup URL if needed (remove line breaks, extra spaces)
    imageUrl = imageUrl.replace(/[\r\n\t]/g, '').trim();
    
    // Calculate base position with padding
    let x = CHART_PADDING_X + (WIDTH - 2 * CHART_PADDING_X) * (new Date(loan.dueTime).getTime() - minDue) / ((maxDue - minDue) || 1);
    
    // Y position: robust percentile-based mapping
    let y;
    let isAprOutlier = false;
    if (loan.apr > APR_CLIP_TOP) {
        y = CHART_PADDING_TOP;
        isAprOutlier = true;
    } else if (loan.apr < APR_CLIP_BOTTOM) {
        y = CHART_HEIGHT;
        isAprOutlier = true;
    } else {
        y = CHART_PADDING_TOP + (CHART_HEIGHT - CHART_PADDING_TOP) * (1 - (loan.apr - APR_CLIP_BOTTOM) / ((APR_CLIP_TOP - APR_CLIP_BOTTOM) || 1));
    }
    
    x += (Math.random() - 0.5) * 10;
    y += (Math.random() - 0.5) * 10;
    
    // Set min and max radius based on whether we're viewing all loans or a single wallet
    let minR, maxR;
    if (isAllLoansMode) {
        minR = 4;  // Smaller bubbles for all loans view
        maxR = 16;
    } else {
        minR = 10; // Larger bubbles for single wallet view
        maxR = 40;
    }
    
    // Calculate bubble size based on loan amount, clip for visual only
    const minArea = Math.PI * minR * minR;
    const maxArea = Math.PI * maxR * maxR;
    let clippedUSD = loan.principalAmountUSD;
    if (isAllLoansMode) {
        clippedUSD = Math.max(minUSD, Math.min(maxUSD, loan.principalAmountUSD));
    }
    const valueNorm = ((clippedUSD - minUSD) / ((maxUSD - minUSD) || 1));
    const area = minArea + valueNorm * (maxArea - minArea);
    let r = Math.sqrt(area / Math.PI);
    r = Math.max(minR, Math.min(maxR, r));
    
    // Ensure bubble stays within chart bounds
    const minX = CHART_PADDING_X + r * BUBBLE_PADDING_FACTOR;
    const maxX = WIDTH - CHART_PADDING_X - (r * BUBBLE_PADDING_FACTOR);
    const minY = CHART_PADDING_TOP + r * BUBBLE_PADDING_FACTOR;
    const maxY = CHART_HEIGHT - (r * BUBBLE_PADDING_FACTOR);
    x = Math.max(minX, Math.min(maxX, x));
    y = Math.max(minY, Math.min(maxY, y));
    
    const bubble = {
        x, y, r,
        initialX: x, initialY: y,
        vx: (Math.random() - 0.5) * 0.1,
        vy: (Math.random() - 0.5) * 0.1,
        repayment: loan.maximumRepaymentAmountUSD,
        apr: loan.apr, // Store actual APR
        loanAmount: loan.principalAmountUSD, // Store actual loan amount
        dueTime: loan.dueTime,
        name: name,
        imageUrl: imageUrl,
        showTooltip: true,
        visited: false,
        protocol: loan.protocolName || '',
        loanId: loan.loanId || '',
        img: null,
        // Add outlier flags
        isAprOutlier: isAprOutlier,
        isUsdOutlier: isAllLoansMode && (loan.principalAmountUSD < minUSD || loan.principalAmountUSD > maxUSD)
    };

    // Only create and set image if showImages is true
    if (showImages) {
        try {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => {};
            img.onerror = (e) => {
                if (imageUrl.includes('reservoir.tools')) {
                    const fallbackUrl = `https://nfts.reservoir.tools/token/ethereum/${loan.nftAddress}:${loan.nftId}/image/v1`;
                    img.src = fallbackUrl;
                }
            };
            img.src = imageUrl;
            bubble.img = img;
        } catch (e) {
            console.error('Error creating image for bubble:', e);
        }
    }
    
    return bubble;
}

/**
 * Use loan data to populate bubbles and clusters.
 * @param {Array} loans
 * @param {Array} allBubbles
 * @param {Array} clusters
 * @param {Array} singleBubbles
 * @param {function} clearChart
 * @param {function} findClusters
 * @param {function} createLoanBubbleFromAPI
 * @param {function} setPaddedDates
 * @param {number} MIN_PADDING_PERCENT
 * @param {number} MAX_PADDING_PERCENT
 * @param {number} CHART_PADDING_X
 * @param {number} WIDTH
 * @param {number} CHART_PADDING_TOP
 * @param {number} CHART_HEIGHT
 * @param {number} BUBBLE_PADDING_FACTOR
 * @param {boolean} isAllLoansMode
 * @param {boolean} showImages
 * @returns {Object}
 */
function useLoanDataForBubbles(loans, allBubbles, clusters, singleBubbles, clearChart, findClusters, createLoanBubbleFromAPI, setPaddedDates, MIN_PADDING_PERCENT, MAX_PADDING_PERCENT, CHART_PADDING_X, WIDTH, CHART_PADDING_TOP, CHART_HEIGHT, BUBBLE_PADDING_FACTOR, isAllLoansMode, showImages) {
    try {
        allBubbles.length = 0;
        clusters.length = 0;
        singleBubbles.length = 0;
        document.getElementById('no-data-message').style.display = 'none';

        if (!loans || loans.length === 0) {
            clearChart();
            return { APR_CLIP_TOP: null, APR_CLIP_BOTTOM: null, USD_CLIP_NOTE: '', USD_CLIP_MIN: null, USD_CLIP_MAX: null };
        }

        // Calculate min/max for mapping
        const aprs = loans.map(l => l.apr);
        const usds = loans.map(l => l.principalAmountUSD);
        const minAPR = Math.min(...aprs);
        const maxAPR = Math.max(...aprs);
        const minDue = Math.min(...loans.map(l => new Date(l.dueTime).getTime()));
        const maxDue = Math.max(...loans.map(l => new Date(l.dueTime).getTime()));
        const minUSD = Math.min(...usds);
        const maxUSD = Math.max(...usds);

        // Calculate dynamic padding based on data range
        const aprRange = maxAPR - minAPR;
        const dueRange = maxDue - minDue;
        const aprPadding = Math.min(Math.max(aprRange * MIN_PADDING_PERCENT, aprRange * MAX_PADDING_PERCENT), aprRange * MAX_PADDING_PERCENT);
        const duePadding = Math.min(Math.max(dueRange * MIN_PADDING_PERCENT, dueRange * MAX_PADDING_PERCENT), dueRange * MAX_PADDING_PERCENT);
        const paddedMinAPR = minAPR - aprPadding;
        const paddedMaxAPR = maxAPR + aprPadding;
        const paddedMinDue = minDue - duePadding;
        const paddedMaxDue = maxDue + duePadding;
        setPaddedDates(paddedMinDue, paddedMaxDue);

        // Calculate clipping values
        const APR_CLIP_TOP = getPercentile(aprs, 98);
        const APR_CLIP_BOTTOM = getPercentile(aprs, 2);
        let minUSDClip, maxUSDClip, sizeClipNote = '';
        
        if (isAllLoansMode) {
            minUSDClip = getPercentile(usds, 2);
            maxUSDClip = getPercentile(usds, 98);
            sizeClipNote = "Bubble sizes in 'All loans' view are clipped to the 2nd–98th percentile for readability.";
        } else {
            minUSDClip = minUSD;
            maxUSDClip = maxUSD;
            sizeClipNote = '';
        }

        // Process all loans
        for (const loan of loans) {
            const bubble = createLoanBubbleFromAPI(
                loan, paddedMinAPR, paddedMaxAPR, paddedMinDue, paddedMaxDue, 
                minUSDClip, maxUSDClip, CHART_PADDING_X, WIDTH, CHART_PADDING_TOP, 
                CHART_HEIGHT, BUBBLE_PADDING_FACTOR, isAllLoansMode, showImages, APR_CLIP_TOP, APR_CLIP_BOTTOM
            );
            if (bubble) {
                allBubbles.push(bubble);
            }
        }

        findClusters(allBubbles);
        return { 
            APR_CLIP_TOP, 
            APR_CLIP_BOTTOM, 
            USD_CLIP_NOTE: sizeClipNote, 
            USD_CLIP_MIN: minUSDClip, 
            USD_CLIP_MAX: maxUSDClip 
        };
    } catch (err) {
        clearChart();
        console.error('[useLoanDataForBubbles] Error processing loan data:', err);
        return { APR_CLIP_TOP: null, APR_CLIP_BOTTOM: null, USD_CLIP_NOTE: '', USD_CLIP_MIN: null, USD_CLIP_MAX: null };
    }
}

/**
 * Find clusters of overlapping bubbles.
 * @param {Array} bubbles
 * @param {Array} clusters
 * @param {Array} singleBubbles
 * @param {function} bubblesOverlap
 * @param {number} VELOCITY_POWER
 * @param {number} BASE_VELOCITY
 */
function findClusters(bubbles, clusters, singleBubbles, bubblesOverlap, VELOCITY_POWER, BASE_VELOCITY) {
    const visited = new Set();
    const clusterMap = new Map();
    for (const b of bubbles) {
        if (visited.has(b)) continue;
        const cluster = [];
        const queue = [b];
        visited.add(b);
        while (queue.length > 0) {
            const current = queue.pop();
            cluster.push(current);
            for (const other of bubbles) {
                if (!visited.has(other) && bubblesOverlap(current, other)) {
                    visited.add(other);
                    queue.push(other);
                }
            }
        }
        const clusterSize = cluster.length;
        for (const bubble of cluster) {
            clusterMap.set(bubble, clusterSize);
        }
        if (clusterSize > 1) {
            clusters.push({ 
                bubbles: cluster, 
                state: "idle", 
                hovering: false, 
                revertTimer: null, 
                frameCount: 0,
                size: clusterSize
            });
        } else {
            singleBubbles.push(cluster[0]);
        }
    }
    // Second pass: update initial velocities based on cluster size
    for (const b of bubbles) {
        const clusterSize = clusterMap.get(b) || 1;
        const velocityScale = Math.pow(clusterSize, VELOCITY_POWER);
        const angle = Math.random() * Math.PI * 2;
        b.vx = Math.cos(angle) * BASE_VELOCITY * velocityScale;
        b.vy = Math.sin(angle) * BASE_VELOCITY * velocityScale;
    }
}

export { createLoanBubbleFromAPI, useLoanDataForBubbles, findClusters, getPercentile }; 