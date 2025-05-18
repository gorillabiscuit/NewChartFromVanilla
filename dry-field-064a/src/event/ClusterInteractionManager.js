import { REVERT_DELAY } from '../config/constants.js';
import { dispatch, getState } from '../state/state.js';
import { applyOutwardForce } from '../utils/physics.js';

/**
 * Purpose: Manages cluster interactions and state transitions
 * Boundaries: Handles cluster state management and interaction timing
 */
class ClusterInteractionManager {
    constructor() {
        this.animationFrame = null;
        this.isAnimating = false;
        this.activeTimers = new Map();
        this.stateTransitions = new Map();
    }

    /**
     * Check if a point is hovering over any bubble in a cluster
     * @param {Object} cluster - The cluster to check
     * @param {{x: number, y: number}} mousePos - Current mouse position
     * @returns {boolean} Whether the cluster is being hovered
     */
    checkHover(cluster, mousePos) {
        for (const bubble of cluster.bubbles) {
            const dx = mousePos.x - bubble.x;
            const dy = mousePos.y - bubble.y;
            const dist = Math.hypot(dx, dy);
            if (dist < bubble.r) {
                return true;
            }
        }
        return false;
    }

    startRevertTimer(clusterId) {
        console.log(`[Cluster ${clusterId}] Starting revert timer`);
        
        // Clear any existing timer
        this.clearRevertTimer(clusterId);
        
        // Record the start time for this transition
        const startTime = Date.now();
        this.stateTransitions.set(clusterId, {
            startTime,
            targetState: 'reverting'
        });
        console.log(`[Cluster ${clusterId}] Recorded transition start time: ${startTime}`);

        // Set the timer
        const timer = setTimeout(() => {
            console.log(`[Cluster ${clusterId}] Timer callback triggered`);
            const state = getState();
            const cluster = state.clusters.find(c => c.id === clusterId);
            const transition = this.stateTransitions.get(clusterId);
            
            console.log(`[Cluster ${clusterId}] Current state:`, {
                clusterExists: !!cluster,
                isHovering: cluster?.hovering,
                hasTransition: !!transition,
                currentState: cluster?.state,
                timeSinceStart: transition ? Date.now() - transition.startTime : 'N/A'
            });
            
            if (cluster && !cluster.hovering && transition) {
                // Verify the transition is still valid
                const timeSinceStart = Date.now() - transition.startTime;
                console.log(`[Cluster ${clusterId}] Time since transition start: ${timeSinceStart}ms`);
                
                if (timeSinceStart >= REVERT_DELAY) {
                    console.log(`[Cluster ${clusterId}] Transitioning to reverting state`);
                    dispatch({
                        type: 'UPDATE_CLUSTER_STATE',
                        payload: {
                            clusterId,
                            state: 'reverting',
                            transitionTime: timeSinceStart
                        }
                    });
                } else {
                    console.log(`[Cluster ${clusterId}] Transition not valid: ${timeSinceStart}ms < ${REVERT_DELAY}ms`);
                }
            } else {
                console.log(`[Cluster ${clusterId}] Skipping transition:`, {
                    clusterExists: !!cluster,
                    isHovering: cluster?.hovering,
                    hasTransition: !!transition
                });
            }
            
            this.activeTimers.delete(clusterId);
            this.stateTransitions.delete(clusterId);
        }, REVERT_DELAY);
        
        this.activeTimers.set(clusterId, timer);
        console.log(`[Cluster ${clusterId}] Timer set for ${REVERT_DELAY}ms`);
    }

    clearRevertTimer(clusterId) {
        const timer = this.activeTimers.get(clusterId);
        if (timer) {
            console.log(`[Cluster ${clusterId}] Clearing existing timer`);
            clearTimeout(timer);
            this.activeTimers.delete(clusterId);
        }
        if (this.stateTransitions.has(clusterId)) {
            console.log(`[Cluster ${clusterId}] Clearing transition state`);
            this.stateTransitions.delete(clusterId);
        }
    }

    /**
     * Handle mouse movement and update cluster states
     * @param {{x: number, y: number}} mousePos - Current mouse position
     */
    handleMouseMove(mousePos) {
        const state = getState();
        let needsUpdate = false;

        const updatedClusters = state.clusters.map(cluster => {
            const isHovering = this.checkHover(cluster, mousePos);
            const updatedCluster = { ...cluster };

            if (isHovering) {
                if (!updatedCluster.hovering) {
                    console.log(`[Cluster ${cluster.id}] Mouse entered cluster`);
                    updatedCluster.hovering = true;
                    if (updatedCluster.state === "idle") {
                        console.log(`[Cluster ${cluster.id}] Transitioning from idle to expanding`);
                        updatedCluster.state = "expanding";
                        applyOutwardForce(updatedCluster, state.width, state.height);
                        updatedCluster.frameCount = 0;
                    }
                    this.clearRevertTimer(updatedCluster.id);
                    needsUpdate = true;
                }
            } else {
                if (updatedCluster.hovering) {
                    console.log(`[Cluster ${cluster.id}] Mouse left cluster`);
                    updatedCluster.hovering = false;
                    if (updatedCluster.state === "expanded") {
                        console.log(`[Cluster ${cluster.id}] Starting revert timer for expanded cluster`);
                        this.startRevertTimer(updatedCluster.id);
                    } else {
                        console.log(`[Cluster ${cluster.id}] Not starting revert timer - current state: ${updatedCluster.state}`);
                    }
                    needsUpdate = true;
                }
            }

            return updatedCluster;
        });

        if (needsUpdate) {
            console.log('Dispatching cluster updates');
            dispatch({
                type: 'UPDATE_CLUSTERS',
                payload: updatedClusters
            });
        }
    }

    /**
     * Clean up any pending timeouts and animation frames
     */
    cleanup() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        for (const timer of this.activeTimers.values()) {
            clearTimeout(timer);
        }
        this.activeTimers.clear();
        this.stateTransitions.clear();
    }
}

export default ClusterInteractionManager; 