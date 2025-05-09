import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface LoanBubbleChartProps {
  onLoanSelect?: (loan: {
    loanId: string;
    name: string;
    protocol: string;
    apr: number;
    repayment: number;
    dueTime: string;
    principalAmountUSD: number;
    imageUrl: string;
  }) => void;
  walletAddress?: string;
  showImages?: boolean;
}

export const LoanBubbleChart: React.FC<LoanBubbleChartProps> = ({
  onLoanSelect,
  walletAddress,
  showImages = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [selectedLoan, setSelectedLoan] = useState<any>(null);

  // Initialize chart
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Copy all the existing chart logic here, but modify the click handler
    const handleClick = (e: MouseEvent) => {
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
        setSelectedLoan(clickedBubble);
        
        // Emit to Lovable
        onLoanSelect?.({
          loanId: clickedBubble.loanId,
          name: clickedBubble.name,
          protocol: clickedBubble.protocol,
          apr: clickedBubble.apr,
          repayment: clickedBubble.repayment,
          dueTime: clickedBubble.dueTime,
          principalAmountUSD: clickedBubble.loanAmount,
          imageUrl: clickedBubble.imageUrl
        });
        
        // Redraw to show selection
        draw();
      }
    };

    canvas.addEventListener('click', handleClick);
    return () => canvas.removeEventListener('click', handleClick);
  }, [onLoanSelect]);

  return (
    <div className="app">
      <div className="chart-wrapper">
        <canvas ref={canvasRef} />
        <div ref={tooltipRef} id="tooltip" />
      </div>
    </div>
  );
}; 