class PhysicsEngine {
    constructor() {
        this.bubbles = [];
        this.isRunning = false;
        this.animationFrameId = null;
        this.targetPositions = new Map();
        this.originalPositions = new Map();
        
        // Physics constants
        this.SPRING_CONSTANT = 0.1;
        this.DAMPING = 0.8;
        this.ATTRACTION = 0.1;
        this.REPULSION = 1000;
        this.MAX_FORCE = 10;
        this.CLUSTER_RADIUS = 100;
    }

    setBubbles(bubbles) {
        this.bubbles = bubbles;
        // Store original positions
        bubbles.forEach(bubble => {
            this.originalPositions.set(bubble.id, { x: bubble.x, y: bubble.y });
        });
    }

    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.tick();
        }
    }

    stop() {
        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    reset() {
        this.bubbles.forEach(bubble => {
            const originalPos = this.originalPositions.get(bubble.id);
            if (originalPos) {
                bubble.x = originalPos.x;
                bubble.y = originalPos.y;
                bubble.vx = 0;
                bubble.vy = 0;
            }
        });
        this.targetPositions.clear();
    }

    setTargetPositions(positions) {
        this.targetPositions = new Map(positions);
    }

    applyForces() {
        // Apply spring forces between bubbles
        for (let i = 0; i < this.bubbles.length; i++) {
            const bubble = this.bubbles[i];
            
            // Reset forces
            let fx = 0;
            let fy = 0;

            // Apply attraction to target position if exists
            const targetPos = this.targetPositions.get(bubble.id);
            if (targetPos) {
                const dx = targetPos.x - bubble.x;
                const dy = targetPos.y - bubble.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 0.1) {
                    const force = Math.min(this.ATTRACTION * distance, this.MAX_FORCE);
                    fx += (dx / distance) * force;
                    fy += (dy / distance) * force;
                }
            }

            // Apply repulsion between bubbles
            for (let j = 0; j < this.bubbles.length; j++) {
                if (i === j) continue;
                
                const other = this.bubbles[j];
                const dx = bubble.x - other.x;
                const dy = bubble.y - other.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const minDist = bubble.r + other.r;
                
                if (distance < minDist) {
                    const force = this.REPULSION / (distance * distance);
                    fx += (dx / distance) * force;
                    fy += (dy / distance) * force;
                }
            }

            // Apply damping
            bubble.vx *= this.DAMPING;
            bubble.vy *= this.DAMPING;

            // Update velocity and position
            bubble.vx += fx;
            bubble.vy += fy;
            bubble.x += bubble.vx;
            bubble.y += bubble.vy;
        }
    }

    tick() {
        if (!this.isRunning) return;

        this.applyForces();
        this.animationFrameId = requestAnimationFrame(() => this.tick());
    }

    // Helper method to calculate cluster positions
    calculateClusterPositions(hoveredBubble) {
        if (!hoveredBubble) return new Map();

        const positions = new Map();
        const centerX = hoveredBubble.x;
        const centerY = hoveredBubble.y;

        this.bubbles.forEach(bubble => {
            if (bubble.id === hoveredBubble.id) {
                positions.set(bubble.id, { x: centerX, y: centerY });
                return;
            }

            const dx = bubble.x - centerX;
            const dy = bubble.y - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);

            // Calculate new position in a circle around the hovered bubble
            const newDistance = this.CLUSTER_RADIUS;
            const newX = centerX + Math.cos(angle) * newDistance;
            const newY = centerY + Math.sin(angle) * newDistance;

            positions.set(bubble.id, { x: newX, y: newY });
        });

        return positions;
    }
}

// Export the class
window.PhysicsEngine = PhysicsEngine; 