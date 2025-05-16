/**
 * Purpose: Provides reusable UI components and tooltip logic for the chart.
 * Boundaries: Only handles DOM manipulation and UI rendering. No direct state mutation or data fetching.
 */

/**
 * Update the tooltip display when hovering over bubbles
 * @param {HTMLElement} tooltip - The tooltip HTML element
 * @param {number} mouseX - Current mouse X position
 * @param {number} mouseY - Current mouse Y position
 * @param {Array} singleBubbles - Array of single (non-clustered) bubbles
 * @param {Array} clusters - Array of bubble clusters
 * @param {HTMLCanvasElement} canvas - The canvas element
 * @param {Array} allBubbles - All bubble objects
 */
function updateTooltip(tooltip, mouseX, mouseY, singleBubbles, clusters, canvas, allBubbles) {
    let closest = null;
    let closestDist = Infinity;

    for (const b of singleBubbles) {
        const dx = mouseX - b.x;
        const dy = mouseY - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist < b.r && dist < closestDist && b.showTooltip) {
            closest = b;
            closestDist = dist;
        }
    }
    for (const cluster of clusters) {
        for (const b of cluster.bubbles) {
            const dx = mouseX - b.x;
            const dy = mouseY - b.y;
            const dist = Math.hypot(dx, dy);
            if (dist < b.r && dist < closestDist && b.showTooltip) {
                closest = b;
                closestDist = dist;
            }
        }
    }
    if (closest) {
        // Format expiry (date and time)
        let expiry = '';
        let expiryTime = '';
        if (closest.dueTime) {
            const d = new Date(closest.dueTime);
            expiry = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            expiryTime = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }
        // Format repayment
        const repayment = closest.repayment ? closest.repayment.toLocaleString() : '';
        // --- Calculate Total Due (robust cumulative USD from soonest to hovered loan by due date) ---
        // Only sum over bubbles for the current wallet (allBubbles)
        const valid = allBubbles.filter(b =>
            b.dueTime && !isNaN(new Date(b.dueTime).getTime()) &&
            Number.isFinite(b.repayment) &&
            b.loanId // or another unique identifier
        );
        // Sort by due date ascending, then by loanId (string compare for stability)
        valid.sort((a, b) => {
            const dateDiff = new Date(a.dueTime) - new Date(b.dueTime);
            if (dateDiff !== 0) return dateDiff;
            return String(a.loanId).localeCompare(String(b.loanId));
        });
        // Find hovered loan's index (by loanId)
        const hoveredIndex = valid.findIndex(b => b.loanId === closest.loanId);
        let totalDue = 0;
        if (hoveredIndex !== -1) {
            for (let i = 0; i <= hoveredIndex; i++) {
                totalDue += valid[i].repayment;
            }
        } else {
            totalDue = Number.isFinite(closest.repayment) ? closest.repayment : 0; // fallback
        }
        // Build HTML
        tooltip.innerHTML = `
            <div class="tooltip-header">
                <img class="tooltip-img" src="${closest.imageUrl}" alt="NFT" />
                <div class="tooltip-title">${closest.name || 'NFT Loan'}</div>
            </div>
            <div class="tooltip-row">
                <span class="tooltip-label">Protocol</span>
                <span class="tooltip-value">${closest.protocol || 'Unknown'}</span>
            </div>
            <div class="tooltip-row">
                <span class="tooltip-label">APR</span>
                <span class="tooltip-value">${closest.apr ? closest.apr.toFixed(2) : '--'}%${closest.isAprOutlier ? ' (outlier)' : ''}</span>
            </div>
            <div class="tooltip-row">
                <span class="tooltip-label">Repayment</span>
                <span class="tooltip-value">${repayment} <span class="tooltip-value usdc">USDC</span>${closest.isUsdOutlier ? ' (outlier)' : ''}</span>
            </div>
            <div class="tooltip-row">
                <span class="tooltip-label">Repayment Date</span>
                <span class="tooltip-value">${expiry} ${expiryTime}</span>
            </div>
            <div class="tooltip-row">
                <span class="tooltip-label">Total Due</span>
                <span class="tooltip-value">${totalDue.toLocaleString()} <span class="tooltip-value usdc">USDC</span></span>
            </div>
        `;
        tooltip.style.left = (closest.x + canvas.offsetLeft + 20) + "px";
        tooltip.style.top = (closest.y + canvas.offsetTop - 40) + "px";
        tooltip.style.visibility = "visible";
    } else {
        tooltip.style.visibility = "hidden";
    }
}

/**
 * Setup the tooltip element and add necessary styles
 * @param {HTMLElement} tooltipElement - The tooltip HTML element
 */
function initializeTooltip(tooltipElement) {
    // Make sure we have the proper styling for the tooltip
    tooltipElement.style.position = "absolute";
    tooltipElement.style.minWidth = "320px";
    tooltipElement.style.maxWidth = "340px";
    tooltipElement.style.background = "#332C4B";
    tooltipElement.style.color = "#fff";
    tooltipElement.style.borderRadius = "20px";
    tooltipElement.style.boxShadow = "0 4px 24px rgba(0,0,0,0.18)";
    tooltipElement.style.padding = "24px 24px 20px 24px";
    tooltipElement.style.fontFamily = "'Inter', Arial, sans-serif";
    tooltipElement.style.fontSize = "12px";
    tooltipElement.style.pointerEvents = "none";
    tooltipElement.style.visibility = "hidden";
    tooltipElement.style.zIndex = "10";
    tooltipElement.style.display = "flex";
    tooltipElement.style.flexDirection = "column";
    tooltipElement.style.gap = "4px";
    tooltipElement.style.border = "none";
    tooltipElement.style.transition = "opacity 0.2s";
}

/**
 * Setup CSS styles for tooltips by adding a style tag to the document head
 */
function setupTooltipStyles() {
    // Create a style element if it doesn't exist
    let styleElement = document.getElementById('tooltip-styles');
    if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = 'tooltip-styles';
        document.head.appendChild(styleElement);
    }

    // Add tooltip-specific CSS
    styleElement.textContent = `
        #tooltip {
            position: absolute;
            min-width: 320px;
            max-width: 340px;
            background: #332C4B;
            color: #fff;
            border-radius: 20px;
            box-shadow: 0 4px 24px rgba(0,0,0,0.18);
            padding: 24px 24px 20px 24px;
            font-family: 'Inter', Arial, sans-serif;
            font-size: 12px;
            pointer-events: none;
            visibility: hidden;
            z-index: 10;
            display: flex;
            flex-direction: column;
            gap: 4px;
            border: none;
            transition: opacity 0.2s;
        }
        #tooltip .tooltip-header {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 8px;
        }
        #tooltip .tooltip-img {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: #3ED6B7;
            object-fit: cover;
            border: 4px solid #221E37;
        }
        #tooltip .tooltip-title {
            font-size: 22px;
            font-weight: 600;
            color: #fff;
            margin: 0;
            line-height: 1.2;
        }
        #tooltip .tooltip-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin: 0 0 2px 0;
        }
        #tooltip .tooltip-label {
            color: hsl(0, 0%, 68%);
            font-size: 14px;
            font-weight: 500;
        }
        #tooltip .tooltip-value {
            color: #fff;
            font-size: 14px;
            font-weight: 700;
            letter-spacing: 0.04em;
        }
        #tooltip .tooltip-value.usdc {
            font-size: 18px;
            font-weight: 700;
            color: #fff;
            margin-left: 4px;
        }
    `;
}

export { updateTooltip, initializeTooltip, setupTooltipStyles };
