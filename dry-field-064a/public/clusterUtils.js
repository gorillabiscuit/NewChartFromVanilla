/**
 * Calculates the overlap between two bubbles.
 * @param {Object} b1
 * @param {Object} b2
 * @returns {number}
 */
// (bubblesOverlap is already in bubbleUtils.js, so we will not duplicate it here)

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
 * @returns {Object|null}
 */
function createLoanBubbleFromAPI(loan, minAPR, maxAPR, minDue, maxDue, minUSD, maxUSD, CHART_PADDING_X, WIDTH, CHART_PADDING_TOP, CHART_HEIGHT, BUBBLE_PADDING_FACTOR) {
    // Defensive: skip if required fields are missing or invalid
    if (
        loan.apr == null || isNaN(loan.apr) ||
        !loan.dueTime || isNaN(new Date(loan.dueTime).getTime()) ||
        loan.principalAmountUSD == null || isNaN(loan.principalAmountUSD) ||
        loan.maximumRepaymentAmountUSD == null || isNaN(loan.maximumRepaymentAmountUSD)
    ) {
        console.warn('Skipping invalid loan:', loan);
        return null;
    }
    // Defensive: handle empty or missing optional fields
    const name = loan.nftName && loan.nftName.trim() ? loan.nftName : (loan.nftProjectName && loan.nftProjectName.trim() ? loan.nftProjectName : 'NFT Loan');
    const imageUrl = (loan.nftImageSmallUri && loan.nftImageSmallUri.trim()) ? loan.nftImageSmallUri :
        (loan.nftImageLargeUri && loan.nftImageLargeUri.trim()) ? loan.nftImageLargeUri :
        (loan.nftProjectImageUri && loan.nftProjectImageUri.trim()) ? loan.nftProjectImageUri :
        'https://via.placeholder.com/56x56.png?text=NFT';
    if (!loan.nftName || !loan.nftName.trim()) {
        console.warn('Loan missing nftName, using fallback:', loan);
    }
    if (!loan.nftImageSmallUri && !loan.nftImageLargeUri && !loan.nftProjectImageUri) {
        console.warn('Loan missing all image URIs, using placeholder:', loan);
    }
    // Calculate base position with padding
    let x = CHART_PADDING_X + (WIDTH - 2 * CHART_PADDING_X) * (new Date(loan.dueTime).getTime() - minDue) / ((maxDue - minDue) || 1);
    let y = CHART_PADDING_TOP + (CHART_HEIGHT - CHART_PADDING_TOP) * (1 - (loan.apr - minAPR) / ((maxAPR - minAPR) || 1));
    x += (Math.random() - 0.5) * 10;
    y += (Math.random() - 0.5) * 10;
    const minR = 10;
    const maxR = 40;
    const minArea = Math.PI * minR * minR;
    const maxArea = Math.PI * maxR * maxR;
    const valueNorm = ((loan.principalAmountUSD - minUSD) / ((maxUSD - minUSD) || 1));
    const area = minArea + valueNorm * (maxArea - minArea);
    let r = Math.sqrt(area / Math.PI);
    r = Math.max(minR, Math.min(maxR, r));
    const minX = CHART_PADDING_X + r * BUBBLE_PADDING_FACTOR;
    const maxX = WIDTH - CHART_PADDING_X - (r * BUBBLE_PADDING_FACTOR);
    const minY = CHART_PADDING_TOP + r * BUBBLE_PADDING_FACTOR;
    const maxY = CHART_HEIGHT - (r * BUBBLE_PADDING_FACTOR);
    x = Math.max(minX, Math.min(maxX, x));
    y = Math.max(minY, Math.min(maxY, y));
    return {
        x, y, r,
        initialX: x, initialY: y,
        vx: (Math.random() - 0.5) * 0.1,
        vy: (Math.random() - 0.5) * 0.1,
        repayment: loan.maximumRepaymentAmountUSD,
        apr: loan.apr,
        loanAmount: loan.principalAmountUSD,
        dueTime: loan.dueTime, // Store the due time for date calculations
        name: name,
        imageUrl: imageUrl,
        showTooltip: true,
        visited: false,
        protocol: loan.protocolName || '',
        loanId: loan.loanId || ''
    };
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
 */
function useLoanDataForBubbles(loans, allBubbles, clusters, singleBubbles, clearChart, findClusters, createLoanBubbleFromAPI, setPaddedDates, MIN_PADDING_PERCENT, MAX_PADDING_PERCENT, CHART_PADDING_X, WIDTH, CHART_PADDING_TOP, CHART_HEIGHT, BUBBLE_PADDING_FACTOR) {
    try {
        allBubbles.length = 0;
        clusters.length = 0;
        singleBubbles.length = 0;
        document.getElementById('no-data-message').style.display = 'none';

        if (!loans || loans.length === 0) {
            clearChart();
            console.warn('API response: no loans', loans);
            return;
        }

        // Calculate min/max for mapping
        const minAPR = Math.min(...loans.map(l => l.apr));
        const maxAPR = Math.max(...loans.map(l => l.apr));
        const minDue = Math.min(...loans.map(l => new Date(l.dueTime).getTime()));
        const maxDue = Math.max(...loans.map(l => new Date(l.dueTime).getTime()));
        const minUSD = Math.min(...loans.map(l => l.principalAmountUSD));
        const maxUSD = Math.max(...loans.map(l => l.principalAmountUSD));

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

        let validCount = 0;
        const validLoans = [];
        for (const loan of loans) {
            const bubble = createLoanBubbleFromAPI(
                loan, paddedMinAPR, paddedMaxAPR, paddedMinDue, paddedMaxDue, minUSD, maxUSD,
                CHART_PADDING_X, WIDTH, CHART_PADDING_TOP, CHART_HEIGHT, BUBBLE_PADDING_FACTOR
            );
            if (bubble) {
                allBubbles.push(bubble);
                validLoans.push(loan);
                validCount++;
            }
        }
        if (validCount === 0) {
            clearChart();
            console.warn('API response:', loans);
            console.warn('Filtered valid loans:', validLoans);
            return;
        }
        findClusters(allBubbles);
    } catch (err) {
        clearChart();
        console.error('Error processing loan data:', err);
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
            // Defensive: log single-loan cluster
            console.info('Single-loan cluster detected:', cluster[0]);
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

export { createLoanBubbleFromAPI, useLoanDataForBubbles, findClusters }; 