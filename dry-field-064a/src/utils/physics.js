/**
 * Purpose: Physics utilities for bubble movement and cluster interactions.
 * Boundaries: Pure functions only. No state mutation or DOM manipulation.
 */
import {
  BASE_REPULSION, REPULSION_POWER, REPULSION_CLUSTER_CAP, OUTWARD_FORCE, OUTWARD_FORCE_DIVISOR,
  OUTWARD_FORCE_POWER, OUTWARD_CLUSTER_CAP, SPRING_CONSTANT, CLUSTER_SCALE_DIVISOR, OVERLAP_SCALE,
  OVERLAP_FORCE_MULTIPLIER, BASE_VELOCITY, VELOCITY_POWER, MAX_FRAMES, REVERT_DELAY, REVERT_SPEED,
  BASE_DAMPING, EXTRA_DAMPING, DAMPING_CLUSTER_THRESHOLD
} from '../config/constants.js';
import { getBubbleOverlap } from '../data/bubbleUtils.js';

// --- Physics Functions ---
/**
 * @param {Object} cluster
 */
function applySpringForces(cluster) {
    const bubbles = cluster.bubbles;
    const clusterSize = cluster.size;
    // Calculate overlap counts for each bubble
    const overlapCounts = new Map();
    for (let i = 0; i < bubbles.length; i++) {
        let overlaps = 0;
        for (let j = 0; j < bubbles.length; j++) {
            if (i !== j && getBubbleOverlap(bubbles[i], bubbles[j]) > 0.1 * (bubbles[i].r + bubbles[j].r)) {
                overlaps++;
            }
        }
        overlapCounts.set(bubbles[i], overlaps);
    }
    // --- Always apply spring/attraction force to all pairs ---
    for (let i = 0; i < bubbles.length; i++) {
        for (let j = i + 1; j < bubbles.length; j++) {
            const ci = bubbles[i];
            const cj = bubbles[j];
            const dx = cj.x - ci.x;
            const dy = cj.y - ci.y;
            const dist = Math.hypot(dx, dy) || 1e-6;
            const idealDist = ci.r + cj.r;
            const displacement = dist - idealDist;
            const overlapScale = 1 + (overlapCounts.get(ci) + overlapCounts.get(cj)) * OVERLAP_SCALE;
            const clusterScale = 1 + (clusterSize / CLUSTER_SCALE_DIVISOR);
            const springVariation = 1 + (Math.random() - 0.5) * 0.1;
            let force = SPRING_CONSTANT * displacement * overlapScale * clusterScale * springVariation;
            // Only boost force for overlapping pairs
            if (displacement < 0 && getBubbleOverlap(ci, cj) > 0.1 * (ci.r + cj.r)) {
                force *= OVERLAP_FORCE_MULTIPLIER;
            }
            const nx = dx / dist;
            const ny = dy / dist;
            ci.vx += nx * force;
            ci.vy += ny * force;
            cj.vx -= nx * force;
            cj.vy -= ny * force;
        }
    }
    // --- Repulsion force removed: replaced by constraint-based collision resolution in updateCluster ---
}

/**
 * @param {Object} cluster
 */
function updateCluster(cluster) {
    const bubbles = cluster.bubbles;
    // Adaptive damping: increase for large clusters
    const clusterSize = cluster.size;
    let damping = BASE_DAMPING;
    if (clusterSize > DAMPING_CLUSTER_THRESHOLD) {
        const t = Math.min((clusterSize - DAMPING_CLUSTER_THRESHOLD) / DAMPING_CLUSTER_THRESHOLD, 1);
        damping += t * EXTRA_DAMPING;
    }
    for (const c of bubbles) {
        c.x += c.vx;
        c.y += c.vy;
        c.vx *= damping;
        c.vy *= damping;
    }
    // --- Constraint-based collision resolution: move overlapping bubbles apart ---
    for (let i = 0; i < bubbles.length; i++) {
        for (let j = i + 1; j < bubbles.length; j++) {
            const bi = bubbles[i];
            const bj = bubbles[j];
            const dx = bj.x - bi.x;
            const dy = bj.y - bi.y;
            const dist = Math.hypot(dx, dy) || 1e-6;
            const minDist = bi.r + bj.r;
            if (dist < minDist) {
                const overlap = minDist - dist;
                const nx = dx / dist;
                const ny = dy / dist;
                // Move each bubble away from the other by half the overlap
                bi.x -= nx * overlap / 2;
                bi.y -= ny * overlap / 2;
                bj.x += nx * overlap / 2;
                bj.y += ny * overlap / 2;
            }
        }
    }
}

/**
 * @param {Object} cluster
 * @param {number} WIDTH
 * @param {number} HEIGHT
 */
function applyOutwardForce(cluster, WIDTH, HEIGHT) {
    const centerX = WIDTH / 2;
    const centerY = HEIGHT / 2;
    const clusterSize = cluster.size;
    const cappedClusterSize = Math.min(clusterSize, OUTWARD_CLUSTER_CAP);
    const outwardForce = OUTWARD_FORCE * (1 + Math.pow(cappedClusterSize, OUTWARD_FORCE_POWER) / OUTWARD_FORCE_DIVISOR);
    for (const c of cluster.bubbles) {
        const dx = c.x - centerX;
        const dy = c.y - centerY;
        const dist = Math.hypot(dx, dy) || 1e-6;
        c.vx += (dx / dist) * outwardForce;
        c.vy += (dy / dist) * outwardForce;
    }
}

/**
 * @param {Object} cluster
 */
function revertClusterSmoothly(cluster) {
    let allClose = true;
    for (const b of cluster.bubbles) {
        b.x += (b.initialX - b.x) * REVERT_SPEED * 1.5;
        b.y += (b.initialY - b.y) * REVERT_SPEED * 1.5;

        const dx = b.x - b.initialX;
        const dy = b.y - b.initialY;
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
            allClose = false;
        }
    }

    if (allClose) {
        for (const b of cluster.bubbles) {
            b.x = b.initialX;
            b.y = b.initialY;
            b.vx = 0;
            b.vy = 0;
            b.showTooltip = false;
        }
        cluster.state = "idle";
        cluster.frameCount = 0;
    }
}

export { applySpringForces, updateCluster, applyOutwardForce, revertClusterSmoothly }; 