class CanvasRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        
        // Constants
        this.MARGIN = { top: 20, right: 20, bottom: 30, left: 60 };
        this.TICK_LENGTH = 5;
        this.TICK_PADDING = 3;
        this.AXIS_LINE_WIDTH = 1;
        this.AXIS_COLOR = '#666';
        this.TICK_COLOR = '#666';
        this.TICK_FONT = '10px Arial';
        this.TICK_FILL = '#666';
        this.GRID_COLOR = '#eee';
        this.GRID_LINE_WIDTH = 0.5;
    }

    /**
     * Main render method that orchestrates all drawing operations
     * @param {Object} data - Contains bubbles and other data to render
     * @param {Object} state - Current visualization state (filters, layout, etc)
     */
    render(data, state) {
        const { bubbles, xScale, yScale, xDomain, yDomain } = data;
        const { showImages, selectedProtocol, selectedCollection } = state;

        // Clear canvas
        this.clear();

        // Draw background
        this.drawBackground();

        // Draw grid
        this.drawGrid(xScale, yScale, xDomain, yDomain);

        // Draw axes
        this.drawAxes(xScale, yScale, xDomain, yDomain);

        // Draw bubbles
        this.drawBubbles(bubbles, showImages, selectedProtocol, selectedCollection);
    }

    /**
     * Clear the canvas
     */
    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    /**
     * Draw the background
     */
    drawBackground() {
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    /**
     * Draw the grid lines
     */
    drawGrid(xScale, yScale, xDomain, yDomain) {
        this.ctx.strokeStyle = this.GRID_COLOR;
        this.ctx.lineWidth = this.GRID_LINE_WIDTH;

        // Draw vertical grid lines
        const xTicks = this.generateDateTicks(xDomain[0], xDomain[1]);
        xTicks.forEach(tick => {
            const x = xScale(tick);
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.MARGIN.top);
            this.ctx.lineTo(x, this.height - this.MARGIN.bottom);
            this.ctx.stroke();
        });

        // Draw horizontal grid lines
        const yTicks = this.generateAprTicks(yDomain[0], yDomain[1]);
        yTicks.forEach(tick => {
            const y = yScale(tick);
            this.ctx.beginPath();
            this.ctx.moveTo(this.MARGIN.left, y);
            this.ctx.lineTo(this.width - this.MARGIN.right, y);
            this.ctx.stroke();
        });
    }

    /**
     * Draw the axes and their labels
     */
    drawAxes(xScale, yScale, xDomain, yDomain) {
        this.ctx.strokeStyle = this.AXIS_COLOR;
        this.ctx.lineWidth = this.AXIS_LINE_WIDTH;
        this.ctx.font = this.TICK_FONT;
        this.ctx.fillStyle = this.TICK_FILL;
        this.ctx.textAlign = 'center';

        // Draw x-axis
        this.ctx.beginPath();
        this.ctx.moveTo(this.MARGIN.left, this.height - this.MARGIN.bottom);
        this.ctx.lineTo(this.width - this.MARGIN.right, this.height - this.MARGIN.bottom);
        this.ctx.stroke();

        // Draw x-axis ticks and labels
        const xTicks = this.generateDateTicks(xDomain[0], xDomain[1]);
        xTicks.forEach(tick => {
            const x = xScale(tick);
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.height - this.MARGIN.bottom);
            this.ctx.lineTo(x, this.height - this.MARGIN.bottom + this.TICK_LENGTH);
            this.ctx.stroke();
            this.ctx.fillText(
                this.formatDate(tick),
                x,
                this.height - this.MARGIN.bottom + this.TICK_LENGTH + this.TICK_PADDING + 10
            );
        });

        // Draw y-axis
        this.ctx.beginPath();
        this.ctx.moveTo(this.MARGIN.left, this.MARGIN.top);
        this.ctx.lineTo(this.MARGIN.left, this.height - this.MARGIN.bottom);
        this.ctx.stroke();

        // Draw y-axis ticks and labels
        const yTicks = this.generateAprTicks(yDomain[0], yDomain[1]);
        yTicks.forEach(tick => {
            const y = yScale(tick);
            this.ctx.beginPath();
            this.ctx.moveTo(this.MARGIN.left, y);
            this.ctx.lineTo(this.MARGIN.left - this.TICK_LENGTH, y);
            this.ctx.stroke();
            this.ctx.textAlign = 'right';
            this.ctx.fillText(
                `${tick}%`,
                this.MARGIN.left - this.TICK_LENGTH - this.TICK_PADDING,
                y + 4
            );
        });
    }

    /**
     * Draw the bubbles
     */
    drawBubbles(bubbles, showImages, selectedProtocol, selectedCollection) {
        bubbles.forEach(bubble => {
            if (selectedProtocol && bubble.protocol !== selectedProtocol) return;
            if (selectedCollection && bubble.collection !== selectedCollection) return;

            if (showImages && bubble.image) {
                this.drawImageBubble(bubble);
            } else {
                this.drawColorBubble(bubble);
            }
        });
    }

    /**
     * Draw a bubble with an image
     */
    drawImageBubble(bubble) {
        const { x, y, radius, image } = bubble;
        
        // Draw circle
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.clip();

        // Draw image
        this.ctx.drawImage(
            image,
            x - radius,
            y - radius,
            radius * 2,
            radius * 2
        );

        // Reset clip
        this.ctx.restore();
    }

    /**
     * Draw a bubble with a color
     */
    drawColorBubble(bubble) {
        const { x, y, radius, color } = bubble;
        
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();
    }

    /**
     * Generate date ticks for the x-axis
     */
    generateDateTicks(start, stop) {
        const span = stop - start;
        const step = this.calculateDateStep(span);
        const ticks = [];
        
        let current = new Date(Math.ceil(start / step) * step);
        while (current <= stop) {
            ticks.push(current.getTime());
            current = this.addTimeStep(current, step);
        }

        // Only add stop date if it's far enough from the last tick
        if (ticks.length === 0 || (stop - ticks[ticks.length - 1]) > span / 8) {
            ticks.push(stop);
        }

        return ticks;
    }

    /**
     * Calculate appropriate step size for date ticks
     */
    calculateDateStep(span) {
        const day = 24 * 60 * 60 * 1000;
        const hour = 60 * 60 * 1000;
        
        if (span > 90 * day) return 30 * day;
        if (span > 30 * day) return 7 * day;
        if (span > 7 * day) return day;
        if (span > 2 * day) return 12 * hour;
        if (span > day) return 6 * hour;
        if (span > 12 * hour) return 3 * hour;
        if (span > 6 * hour) return hour;
        return 30 * 60 * 1000;
    }

    /**
     * Add time step to a date
     */
    addTimeStep(date, step) {
        return new Date(date.getTime() + step);
    }

    /**
     * Generate APR ticks for the y-axis
     */
    generateAprTicks(start, stop) {
        const span = stop - start;
        const step = this.calculateAprStep(span);
        const ticks = [];
        
        let current = Math.ceil(start / step) * step;
        while (current <= stop) {
            ticks.push(current);
            current += step;
        }

        return ticks;
    }

    /**
     * Calculate appropriate step size for APR ticks
     */
    calculateAprStep(span) {
        if (span > 50) return 10;
        if (span > 20) return 5;
        if (span > 10) return 2;
        if (span > 5) return 1;
        return 0.5;
    }

    /**
     * Format date for display
     */
    formatDate(timestamp) {
        const date = new Date(timestamp);
        const span = this.width - this.MARGIN.left - this.MARGIN.right;
        
        if (span > 800) {
            return date.toLocaleString();
        } else if (span > 400) {
            return date.toLocaleDateString();
        } else {
            return date.toLocaleTimeString();
        }
    }
}

export default CanvasRenderer; 