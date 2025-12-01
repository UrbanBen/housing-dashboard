"use client";

import React, { useState } from 'react';

interface SankeyNode {
  id: string;
  name: string;
  value: number;
  color: string;
  stage: number;
  y: number;
  height: number;
}

interface SankeyFlow {
  source: string;
  target: string;
  value: number;
  color: string;
}

export function HousingSankeyChart() {
  const [hoveredFlow, setHoveredFlow] = useState<string | null>(null);

  // Enhanced housing pipeline data with detailed breakdowns
  const nodes: SankeyNode[] = [
    // Stage 1: Released Land
    { id: 'greenfield', name: 'Greenfield', value: 16800, color: '#22c55e', stage: 0, y: 80, height: 0 },
    { id: 'infill', name: 'Infill', value: 11650, color: '#6b7280', stage: 0, y: 180, height: 0 },
    
    // Stage 2: DA Determinations  
    { id: 'da_approved', name: 'DA Approved', value: 22150, color: '#3b82f6', stage: 1, y: 80, height: 0 },
    { id: 'da_rejected', name: 'DA Rejected', value: 6300, color: '#ef4444', stage: 1, y: 200, height: 0 },
    
    // Stage 3: Building Approvals by Type
    { id: 'standalone_approved', name: 'Stand Alone\nApproved', value: 11200, color: '#8b5cf6', stage: 2, y: 60, height: 0 },
    { id: 'townhouse_approved', name: 'Townhouse\nApproved', value: 4850, color: '#a855f7', stage: 2, y: 120, height: 0 },
    { id: 'multiunit_approved', name: 'Multi-Unit\nApproved', value: 6100, color: '#c084fc', stage: 2, y: 180, height: 0 },
    
    // Stage 4: Construction Started by Type
    { id: 'standalone_started', name: 'Stand Alone\nStarted', value: 9450, color: '#f59e0b', stage: 3, y: 60, height: 0 },
    { id: 'townhouse_started', name: 'Townhouse\nStarted', value: 3920, color: '#f59e0b', stage: 3, y: 120, height: 0 },
    { id: 'multiunit_started', name: 'Multi-Unit\nStarted', value: 4680, color: '#f59e0b', stage: 3, y: 180, height: 0 },
    
    // Stage 5: Construction Completed by Type
    { id: 'standalone_completed', name: 'Stand Alone\nCompleted', value: 7890, color: '#10b981', stage: 4, y: 60, height: 0 },
    { id: 'townhouse_completed', name: 'Townhouse\nCompleted', value: 3240, color: '#10b981', stage: 4, y: 120, height: 0 },
    { id: 'multiunit_completed', name: 'Multi-Unit\nCompleted', value: 3850, color: '#10b981', stage: 4, y: 180, height: 0 },
  ];

  // Calculate node heights based on values
  const maxValue = Math.max(...nodes.map(n => n.value));
  nodes.forEach(node => {
    node.height = Math.max(15, (node.value / maxValue) * 100);
  });

  const flows: SankeyFlow[] = [
    // Released Land to DA Process
    { source: 'greenfield', target: 'da_approved', value: 13200, color: '#22c55e' },
    { source: 'greenfield', target: 'da_rejected', value: 3600, color: '#ef4444' },
    { source: 'infill', target: 'da_approved', value: 8950, color: '#6b7280' },
    { source: 'infill', target: 'da_rejected', value: 2700, color: '#ef4444' },
    
    // DA Approved to Building Approvals
    { source: 'da_approved', target: 'standalone_approved', value: 11200, color: '#8b5cf6' },
    { source: 'da_approved', target: 'townhouse_approved', value: 4850, color: '#a855f7' },
    { source: 'da_approved', target: 'multiunit_approved', value: 6100, color: '#c084fc' },
    
    // Building Approvals to Construction Started
    { source: 'standalone_approved', target: 'standalone_started', value: 9450, color: '#f59e0b' },
    { source: 'townhouse_approved', target: 'townhouse_started', value: 3920, color: '#f59e0b' },
    { source: 'multiunit_approved', target: 'multiunit_started', value: 4680, color: '#f59e0b' },
    
    // Construction Started to Completed
    { source: 'standalone_started', target: 'standalone_completed', value: 7890, color: '#10b981' },
    { source: 'townhouse_started', target: 'townhouse_completed', value: 3240, color: '#10b981' },
    { source: 'multiunit_started', target: 'multiunit_completed', value: 3850, color: '#10b981' },
  ];

  const getNodeById = (id: string): SankeyNode => {
    return nodes.find(n => n.id === id)!;
  };

  const createSankeyPath = (flow: SankeyFlow): string => {
    const sourceNode = getNodeById(flow.source);
    const targetNode = getNodeById(flow.target);
    
    const sourceX = 50 + (sourceNode.stage * 180) + 120; // Right edge of source
    const targetX = 50 + (targetNode.stage * 180); // Left edge of target
    const sourceY = sourceNode.y + (sourceNode.height / 2);
    const targetY = targetNode.y + (targetNode.height / 2);
    
    const flowHeight = Math.max(2, (flow.value / maxValue) * 60);
    
    // Control points for smooth curves
    const cp1X = sourceX + 60;
    const cp1Y = sourceY;
    const cp2X = targetX - 60;
    const cp2Y = targetY;
    
    // Create path with proper thickness
    const topPath = `M ${sourceX} ${sourceY - flowHeight/2} 
                     C ${cp1X} ${cp1Y - flowHeight/2}, ${cp2X} ${cp2Y - flowHeight/2}, ${targetX} ${targetY - flowHeight/2}`;
    const bottomPath = `L ${targetX} ${targetY + flowHeight/2}
                       C ${cp2X} ${cp2Y + flowHeight/2}, ${cp1X} ${cp1Y + flowHeight/2}, ${sourceX} ${sourceY + flowHeight/2} Z`;
    
    return topPath + bottomPath;
  };

  const stageLabels = [
    'Released Land',
    'DA Determinations', 
    'Building Approvals',
    'Construction Started',
    'Construction Completed'
  ];

  return (
    <div className="w-full h-full relative bg-gradient-to-br from-background to-muted/20">
      <svg viewBox="0 0 950 320" className="w-full h-full">
        {/* Background grid */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.1"/>
          </pattern>
          
          {/* Gradients for flows */}
          {flows.map((flow, index) => {
            const sourceNode = getNodeById(flow.source);
            const targetNode = getNodeById(flow.target);
            return (
              <linearGradient key={`grad-${index}`} id={`flow-gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={sourceNode.color} stopOpacity="0.8" />
                <stop offset="50%" stopColor={flow.color} stopOpacity="0.6" />
                <stop offset="100%" stopColor={targetNode.color} stopOpacity="0.8" />
              </linearGradient>
            );
          })}
        </defs>
        
        <rect width="950" height="320" fill="url(#grid)" />
        
        {/* Stage background areas */}
        {stageLabels.map((label, index) => (
          <g key={`stage-${index}`}>
            <rect
              x={50 + (index * 180) - 10}
              y={40}
              width={140}
              height={240}
              fill="hsl(var(--muted))"
              fillOpacity="0.05"
              rx="8"
              stroke="hsl(var(--border))"
              strokeOpacity="0.1"
              strokeWidth="1"
            />
            <text
              x={50 + (index * 180) + 60}
              y={30}
              textAnchor="middle"
              fontSize="12"
              fontWeight="bold"
              fill="hsl(var(--foreground))"
              className="drop-shadow-sm"
            >
              {label}
            </text>
          </g>
        ))}
        
        {/* Flow paths */}
        {flows.map((flow, index) => (
          <path
            key={`flow-${index}`}
            d={createSankeyPath(flow)}
            fill={`url(#flow-gradient-${index})`}
            opacity={hoveredFlow === `flow-${index}` ? 0.9 : 0.7}
            className="transition-all duration-300 cursor-pointer filter drop-shadow-sm"
            onMouseEnter={() => setHoveredFlow(`flow-${index}`)}
            onMouseLeave={() => setHoveredFlow(null)}
          />
        ))}
        
        {/* Nodes */}
        {nodes.map((node, index) => (
          <g key={node.id}>
            {/* Node shadow */}
            <rect
              x={52 + (node.stage * 180)}
              y={node.y + 2}
              width={116}
              height={node.height}
              fill="rgba(0,0,0,0.1)"
              rx="6"
            />
            
            {/* Node rectangle */}
            <rect
              x={50 + (node.stage * 180)}
              y={node.y}
              width={120}
              height={node.height}
              fill={node.color}
              rx="6"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="1"
              className="transition-all duration-200 filter drop-shadow-lg"
            />
            
            {/* Node label */}
            <text
              x={50 + (node.stage * 180) + 60}
              y={node.y - 8}
              textAnchor="middle"
              fontSize="10"
              fontWeight="600"
              fill="hsl(var(--foreground))"
              className="drop-shadow-sm"
            >
              {node.name.split('\n').map((line, i) => (
                <tspan key={i} x={50 + (node.stage * 180) + 60} dy={i === 0 ? 0 : 10}>
                  {line}
                </tspan>
              ))}
            </text>
            
            {/* Value label */}
            <text
              x={50 + (node.stage * 180) + 60}
              y={node.y + (node.height / 2) + 4}
              textAnchor="middle"
              fontSize="11"
              fontWeight="bold"
              fill="white"
              className="drop-shadow-sm"
            >
              {node.value.toLocaleString()}
            </text>
          </g>
        ))}
        
        {/* Stage totals */}
        {[
          { stage: 0, total: 28450, label: 'Total Released' },
          { stage: 1, total: 28450, label: 'Total Applied' },
          { stage: 2, total: 22150, label: 'Total Approved' },
          { stage: 3, total: 18050, label: 'Total Started' },
          { stage: 4, total: 14980, label: 'Total Completed' },
        ].map(({ stage, total, label }) => (
          <text
            key={stage}
            x={50 + (stage * 180) + 60}
            y={300}
            textAnchor="middle"
            fontSize="9"
            fontWeight="600"
            fill="hsl(var(--muted-foreground))"
          >
            {label}: {total.toLocaleString()}
          </text>
        ))}
      </svg>
      
      {/* Enhanced Tooltip */}
      {hoveredFlow && (
        <div className="absolute top-4 right-4 bg-card/95 backdrop-blur-sm border-2 border-[#22c55e] rounded-lg p-4 shadow-xl z-10 min-w-[200px]">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: flows[parseInt(hoveredFlow.replace('flow-', ''))].color }}
            />
            <div className="text-sm font-semibold text-[#22c55e]">Flow Details</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">
              From: {getNodeById(flows[parseInt(hoveredFlow.replace('flow-', ''))].source).name.replace('\n', ' ')}
            </div>
            <div className="text-xs text-muted-foreground">
              To: {getNodeById(flows[parseInt(hoveredFlow.replace('flow-', ''))].target).name.replace('\n', ' ')}
            </div>
            <div className="text-lg font-bold text-[#22c55e]">
              {flows[parseInt(hoveredFlow.replace('flow-', ''))].value.toLocaleString()} units
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}