// LoanBubbleChart Component for Lovable
// This is a self-contained version of the chart that can be copied directly into Lovable

// --- Dependencies ---
// Make sure to add these in Lovable:
// - d3.js (v7)
// - The following CSS classes (copy from the original index.html)

// --- Component Structure ---
// In Lovable, create a new component with this structure:
/*
<div class="app">
    <button id="imageToggle" class="toggle-button">Show Images</button>
    <div class="chart-wrapper">
        <canvas id="canvas"></canvas>
        <div id="tooltip"></div>
    </div>
</div>
*/

// --- Chart Configuration ---
const CHART_CONFIG = {
    // Layout
    CHART_HEIGHT_RATIO: 0.88,
    CHART_PADDING_X: 24,
    CHART_PADDING_TOP_RATIO: 0.03,
    CHART_PADDING_BOTTOM_RATIO: 0.09,
    
    // Axis
    DATE_TICK_COUNT: 12,
    TICK_LENGTH: 5,
    TICK_PADDING: 5,
    
    // Bubble Sizing
    MIN_PADDING_PERCENT: 0.05,
    MAX_PADDING_PERCENT: 0.1,
    BUBBLE_PADDING_FACTOR: 1.2,
    
    // Physics
    BASE_REPULSION: 0.008,
    REPULSION_POWER: 0.5,
    REPULSION_CLUSTER_CAP: 6,
    OUTWARD_FORCE: 0.004,
    OUTWARD_FORCE_DIVISOR: 3,
    OUTWARD_FORCE_POWER: 0.5,
    OUTWARD_CLUSTER_CAP: 6,
    SPRING_CONSTANT: 0.008,
    CLUSTER_SCALE_DIVISOR: 3,
    OVERLAP_SCALE: 0.3,
    OVERLAP_FORCE_MULTIPLIER: 3,
    BASE_VELOCITY: 0.2,
    VELOCITY_POWER: 0.9,
    MAX_FRAMES: 60,
    REVERT_DELAY: 2000,
    REVERT_SPEED: 0.15,
    BASE_DAMPING: 0.75,
    EXTRA_DAMPING: 0.15,
    DAMPING_CLUSTER_THRESHOLD: 6
};

// --- Protocol Colors ---
const PROTOCOL_COLORS = {
    'NFTfi': '#D14D8A',
    'Gondi': '#FFE082',
    'X2Y2': '#D1A06F',
    'Zharta': '#5EC6A6',
    'Arcade': '#5B8DB8',
    'Metastreet': '#A3C8F5',
    'Blend': '#B18CFF'
};
const DEFAULT_PROTOCOL_COLOR = '#888888';

// --- Chart State ---
let allBubbles = [];
let clusters = [];
let singleBubbles = [];
let mouseX = 0;
let mouseY = 0;
let PADDED_MIN_DATE = null;
let PADDED_MAX_DATE = null;
let showImages = false;

// --- Chart Initialization ---
function initializeChart(canvas, tooltip) {
    const ctx = canvas.getContext('2d');
    let WIDTH = canvas.width;
    let HEIGHT = canvas.height;
    let CHART_HEIGHT = Math.round(HEIGHT * CHART_CONFIG.CHART_HEIGHT_RATIO);
    
    // Add click handler for Lovable integration
    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        
        let clickedBubble = null;
        let closestDist = Infinity;
        
        // Check single bubbles
        for (const b of singleBubbles) {
            const dx = clickX - b.x;
            const dy = clickY - b.y;
            const dist = Math.hypot(dx, dy);
            if (dist < b.r && dist < closestDist) {
                clickedBubble = b;
                closestDist = dist;
            }
        }
        
        // Check clustered bubbles
        for (const cluster of clusters) {
            for (const b of cluster.bubbles) {
                const dx = clickX - b.x;
                const dy = clickY - b.y;
                const dist = Math.hypot(dx, dy);
                if (dist < b.r && dist < closestDist) {
                    clickedBubble = b;
                    closestDist = dist;
                }
            }
        }
        
        if (clickedBubble) {
            // Clear previous selection
            for (const b of allBubbles) {
                b.selected = false;
            }
            
            // Set new selection
            clickedBubble.selected = true;
            
            // Emit to Lovable
            // Replace this with your Lovable event emission
            window.dispatchEvent(new CustomEvent('loanSelected', {
                detail: {
                    loanId: clickedBubble.loanId,
                    name: clickedBubble.name,
                    protocol: clickedBubble.protocol,
                    apr: clickedBubble.apr,
                    repayment: clickedBubble.repayment,
                    dueTime: clickedBubble.dueTime,
                    principalAmountUSD: clickedBubble.loanAmount,
                    imageUrl: clickedBubble.imageUrl
                }
            }));
            
            // Redraw to show selection
            draw();
        }
    });

    // Add image toggle handler
    const imageToggle = document.getElementById('imageToggle');
    if (imageToggle) {
        imageToggle.addEventListener('click', () => {
            showImages = !showImages;
            imageToggle.textContent = showImages ? 'Hide Images' : 'Show Images';
            imageToggle.classList.toggle('active', showImages);
            draw();
        });
    }

    // Start animation loop
    function animate() {
        for (const cluster of clusters) {
            if (cluster.state === "expanding") {
                if (!cluster.packedInitialized) {
                    packClusterBubbles(cluster);
                    cluster.packedInitialized = true;
                }
                animateClusterToPacked(cluster, 0.18);
                cluster.frameCount++;
                if (cluster.frameCount >= CHART_CONFIG.MAX_FRAMES) {
                    cluster.state = "expanded";
                    for (const b of cluster.bubbles) {
                        b.showTooltip = true;
                    }
                }
            } else if (cluster.state === "reverting") {
                revertClusterSmoothly(cluster);
                cluster.packedInitialized = false;
            }
        }
        draw();
        updateTooltip();
        requestAnimationFrame(animate);
    }

    // Start animation
    animate();

    // Handle resize
    function resizeChart() {
        const container = document.querySelector('.chart-wrapper');
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(containerWidth * dpr);
        canvas.height = Math.round(containerHeight * dpr);
        canvas.style.width = containerWidth + 'px';
        canvas.style.height = containerHeight + 'px';
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
        WIDTH = containerWidth;
        HEIGHT = containerHeight;
        CHART_HEIGHT = Math.round(HEIGHT * CHART_CONFIG.CHART_HEIGHT_RATIO);
        draw();
    }

    window.addEventListener('resize', resizeChart);
    resizeChart();
}

// --- Data Loading ---
async function fetchLoanData(walletAddress) {
    try {
        let url;
        if (walletAddress === '__ALL__') {
            url = `https://theta-sdk-api.nftfi.com/data/v0/pipes/loans_due_endpoint.json?daysFromNow=30&page_size=1000000&page=0`;
        } else {
            url = `https://theta-sdk-api.nftfi.com/data/v0/pipes/loans_due_endpoint.json?daysFromNow=30&page_size=1000000&borrowerAddress=${walletAddress}&page=0`;
        }
        const response = await fetch(url);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching loan data:', error);
        return null;
    }
}

// --- Integration Instructions ---
/*
To integrate this chart into Lovable:

1. Copy the CSS from the original index.html into your Lovable styles

2. Create a new component in Lovable with the HTML structure shown above

3. Copy this entire file into your Lovable component

4. Initialize the chart in your component's mounted/ready handler:
   initializeChart(document.getElementById('canvas'), document.getElementById('tooltip'));

5. Listen for loan selection events:
   window.addEventListener('loanSelected', (e) => {
     const loan = e.detail;
     // Handle the selected loan in your Lovable app
   });

6. To load data for a specific wallet:
   fetchLoanData(walletAddress).then(data => {
     if (data?.data?.length > 0) {
       useLoanDataForBubbles(data.data);
     }
   });
*/

// --- Note: Copy all the remaining functions from the original chart ---
// (draw, updateTooltip, createLoanBubbleFromAPI, findClusters, etc.)
// They should be copied exactly as they are in the original file 