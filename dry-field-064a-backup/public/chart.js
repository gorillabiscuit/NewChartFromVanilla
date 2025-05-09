// --- Config ---
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const tooltip = document.getElementById('tooltip');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

// API endpoint configuration
const API_ENDPOINT = 'YOUR_API_ENDPOINT_HERE';

// Axis simulation
const repaymentBands = [500, 1000, 2000, 5000]; // Common repayments
const minAPR = 3; // %
const maxAPR = 15; // %

const minLoanAmount = 5000;  // $
const maxLoanAmount = 100000; // $

const minRadius = 5;
const maxRadius = 30;
const NUM_BUBBLES = 30;

// Physics settings
const SPRING_CONSTANT = 0.008;
const DAMPING = 0.75;
const OUTWARD_FORCE = 0.004;
const MAX_FRAMES = 60;
const REVERT_DELAY = 2000;
const REVERT_SPEED = 0.15;

const allBubbles = [];
const clusters = [];
const singleBubbles = [];
let mouseX = 0;
let mouseY = 0;

// --- Create Random Loan Bubble ---
function createLoanBubble() {
  const repaymentCenter = repaymentBands[Math.floor(Math.random() * repaymentBands.length)];
  const repayment = repaymentCenter + (Math.random() - 0.5) * 200;

  const apr = minAPR + Math.random() * (maxAPR - minAPR);
  const loanAmount = minLoanAmount + Math.random() * (maxLoanAmount - minLoanAmount);
  const radius = minRadius + (loanAmount - minLoanAmount) / (maxLoanAmount - minLoanAmount) * (maxRadius - minRadius);

  const x = repayment / 6000 * WIDTH;
  const y = HEIGHT - (apr - minAPR) / (maxAPR - minAPR) * HEIGHT;

  return { 
    x, y, r: radius, initialX: x, initialY: y, 
    repayment, apr, loanAmount,
    vx: 0, vy: 0, 
    showTooltip: true, visited: false 
  };
}

// --- Detect Overlaps and Form Clusters ---
function bubblesOverlap(b1, b2) {
  const dx = b1.x - b2.x;
  const dy = b1.y - b2.y;
  const dist = Math.hypot(dx, dy);
  return dist < (b1.r + b2.r) * 0.98;
}

function findClusters(bubbles) {
  const visited = new Set();
  
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

    if (cluster.length > 1) {
      clusters.push({ 
        bubbles: cluster, 
        state: "idle", 
        hovering: false, 
        revertTimer: null, 
        frameCount: 0 
      });
    } else {
      singleBubbles.push(cluster[0]);
    }
  }
}

// --- Physics Functions ---
function applySpringForces(cluster) {
  const bubbles = cluster.bubbles;
  for (let i = 0; i < bubbles.length; i++) {
    for (let j = i + 1; j < bubbles.length; j++) {
      const ci = bubbles[i];
      const cj = bubbles[j];

      const dx = cj.x - ci.x;
      const dy = cj.y - ci.y;
      const dist = Math.hypot(dx, dy) || 1e-6;

      const idealDist = ci.r + cj.r;
      const displacement = dist - idealDist;
      const nx = dx / dist;
      const ny = dy / dist;

      let force = SPRING_CONSTANT * displacement;

      if (displacement < 0) {
        force *= 3;
      }

      ci.vx += nx * force;
      ci.vy += ny * force;
      cj.vx -= nx * force;
      cj.vy -= ny * force;
    }
  }
}

function updateCluster(cluster) {
  const bubbles = cluster.bubbles;
  for (const c of bubbles) {
    c.x += c.vx;
    c.y += c.vy;
    c.vx *= DAMPING;
    c.vy *= DAMPING;
  }
}

function applyOutwardForce(cluster) {
  const centerX = WIDTH / 2;
  const centerY = HEIGHT / 2;
  for (const c of cluster.bubbles) {
    const dx = c.x - centerX;
    const dy = c.y - centerY;
    const dist = Math.hypot(dx, dy) || 1e-6;
    c.vx += (dx / dist) * OUTWARD_FORCE;
    c.vy += (dy / dist) * OUTWARD_FORCE;
  }
}

function revertClusterSmoothly(cluster) {
  let allClose = true;
  for (const b of cluster.bubbles) {
    b.x += (b.initialX - b.x) * REVERT_SPEED;
    b.y += (b.initialY - b.y) * REVERT_SPEED;

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

// --- Draw Axes ---
function drawAxes() {
    ctx.save();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    
    // Draw X axis
    ctx.beginPath();
    ctx.moveTo(0, HEIGHT);
    ctx.lineTo(WIDTH, HEIGHT);
    ctx.stroke();
    
    // Draw Y axis
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, HEIGHT);
    ctx.stroke();
    
    // Draw X axis ticks and labels
    const xTicks = [0, 2000, 4000, 6000];
    xTicks.forEach(tick => {
        const x = (tick / 6000) * WIDTH;
        ctx.beginPath();
        ctx.moveTo(x, HEIGHT);
        ctx.lineTo(x, HEIGHT + 5);
        ctx.stroke();
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.fillText(`$${tick}`, x, HEIGHT + 20);
    });
    
    // Draw Y axis ticks and labels
    const yTicks = [3, 6, 9, 12, 15];
    yTicks.forEach(tick => {
        const y = HEIGHT - ((tick - minAPR) / (maxAPR - minAPR)) * HEIGHT;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(-5, y);
        ctx.stroke();
        ctx.fillStyle = '#333';
        ctx.textAlign = 'right';
        ctx.fillText(`${tick}%`, -10, y + 4);
    });
    
    ctx.restore();
}

// --- API Integration ---
async function fetchLoanData() {
    try {
        const response = await fetch(API_ENDPOINT);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching loan data:', error);
        return null;
    }
}

// --- Create Loan Bubble from API Data ---
function createLoanBubbleFromData(data) {
    const x = data.repayment / 6000 * WIDTH;
    const y = HEIGHT - (data.apr - minAPR) / (maxAPR - minAPR) * HEIGHT;
    const radius = minRadius + (data.loanAmount - minLoanAmount) / (maxLoanAmount - minLoanAmount) * (maxRadius - minRadius);

    return {
        x, y, r: radius, initialX: x, initialY: y,
        repayment: data.repayment,
        apr: data.apr,
        loanAmount: data.loanAmount,
        vx: 0, vy: 0,
        showTooltip: true,
        visited: false
    };
}

// --- Initialize Chart ---
async function initializeChart() {
    const data = await fetchLoanData();
    if (data) {
        allBubbles.length = 0;
        clusters.length = 0;
        singleBubbles.length = 0;
        
        data.forEach(loan => {
            allBubbles.push(createLoanBubbleFromData(loan));
        });
        
        findClusters(allBubbles);
    } else {
        // Fallback to random data if API fails
        for (let i = 0; i < NUM_BUBBLES; i++) {
            allBubbles.push(createLoanBubble());
        }
        findClusters(allBubbles);
    }
}

// --- Modified Draw Function ---
function draw() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    
    // Draw axes first
    drawAxes();
    
    // Draw bubbles
    for (const b of singleBubbles) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(100, 200, 255, 0.6)';
        ctx.fill();
        ctx.strokeStyle = 'black';
        ctx.stroke();
    }

    for (const cluster of clusters) {
        for (const b of cluster.bubbles) {
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 150, 150, 0.6)';
            ctx.fill();
            ctx.strokeStyle = 'black';
            ctx.stroke();
        }
    }
}

// --- Mouse Handling ---
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;

    for (const cluster of clusters) {
        let hovering = false;
        for (const b of cluster.bubbles) {
            const dx = mouseX - b.x;
            const dy = mouseY - b.y;
            const dist = Math.hypot(dx, dy);
            if (dist < b.r) {
                hovering = true;
                break;
            }
        }

        if (hovering) {
            cluster.hovering = true;
            if (cluster.state === "idle") {
                cluster.state = "expanding";
                applyOutwardForce(cluster);
                cluster.frameCount = 0;
            }
            if (cluster.revertTimer) {
                clearTimeout(cluster.revertTimer);
                cluster.revertTimer = null;
            }
        } else {
            if (cluster.hovering) {
                cluster.hovering = false;
                if (!cluster.revertTimer) {
                    cluster.revertTimer = setTimeout(() => {
                        if (!cluster.hovering) {
                            cluster.state = "reverting";
                        }
                    }, REVERT_DELAY);
                }
            }
        }
    }
});

// --- Tooltip update ---
function updateTooltip() {
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
        tooltip.style.left = (closest.x + canvas.offsetLeft + 10) + "px";
        tooltip.style.top = (closest.y + canvas.offsetTop - 20) + "px";
        tooltip.innerText = `APR: ${closest.apr.toFixed(2)}%\nRepayment: $${closest.repayment.toFixed(0)}\nLoan: $${closest.loanAmount.toFixed(0)}`;
        tooltip.style.visibility = "visible";
    } else {
        tooltip.style.visibility = "hidden";
    }
}

// Initialize the chart
initializeChart();

// Modified animate function
function animate() {
    for (const cluster of clusters) {
        if (cluster.state === "expanding") {
            applySpringForces(cluster);
            updateCluster(cluster);
            cluster.frameCount++;
            if (cluster.frameCount >= MAX_FRAMES) {
                cluster.state = "expanded";
                for (const b of cluster.bubbles) {
                    b.showTooltip = true;
                }
            }
        } else if (cluster.state === "reverting") {
            revertClusterSmoothly(cluster);
        }
    }

    draw();
    updateTooltip();
    requestAnimationFrame(animate);
}

// Start animation
animate(); 