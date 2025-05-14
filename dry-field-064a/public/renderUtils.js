/**
 * D3-inspired time scale and tick generator
 * @param {number[]} domain
 * @param {number[]} range
 * @returns {function(number): number}
 */
function timeScale(domain, range) {
    const [d0, d1] = domain;
    const [r0, r1] = range;
    return d => r0 + ((d - d0) / (d1 - d0)) * (r1 - r0);
}

/**
 * Returns an array of Date objects for nice ticks, adapting to the span
 * @param {Date} start
 * @param {Date} stop
 * @param {number} count
 * @returns {{ticks: Date[], format: function(Date): string}}
 */
function niceDateTicks(start, stop, count) {
    const msSecond = 1000;
    const msMinute = 60 * msSecond;
    const msHour = 60 * msMinute;
    const msDay = 24 * msHour;
    const msWeek = 7 * msDay;
    const msMonth = msDay * 30;
    const msYear = msDay * 365;
    const span = stop - start;
    let step, unit, format;
    if (span < msHour * 12) {
        step = Math.ceil(span / msHour / count);
        unit = 'hour';
        format = d => d.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'});
    } else if (span < msDay * 2) {
        step = Math.ceil(span / msHour / count);
        unit = 'hour';
        format = d => d.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'});
    } else if (span < msWeek * 2) {
        step = Math.ceil(span / msDay / count);
        unit = 'day';
        format = d => d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
    } else if (span < msMonth * 2) {
        step = Math.ceil(span / msDay / count * 2);
        unit = 'day';
        format = d => d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
    } else if (span < msYear) {
        step = Math.ceil(span / msMonth / count);
        unit = 'month';
        format = d => d.toLocaleDateString('en-US', {month: 'short', year: '2-digit'});
    } else {
        step = Math.ceil(span / msYear / count);
        unit = 'year';
        format = d => d.getFullYear();
    }
    const ticks = [];
    let d = new Date(start);
    d.setSeconds(0,0);
    d.setMinutes(0);
    d.setHours(0);
    if (unit === 'month') d.setDate(1);
    if (unit === 'year') { d.setMonth(0); d.setDate(1); }
    while (d.getTime() < stop) {
        ticks.push(new Date(d));
        if (unit === 'year') d.setFullYear(d.getFullYear() + step);
        else if (unit === 'month') d.setMonth(d.getMonth() + step);
        else if (unit === 'week') d.setDate(d.getDate() + 7 * step);
        else if (unit === 'day') d.setDate(d.getDate() + step);
        else if (unit === 'hour') d.setHours(d.getHours() + step);
    }
    if (ticks.length < 2 || ticks[ticks.length-1].getTime() < stop) {
        ticks.push(new Date(stop));
    }
    return {ticks, format};
}

/**
 * D3-inspired linear tick generator for APR
 * @param {number} min
 * @param {number} max
 * @param {number} maxCount
 * @returns {number[]}
 */
function niceLinearTicks(min, max, maxCount) {
    // D3-like nice ticks for linear scale
    const span = max - min;
    if (span === 0) return [min];
    const step = Math.pow(10, Math.floor(Math.log10(span / maxCount)));
    const err = maxCount / (span / step);
    let niceStep = step;
    if (err <= 0.15) niceStep *= 10;
    else if (err <= 0.35) niceStep *= 5;
    else if (err <= 0.75) niceStep *= 2;
    const niceMin = Math.floor(min / niceStep) * niceStep;
    const niceMax = Math.ceil(max / niceStep) * niceStep;
    const ticks = [];
    for (let v = niceMin; v <= niceMax + 0.5 * niceStep; v += niceStep) {
        ticks.push(Number(v.toFixed(6)));
    }
    return ticks;
}

// --- Axis and Tick Constants ---
const TICK_LENGTH = 5;
const TICK_PADDING = 5;
const DATE_TICK_COUNT = 12;

/**
 * Draw axes on the chart
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} WIDTH
 * @param {number} HEIGHT
 * @param {number} CHART_HEIGHT
 * @param {number} CHART_PADDING_X
 * @param {number} CHART_PADDING_TOP
 * @param {Array} allBubbles
 * @param {Date|null} PADDED_MIN_DATE
 * @param {Date|null} PADDED_MAX_DATE
 */
function drawAxes(ctx, WIDTH, HEIGHT, CHART_HEIGHT, CHART_PADDING_X, CHART_PADDING_TOP, allBubbles, PADDED_MIN_DATE, PADDED_MAX_DATE) {
    ctx.save();
    ctx.lineWidth = 1;
    
    // Draw Y axis APR ticks, grid lines, and labels (D3-inspired)
    if (allBubbles.length > 0) {
        const loans = allBubbles;
        const minAPR = Math.min(...loans.map(l => l.apr));
        const maxAPR = Math.max(...loans.map(l => l.apr));
        let aprTicks = niceLinearTicks(minAPR, maxAPR, 8);
        if (aprTicks.length > 1) aprTicks = aprTicks.slice(1);
        aprTicks.forEach(tick => {
            const y = CHART_PADDING_TOP + (CHART_HEIGHT - CHART_PADDING_TOP) * (1 - (tick - minAPR) / ((maxAPR - minAPR) || 1));
            // Draw grid line
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'; // semi-transparent white
            ctx.beginPath();
            ctx.moveTo(CHART_PADDING_X, y);
            ctx.lineTo(WIDTH, y);
            ctx.stroke();
            // Draw tick in left margin
            ctx.strokeStyle = '#B6B1D5'; // lighter color for axis
            ctx.beginPath();
            ctx.moveTo(CHART_PADDING_X - TICK_LENGTH, y);
            ctx.lineTo(CHART_PADDING_X, y);
            ctx.stroke();
            // Draw label in left margin
            ctx.fillStyle = '#B6B1D5'; // lighter color for labels
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.font = '13px Inter, Arial, sans-serif';
            ctx.fillText(tick % 1 === 0 ? `${tick}` : tick.toFixed(2), CHART_PADDING_X - TICK_LENGTH - TICK_PADDING, y);
        });
    }
    
    // Draw X axis date ticks and grid lines (D3-inspired)
    if (allBubbles.length > 0 && PADDED_MIN_DATE !== null && PADDED_MAX_DATE !== null) {
        const paddedMinDate = PADDED_MIN_DATE;
        const paddedMaxDate = PADDED_MAX_DATE;
        const scale = timeScale([paddedMinDate, paddedMaxDate], [CHART_PADDING_X, WIDTH - CHART_PADDING_X]);
        const {ticks: dateTicks, format: dateFormat} = niceDateTicks(paddedMinDate, paddedMaxDate, DATE_TICK_COUNT);
        dateTicks.forEach(date => {
            const x = scale(date.getTime());
            // Draw grid line
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'; // semi-transparent white
            ctx.beginPath();
            ctx.moveTo(x, CHART_PADDING_TOP);
            ctx.lineTo(x, CHART_HEIGHT);
            ctx.stroke();
            // Draw tick
            ctx.strokeStyle = '#B6B1D5'; // lighter color for axis
            ctx.beginPath();
            ctx.moveTo(x, CHART_HEIGHT);
            ctx.lineTo(x, CHART_HEIGHT + TICK_LENGTH);
            ctx.stroke();
            // Draw date label in the dark area, above the bottom padding
            ctx.fillStyle = '#B6B1D5'; // lighter color for labels
            ctx.textAlign = 'center';
            const dateStr = dateFormat(date);
            ctx.fillText(dateStr, x, CHART_HEIGHT + TICK_LENGTH + TICK_PADDING + 10);
        });
    }
    
    ctx.restore();
}

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
 * @param {boolean} showImages
 * @param {Object} PROTOCOL_COLORS
 * @param {string} DEFAULT_PROTOCOL_COLOR
 * @param {Array} allBubbles
 * @param {Date|null} PADDED_MIN_DATE
 * @param {Date|null} PADDED_MAX_DATE
 */
function draw(ctx, WIDTH, HEIGHT, CHART_HEIGHT, CHART_PADDING_X, CHART_PADDING_TOP, singleBubbles, clusters, showImages, PROTOCOL_COLORS, DEFAULT_PROTOCOL_COLOR, allBubbles, PADDED_MIN_DATE, PADDED_MAX_DATE) {
    // Visually separate plot and label areas
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    // Draw top margin (dark for top padding)
    ctx.fillStyle = '#221E37';
    ctx.fillRect(0, 0, WIDTH, CHART_PADDING_TOP);
    // Draw left margin (dark for y-axis labels)
    ctx.fillStyle = '#221E37';
    ctx.fillRect(0, CHART_PADDING_TOP, CHART_PADDING_X, CHART_HEIGHT - CHART_PADDING_TOP);
    // Draw label area (dark)
    ctx.fillStyle = '#221E37';
    ctx.fillRect(0, CHART_HEIGHT, WIDTH, HEIGHT - CHART_HEIGHT);
    // Draw plot area (dark), starting exactly at the y-axis line
    ctx.fillStyle = '#221E37';
    ctx.fillRect(CHART_PADDING_X - TICK_LENGTH, CHART_PADDING_TOP, WIDTH - (CHART_PADDING_X - TICK_LENGTH), CHART_HEIGHT - CHART_PADDING_TOP);
    // Draw axes and bubbles
    drawAxes(ctx, WIDTH, HEIGHT, CHART_HEIGHT, CHART_PADDING_X, CHART_PADDING_TOP, allBubbles, PADDED_MIN_DATE, PADDED_MAX_DATE);
    // 1. Draw single bubbles and non-expanded clusters
    for (const b of singleBubbles) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.closePath();
        if (showImages && b.img && b.img.complete && b.img.naturalWidth > 0) {
            ctx.clip();
            ctx.drawImage(b.img, b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
        } else {
            ctx.fillStyle = PROTOCOL_COLORS[b.protocol] || DEFAULT_PROTOCOL_COLOR;
            ctx.globalAlpha = 0.65;
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
        ctx.restore();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.stroke();
    }
    for (const cluster of clusters) {
        if (cluster.state !== "expanded" && cluster.state !== "expanding") {
            for (const b of cluster.bubbles) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
                ctx.closePath();
                if (showImages && b.img && b.img.complete && b.img.naturalWidth > 0) {
                    ctx.clip();
                    ctx.drawImage(b.img, b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
                } else {
                    ctx.fillStyle = PROTOCOL_COLORS[b.protocol] || DEFAULT_PROTOCOL_COLOR;
                    ctx.globalAlpha = 0.65;
                    ctx.fill();
                    ctx.globalAlpha = 1.0;
                }
                ctx.restore();
                ctx.setLineDash([6, 6]);
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.r + 2, 0, Math.PI * 2); // 2px offset for stroke
                ctx.strokeStyle = 'rgba(255,255,255,0.75)'; // dashed white outline
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }
    }
    // 2. Draw expanded (and expanding) clusters on top
    for (const cluster of clusters) {
        if (cluster.state === "expanded" || cluster.state === "expanding") {
            for (const b of cluster.bubbles) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
                ctx.closePath();
                if (showImages && b.img && b.img.complete && b.img.naturalWidth > 0) {
                    ctx.clip();
                    ctx.drawImage(b.img, b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
                } else {
                    ctx.fillStyle = PROTOCOL_COLORS[b.protocol] || DEFAULT_PROTOCOL_COLOR;
                    ctx.globalAlpha = 0.65;
                    ctx.fill();
                    ctx.globalAlpha = 1.0;
                }
                ctx.restore();
                ctx.setLineDash([6, 6]);
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.r + 2, 0, Math.PI * 2); // 2px offset for stroke 
                ctx.strokeStyle = 'rgba(255,255,255,0.75)'; // dashed white outline
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }
    }
}

/**
 * Update the tooltip display
 * @param {HTMLElement} tooltip
 * @param {number} mouseX
 * @param {number} mouseY
 * @param {Array} singleBubbles
 * @param {Array} clusters
 * @param {HTMLCanvasElement} canvas
 * @param {Array} allBubbles
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
                <span class="tooltip-value">${closest.apr ? closest.apr.toFixed(2) : '--'}%</span>
            </div>
            <div class="tooltip-row">
                <span class="tooltip-label">Repayment</span>
                <span class="tooltip-value">${repayment} <span class="tooltip-value usdc">USDC</span></span>
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

export { timeScale, niceDateTicks, niceLinearTicks, TICK_LENGTH, TICK_PADDING, DATE_TICK_COUNT, drawAxes, draw, updateTooltip }; 