// --- Core Architecture ---
class EventEmitter {
    constructor() {
        this.events = {};
    }

    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    async emit(event, ...args) {
        if (!this.events[event]) return;
        for (const callback of this.events[event]) {
            await callback(...args);
        }
    }
}

class Logger {
    constructor(module) {
        this.module = module;
    }

    debug(...args) {
        console.debug(`[${this.module}]`, ...args);
    }

    info(...args) {
        console.info(`[${this.module}]`, ...args);
    }

    error(...args) {
        console.error(`[${this.module}]`, ...args);
    }
}

class VisualizationManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.logger = new Logger('VisualizationManager');
        this.events = new EventEmitter();
        
        // State
        this.bubbles = [];
        this.showImages = false;
        
        // Layout constants
        this.WIDTH = canvas.width;
        this.HEIGHT = canvas.height;
        this.CHART_HEIGHT = Math.round(this.HEIGHT * 0.88);
        this.CHART_PADDING_X = 80;
        this.CHART_PADDING_TOP = Math.round(this.HEIGHT * 0.03);
        this.CHART_PADDING_BOTTOM = Math.round(this.HEIGHT * 0.09);
        this.TICK_LENGTH = 6;
        
        // Physics constants
        this.MAX_FRAMES = 30;
        this.PROTOCOL_COLORS = {
            'aave': '#B6509E',
            'compound': '#00D395',
            'maker': '#1AAB9B',
            'morpho': '#FFB300',
            'spark': '#FFB300'
        };
        this.DEFAULT_PROTOCOL_COLOR = '#FFB300';
    }

    generateAPRTicks(min, max) {
        const span = max - min;
        if (span === 0) return [min];
        
        const step = Math.pow(10, Math.floor(Math.log10(span / 8)));
        const err = 8 / (span / step);
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

    generateDateTicks(start, stop) {
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
            step = Math.ceil(span / msHour / 8);
            unit = 'hour';
            format = d => d.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'});
        } else if (span < msDay * 2) {
            step = Math.ceil(span / msHour / 8);
            unit = 'hour';
            format = d => d.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'});
        } else if (span < msWeek * 2) {
            step = Math.ceil(span / msDay / 8);
            unit = 'day';
            format = d => d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
        } else if (span < msMonth * 2) {
            step = Math.ceil(span / msDay / 8 * 2);
            unit = 'day';
            format = d => d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
        } else if (span < msYear) {
            step = Math.ceil(span / msMonth / 8);
            unit = 'month';
            format = d => d.toLocaleDateString('en-US', {month: 'short', year: '2-digit'});
        } else {
            step = Math.ceil(span / msYear / 8);
            unit = 'year';
            format = d => d.getFullYear();
        }
        
        const ticks = [];
        let d = new Date(start);
        d.setSeconds(0, 0);
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
        
        // Only add the stop date if:
        // 1. We have no ticks (edge case)
        // 2. The last tick is far enough from the stop date (more than 1/4 of the step)
        if (ticks.length === 0 || (stop - ticks[ticks.length-1].getTime()) > (span / 8)) {
            ticks.push(new Date(stop));
        }
        
        return { ticks, format };
    }

    drawAxes() {
        const ctx = this.ctx;
        const { WIDTH, HEIGHT, CHART_PADDING_X, CHART_PADDING_TOP, CHART_HEIGHT, TICK_LENGTH } = this;

        // Draw Y-axis APR ticks and grid lines
        const aprTicks = this.generateAPRTicks(0, 100);
        for (const tick of aprTicks) {
            const y = CHART_HEIGHT - (tick / 100) * (CHART_HEIGHT - CHART_PADDING_TOP);
            ctx.beginPath();
            ctx.moveTo(CHART_PADDING_X - TICK_LENGTH, y);
            ctx.lineTo(CHART_PADDING_X, y);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${tick.toFixed(2)}%`, CHART_PADDING_X - 8, y);
        }

        // Draw X-axis date ticks and grid lines
        const dateTicks = this.generateDateTicks(new Date(2020, 0, 1), new Date());
        for (const tick of dateTicks.ticks) {
            const x = CHART_PADDING_X + (tick.getTime() - new Date(2020, 0, 1).getTime()) / (new Date().getTime() - new Date(2020, 0, 1).getTime()) * (WIDTH - CHART_PADDING_X * 2);
            ctx.beginPath();
            ctx.moveTo(x, CHART_HEIGHT);
            ctx.lineTo(x, CHART_HEIGHT + TICK_LENGTH);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(dateTicks.format(tick), x, CHART_HEIGHT + 8);
        }
    }

    async update(filters) {
        this.logger.debug('Updating visualization with filters:', filters);
        try {
            // For testing, let's create some sample bubbles
            this.bubbles = [];
            const protocols = Object.keys(this.PROTOCOL_COLORS);
            
            // Create 20 random bubbles
            for (let i = 0; i < 20; i++) {
                const protocol = protocols[Math.floor(Math.random() * protocols.length)];
                const apr = Math.random() * 100;
                const date = new Date(2020, 0, 1 + Math.floor(Math.random() * 1000));
                
                this.bubbles.push({
                    x: this.CHART_PADDING_X + Math.random() * (this.WIDTH - 2 * this.CHART_PADDING_X),
                    y: this.CHART_PADDING_TOP + Math.random() * (this.CHART_HEIGHT - this.CHART_PADDING_TOP),
                    r: 10 + Math.random() * 20,
                    protocol,
                    apr,
                    dueTime: date,
                    name: `Loan ${i + 1}`,
                    imageUrl: 'https://via.placeholder.com/56x56.png?text=NFT',
                    img: null,
                    imgLoaded: false
                });
            }

            // Load images if showImages is true
            if (this.showImages) {
                for (const bubble of this.bubbles) {
                    bubble.img = new Image();
                    bubble.img.crossOrigin = "anonymous";
                    bubble.img.src = bubble.imageUrl;
                    bubble.img.onload = () => {
                        bubble.imgLoaded = true;
                        this.draw();
                    };
                }
            }

            this.draw();
        } catch (error) {
            this.logger.error('Error updating visualization:', error);
            throw error;
        }
    }

    draw() {
        const ctx = this.ctx;
        const { WIDTH, HEIGHT, CHART_PADDING_X, CHART_PADDING_TOP, CHART_HEIGHT, TICK_LENGTH } = this;

        // Clear canvas
        ctx.clearRect(0, 0, WIDTH, HEIGHT);

        // Draw background
        ctx.fillStyle = '#221E37';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // Draw chart area
        ctx.fillStyle = '#2A2540';
        ctx.fillRect(CHART_PADDING_X, CHART_PADDING_TOP, WIDTH - CHART_PADDING_X * 2, CHART_HEIGHT - CHART_PADDING_TOP);

        // Draw axes
        this.drawAxes();

        // Draw bubbles
        for (const bubble of this.bubbles) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(bubble.x, bubble.y, bubble.r, 0, Math.PI * 2);
            
            if (this.showImages && bubble.img && bubble.imgLoaded) {
                ctx.clip();
                ctx.drawImage(bubble.img, bubble.x - bubble.r, bubble.y - bubble.r, bubble.r * 2, bubble.r * 2);
            } else {
                ctx.fillStyle = this.PROTOCOL_COLORS[bubble.protocol] || this.DEFAULT_PROTOCOL_COLOR;
                ctx.globalAlpha = 0.65;
                ctx.fill();
                ctx.globalAlpha = 1.0;
            }
            
            ctx.restore();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    resize() {
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        const dpr = window.devicePixelRatio || 1;

        this.canvas.width = Math.round(containerWidth * dpr);
        this.canvas.height = Math.round(containerHeight * dpr);
        this.canvas.style.width = containerWidth + 'px';
        this.canvas.style.height = containerHeight + 'px';

        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(dpr, dpr);

        this.WIDTH = containerWidth;
        this.HEIGHT = containerHeight;
        this.CHART_HEIGHT = Math.round(this.HEIGHT * 0.88);
        this.CHART_PADDING_X = 80;
        this.CHART_PADDING_TOP = Math.round(this.HEIGHT * 0.03);
        this.CHART_PADDING_BOTTOM = Math.round(this.HEIGHT * 0.09);

        this.draw();
    }
}

// Export the classes
window.EventEmitter = EventEmitter;
window.Logger = Logger;
window.VisualizationManager = VisualizationManager; 