/**
 * ChartController - Manages chart state transitions and animation control
 * Ensures atomic updates and proper cleanup during wallet changes
 */

import { dispatch, getState, subscribe } from '../state/state.js';
import { fetchLoanData } from '../data/dataService.js';
import { useLoanDataForBubbles } from '../data/clusterUtils.js';
import { draw } from '../utils/renderUtils.js';
import { updateTooltip } from '../ui/uiComponents.js';

export class ChartController {
    constructor(ctx, canvas, tooltip, config) {
        this.ctx = ctx;
        this.canvas = canvas;
        this.tooltip = tooltip;
        this.config = config;
        
        this.animationFrame = null;
        this.isTransitioning = false;
        this.stateVersion = 0;
        this.pendingStateUpdate = null;
        
        // Bind methods
        this.startAnimation = this.startAnimation.bind(this);
        this.stopAnimation = this.stopAnimation.bind(this);
        this.renderFrame = this.renderFrame.bind(this);
        
        // Subscribe to state changes
        this.unsubscribe = subscribe(this.handleStateChange.bind(this));
    }

    handleStateChange(newState) {
        if (newState.status === 'ready') {
            this.startAnimation();
        } else {
            this.stopAnimation();
        }
    }

    startAnimation() {
        if (!this.animationFrame) {
            this.animationFrame = requestAnimationFrame(this.renderFrame);
        }
    }

    stopAnimation() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    renderFrame() {
        const state = getState();
        if (state.status !== 'ready') {
            this.stopAnimation();
            return;
        }

        let needsUpdate = false;

        // Check if any clusters need animation
        for (const cluster of state.clusters) {
            if (cluster.state === "expanding" || cluster.state === "reverting") {
                needsUpdate = true;
                break;
            }
        }

        if (needsUpdate) {
            // Update clusters
            for (const cluster of state.clusters) {
                if (cluster.state === "expanding") {
                    if (!cluster.packedInitialized) {
                        this.config.packClusterBubbles(
                            cluster,
                            state.chartPaddingX || this.config.CHART_PADDING_X,
                            state.width || this.config.WIDTH,
                            state.chartPaddingTop || this.config.CHART_PADDING_TOP,
                            state.chartHeight || this.config.CHART_HEIGHT
                        );
                        cluster.packedInitialized = true;
                    }
                    this.config.animateClusterToPacked(cluster, 0.18);
                    cluster.frameCount++;
                    if (cluster.frameCount >= this.config.MAX_FRAMES) {
                        cluster.state = "expanded";
                        for (const b of cluster.bubbles) {
                            b.showTooltip = true;
                        }
                    }
                } else if (cluster.state === "reverting") {
                    this.config.revertClusterSmoothly(
                        cluster,
                        state.width || this.config.WIDTH,
                        state.height || this.config.HEIGHT
                    );
                    cluster.packedInitialized = false;
                }
            }
        }

        // Request next frame if we're still animating
        if (needsUpdate) {
            this.animationFrame = requestAnimationFrame(this.renderFrame);
        } else {
            this.stopAnimation();
        }
    }

    async loadLoans(wallet, period = 30) {
        if (this.isTransitioning) {
            this.pendingStateUpdate = { wallet, period };
            return;
        }
        
        // 1. Start transition
        this.isTransitioning = true;
        this.stateVersion++;
        const currentVersion = this.stateVersion;
        
        // 2. Stop any ongoing animation
        this.stopAnimation();
        
        // 3. Clear state and canvas
        dispatch({ type: 'SET_STATUS', payload: 'loading' });
        dispatch({ type: 'SET_ERROR', payload: null });
        dispatch({ type: 'INCREMENT_IMAGE_LOAD_GENERATION' });
        dispatch({ type: 'CLEAR_BUBBLES' });
        dispatch({ type: 'SET_CURRENT_WALLET', payload: wallet });
        
        // Defensive: Clear canvas only if available
        if (this.canvas && this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        try {
            // 4. Fetch new data
            const data = await fetchLoanData(wallet, period);
            
            // 5. Update state atomically if still current version
            if (this.stateVersion === currentVersion && data && data.data && data.data.length > 0) {
                // Process data and update state
                const newAllBubbles = [];
                const newClusters = [];
                const newSingleBubbles = [];
                const isAllLoansMode = wallet === '__ALL__';
                const showImages = getState().showImages;
                
                const bubblesResult = useLoanDataForBubbles(
                    data.data,
                    newAllBubbles,
                    newClusters,
                    newSingleBubbles,
                    () => {
                        if (this.canvas && this.ctx) {
                            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                        }
                    },
                    (bubbles) => this.config.findClusters(bubbles, newClusters, newSingleBubbles, this.config.bubblesOverlap, this.config.VELOCITY_POWER, this.config.BASE_VELOCITY),
                    (loan, ...bubbleArgs) => this.config.createLoanBubbleFromAPI(loan, ...bubbleArgs, isAllLoansMode, showImages),
                    (min, max) => {
                        this.config.PADDED_MIN_DATE = min;
                        this.config.PADDED_MAX_DATE = max;
                        dispatch({ type: 'SET_DATE_RANGE', payload: { min, max } });
                    },
                    this.config.MIN_PADDING_PERCENT,
                    this.config.MAX_PADDING_PERCENT,
                    this.config.CHART_PADDING_X,
                    this.config.WIDTH,
                    this.config.CHART_PADDING_TOP,
                    this.config.CHART_HEIGHT,
                    this.config.BUBBLE_PADDING_FACTOR,
                    isAllLoansMode,
                    showImages
                );
                
                // Batch state updates
                dispatch({
                    type: 'SET_BUBBLES',
                    payload: {
                        allBubbles: [...newAllBubbles],
                        clusters: [...newClusters],
                        singleBubbles: [...newSingleBubbles]
                    }
                });
                dispatch({ type: 'SET_STATUS', payload: 'ready' });
            } else if (this.stateVersion === currentVersion) {
                // No data or error
                dispatch({ type: 'SET_STATUS', payload: 'error' });
                dispatch({ type: 'SET_ERROR', payload: 'No loans found for this wallet.' });
                // Force a visual update
                import('../state/state.js').then(({ dispatch }) => {
                    dispatch({ type: 'SET_CANVAS_DIMENSIONS', payload: {} });
                });
            }
        } catch (error) {
            if (this.stateVersion === currentVersion) {
                dispatch({ type: 'SET_STATUS', payload: 'error' });
                dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to fetch data' });
            }
        } finally {
            // 6. End transition
            this.isTransitioning = false;
            
            // 7. Handle any pending state updates
            if (this.pendingStateUpdate) {
                const pending = this.pendingStateUpdate;
                this.pendingStateUpdate = null;
                this.loadLoans(pending.wallet, pending.period);
            }
        }
    }

    cleanup() {
        this.stopAnimation();
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }

    /**
     * Updates the chart with filtered loans
     * @param {Array} filteredLoans - Array of filtered loan objects
     * @param {number} minUSD - Minimum USD value for scaling
     * @param {number} maxUSD - Maximum USD value for scaling
     */
    async updateWithFilteredLoans(filteredLoans, minUSD, maxUSD) {
        if (this.isTransitioning) {
            return;
        }

        // Start transition
        this.isTransitioning = true;
        this.stateVersion++;
        const currentVersion = this.stateVersion;

        // Stop any ongoing animation
        this.stopAnimation();

        // Clear state and canvas
        dispatch({ type: 'SET_STATUS', payload: 'loading' });
        dispatch({ type: 'SET_ERROR', payload: null });
        dispatch({ type: 'INCREMENT_IMAGE_LOAD_GENERATION' });
        dispatch({ type: 'CLEAR_BUBBLES' });

        // Defensive: Clear canvas only if available
        if (this.canvas && this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }

        try {
            // Process filtered data
            const newAllBubbles = [];
            const newClusters = [];
            const newSingleBubbles = [];
            const showImages = getState().showImages;

            // Handle single loan case
            if (filteredLoans.length === 1) {
                const loan = filteredLoans[0];
                const loanDate = new Date(loan.dueDate);
                
                // Create a single day range centered on the loan date
                const minDate = new Date(loanDate.getTime() - 12 * 60 * 60 * 1000); // 12 hours before
                const maxDate = new Date(loanDate.getTime() + 12 * 60 * 60 * 1000); // 12 hours after
                
                // Set the date range for the chart
                this.config.PADDED_MIN_DATE = minDate;
                this.config.PADDED_MAX_DATE = maxDate;
                dispatch({ type: 'SET_DATE_RANGE', payload: { min: minDate, max: maxDate } });

                // Adjust APR range to be 1 percentage point around the loan's APR
                const loanAPR = loan.apr || 0;
                const minAPR = Math.floor(loanAPR); // Round down to nearest integer
                const maxAPR = minAPR + 1; // One percentage point above

                // Update the config with adjusted ranges
                this.config.MIN_APR = minAPR;
                this.config.MAX_APR = maxAPR;
            }

            const bubblesResult = useLoanDataForBubbles(
                filteredLoans,
                newAllBubbles,
                newClusters,
                newSingleBubbles,
                () => {
                    if (this.canvas && this.ctx) {
                        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                    }
                },
                (bubbles) => this.config.findClusters(bubbles, newClusters, newSingleBubbles, this.config.bubblesOverlap, this.config.VELOCITY_POWER, this.config.BASE_VELOCITY),
                (loan, ...bubbleArgs) => this.config.createLoanBubbleFromAPI(loan, ...bubbleArgs, false, showImages),
                (min, max) => {
                    // Only update date range if not handling single loan case
                    if (filteredLoans.length !== 1) {
                        this.config.PADDED_MIN_DATE = min;
                        this.config.PADDED_MAX_DATE = max;
                        dispatch({ type: 'SET_DATE_RANGE', payload: { min, max } });
                    }
                },
                this.config.MIN_PADDING_PERCENT,
                this.config.MAX_PADDING_PERCENT,
                this.config.CHART_PADDING_X,
                this.config.WIDTH,
                this.config.CHART_PADDING_TOP,
                this.config.CHART_HEIGHT,
                this.config.BUBBLE_PADDING_FACTOR,
                false,
                showImages
            );

            // Update state with new bubbles
            if (this.stateVersion === currentVersion) {
                dispatch({
                    type: 'SET_BUBBLES',
                    payload: {
                        allBubbles: [...newAllBubbles],
                        clusters: [...newClusters],
                        singleBubbles: [...newSingleBubbles]
                    }
                });
                dispatch({ type: 'SET_STATUS', payload: 'ready' });
            }
        } catch (error) {
            if (this.stateVersion === currentVersion) {
                dispatch({ type: 'SET_STATUS', payload: 'error' });
                dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to update chart' });
            }
        } finally {
            // End transition
            this.isTransitioning = false;
        }
    }
} 