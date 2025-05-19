/**
 * @fileoverview Pure rendering utility functions for canvas operations.
 * 
 * Module Boundaries:
 * - This module contains pure functions for canvas rendering
 * - All functions should be side-effect free
 * - No state mutations or UI updates
 * - No direct DOM manipulation outside canvas context
 * 
 * Allowed Dependencies:
 * - /utils/* - For pure utility functions
 * 
 * Forbidden:
 * - Direct state mutations
 * - Direct DOM manipulation (except canvas context)
 * - Window assignments
 * - Global variables
 * - Data fetching
 * - UI updates (except canvas drawing)
 */

import { state } from '../state/state.js';
import { DEFAULT_BUBBLE_OPACITY, EXPANDED_BUBBLE_OPACITY, DEFAULT_STROKE_OPACITY, EXPANDED_STROKE_OPACITY } from '../config/constants.js';

/**
 * Purpose: Rendering utilities for drawing chart axes, bubbles, and grid lines.
 * Boundaries: Only handles canvas drawing. No state mutation or data fetching.
 */

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

// Utility to measure the widest Y-axis label
function getMaxYLabelWidth(ctx, minAPR, maxAPR) {
    ctx.save();
    ctx.font = '13px Inter, Arial, sans-serif';
    // Consider the largest possible label in the range, formatted as a percent
    const candidates = [minAPR, maxAPR, 0, 100, 999];
    let maxWidth = 0;
    for (const val of candidates) {
        const label = Math.round(val) + '%';
        const width = ctx.measureText(label).width;
        if (width > maxWidth) maxWidth = width;
    }
    ctx.restore();
    return maxWidth;
}

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
    let dynamicPaddingX = CHART_PADDING_X;
    // Dynamically calculate left padding for Y-axis labels
    if (allBubbles.length > 0) {
        const loans = allBubbles;
        const minAPR = Math.min(...loans.map(l => l.apr));
        const maxAPR = Math.max(...loans.map(l => l.apr));
        const labelWidth = getMaxYLabelWidth(ctx, minAPR, maxAPR);
        dynamicPaddingX = Math.max(CHART_PADDING_X, Math.ceil(labelWidth + 16)); // 16px margin
    }
    // Draw Y axis APR ticks, grid lines, and labels (D3-inspired)
    if (allBubbles.length > 0) {
        const loans = allBubbles;
        const minAPR = Math.min(...loans.map(l => l.apr));
        const maxAPR = Math.max(...loans.map(l => l.apr));
        let aprTicks = niceLinearTicks(minAPR, maxAPR, 8);
        if (aprTicks.length > 1) aprTicks = aprTicks.slice(1);
        aprTicks = aprTicks.filter(tick => Number.isInteger(tick));
        aprTicks.forEach(tick => {
            const y = CHART_PADDING_TOP + (CHART_HEIGHT - CHART_PADDING_TOP) * (1 - (tick - minAPR) / ((maxAPR - minAPR) || 1));
            // Draw grid line
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.beginPath();
            ctx.moveTo(dynamicPaddingX, y);
            ctx.lineTo(WIDTH, y);
            ctx.stroke();
            // Draw tick in left margin
            ctx.strokeStyle = '#B6B1D5';
            ctx.beginPath();
            ctx.moveTo(dynamicPaddingX - TICK_LENGTH, y);
            ctx.lineTo(dynamicPaddingX, y);
            ctx.stroke();
            // Draw label in left margin
            ctx.fillStyle = '#B6B1D5';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.font = '13px Inter, Arial, sans-serif';
            ctx.fillText(Math.round(tick) + '%', dynamicPaddingX - TICK_LENGTH - 2, y);
        });
    }
    
    // Draw X axis date ticks and grid lines (D3-inspired)
    if (allBubbles.length > 0 && PADDED_MIN_DATE !== null && PADDED_MAX_DATE !== null) {
        const paddedMinDate = PADDED_MIN_DATE;
        const paddedMaxDate = PADDED_MAX_DATE;
        const scale = timeScale([paddedMinDate, paddedMaxDate], [dynamicPaddingX, WIDTH - dynamicPaddingX]);
        const {ticks: dateTicks, format: dateFormat} = niceDateTicks(paddedMinDate, paddedMaxDate, DATE_TICK_COUNT);
        dateTicks.forEach(date => {
            const x = scale(date.getTime());
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.beginPath();
            ctx.moveTo(x, CHART_PADDING_TOP);
            ctx.lineTo(x, CHART_HEIGHT);
            ctx.stroke();
            ctx.strokeStyle = '#B6B1D5';
            ctx.beginPath();
            ctx.moveTo(x, CHART_HEIGHT);
            ctx.lineTo(x, CHART_HEIGHT + TICK_LENGTH);
            ctx.stroke();
            ctx.fillStyle = '#B6B1D5';
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
    if (!allBubbles || allBubbles.length === 0) {
        ctx.clearRect(0, 0, WIDTH, HEIGHT);
        return;
    }
    
    // Clear and setup background
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
    
    // Draw ALL bubbles - both single and clustered
    for (const b of allBubbles) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.closePath();
        if (showImages && b.img && b.img.complete && b.img.naturalWidth > 0) {
            ctx.clip();
            ctx.drawImage(b.img, b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
        } else {
            ctx.fillStyle = PROTOCOL_COLORS[b.protocol] || DEFAULT_PROTOCOL_COLOR;
            
            // Only apply opacity changes to standalone bubbles
            const isStandalone = singleBubbles.includes(b);
            if (isStandalone) {
                // Set initial opacity to DEFAULT_BUBBLE_OPACITY if not set
                if (b.opacity === undefined) {
                    b.opacity = DEFAULT_BUBBLE_OPACITY;
                }
                // Check if bubble is being hovered
                const mouseX = state.mousePosition?.x || 0;
                const mouseY = state.mousePosition?.y || 0;
                const dx = mouseX - b.x;
                const dy = mouseY - b.y;
                const dist = Math.hypot(dx, dy);
                
                // If mouse is over bubble, animate to EXPANDED_BUBBLE_OPACITY
                if (dist < b.r) {
                    b.opacity = Math.min(b.opacity + 0.1, EXPANDED_BUBBLE_OPACITY);
                } else {
                    // Otherwise animate back to DEFAULT_BUBBLE_OPACITY
                    b.opacity = Math.max(b.opacity - 0.1, DEFAULT_BUBBLE_OPACITY);
                }
                ctx.globalAlpha = b.opacity;
            } else {
                // For clustered bubbles, use their existing opacity or default
                ctx.globalAlpha = b.opacity || DEFAULT_BUBBLE_OPACITY;
            }
            
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
        ctx.restore();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        
        // Only apply stroke opacity changes to standalone bubbles
        const isStandalone = singleBubbles.includes(b);
        if (isStandalone) {
            // Set initial stroke opacity if not set
            if (b.strokeOpacity === undefined) {
                b.strokeOpacity = DEFAULT_STROKE_OPACITY;
            }
            // Check if bubble is being hovered
            const mouseX = state.mousePosition?.x || 0;
            const mouseY = state.mousePosition?.y || 0;
            const dx = mouseX - b.x;
            const dy = mouseY - b.y;
            const dist = Math.hypot(dx, dy);
            
            // If mouse is over bubble, animate to EXPANDED_STROKE_OPACITY
            if (dist < b.r) {
                b.strokeOpacity = Math.min(b.strokeOpacity + 0.1, EXPANDED_STROKE_OPACITY);
            } else {
                // Otherwise animate back to DEFAULT_STROKE_OPACITY
                b.strokeOpacity = Math.max(b.strokeOpacity - 0.1, DEFAULT_STROKE_OPACITY);
            }
            ctx.globalAlpha = b.strokeOpacity;
        } else {
            // For clustered bubbles, use their existing stroke opacity or default
            ctx.globalAlpha = b.strokeOpacity || DEFAULT_STROKE_OPACITY;
        }
        
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    }
}

export { timeScale, niceDateTicks, niceLinearTicks, TICK_LENGTH, TICK_PADDING, DATE_TICK_COUNT, drawAxes, draw }; 