import { useEffect, useRef } from "react";

interface Node {
  id: string;
  x: number;
  y: number;
  label: string;
  type: "local" | "remote" | "pending";
  size: number;
}

interface Connection {
  from: string;
  to: string;
  active: boolean;
}

const nodes: Node[] = [
  { id: "1", x: 50, y: 50, label: "Your Instance", type: "local", size: 24 },
  { id: "2", x: 25, y: 30, label: "art.social", type: "remote", size: 16 },
  { id: "3", x: 75, y: 25, label: "tech.community", type: "remote", size: 18 },
  { id: "4", x: 20, y: 65, label: "music.zone", type: "remote", size: 14 },
  { id: "5", x: 80, y: 70, label: "science.hub", type: "remote", size: 16 },
  { id: "6", x: 45, y: 20, label: "writers.space", type: "pending", size: 12 },
  { id: "7", x: 70, y: 45, label: "gaming.world", type: "remote", size: 15 },
  { id: "8", x: 30, y: 80, label: "photo.club", type: "remote", size: 13 },
];

const connections: Connection[] = [
  { from: "1", to: "2", active: true },
  { from: "1", to: "3", active: true },
  { from: "1", to: "4", active: true },
  { from: "1", to: "5", active: true },
  { from: "1", to: "7", active: true },
  { from: "1", to: "8", active: true },
  { from: "2", to: "3", active: false },
  { from: "3", to: "7", active: false },
  { from: "4", to: "8", active: false },
  { from: "5", to: "7", active: false },
];

export function FederationVisualization() {
  const svgRef = useRef<SVGSVGElement>(null);

  return (
    <div className="relative w-full h-full min-h-[400px] lg:min-h-[500px]">
      <svg
        ref={svgRef}
        viewBox="0 0 100 100"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Gradient for local node */}
          <radialGradient id="localGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(38, 92%, 55%)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="hsl(38, 92%, 55%)" stopOpacity="0" />
          </radialGradient>
          
          {/* Gradient for connections */}
          <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(38, 92%, 55%)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="hsl(175, 65%, 45%)" stopOpacity="0.4" />
          </linearGradient>

          {/* Filter for glow effect */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Background glow for local node */}
        <circle
          cx={nodes[0].x}
          cy={nodes[0].y}
          r="15"
          fill="url(#localGlow)"
          className="animate-pulse"
        />

        {/* Connection lines */}
        {connections.map((conn, i) => {
          const fromNode = nodes.find(n => n.id === conn.from);
          const toNode = nodes.find(n => n.id === conn.to);
          if (!fromNode || !toNode) return null;

          return (
            <line
              key={i}
              x1={fromNode.x}
              y1={fromNode.y}
              x2={toNode.x}
              y2={toNode.y}
              stroke={conn.active ? "url(#connectionGradient)" : "hsl(220, 15%, 25%)"}
              strokeWidth={conn.active ? "0.4" : "0.2"}
              strokeDasharray={conn.active ? "none" : "1 1"}
              className={conn.active ? "node-connection" : ""}
              opacity={conn.active ? 0.8 : 0.3}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node, i) => {
          const getColor = () => {
            switch (node.type) {
              case "local": return "hsl(38, 92%, 55%)";
              case "remote": return "hsl(175, 65%, 45%)";
              case "pending": return "hsl(45, 60%, 50%)";
            }
          };

          const radius = node.size / 10;

          return (
            <g key={node.id}>
              {/* Outer glow for local node */}
              {node.type === "local" && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={radius + 1}
                  fill="none"
                  stroke={getColor()}
                  strokeWidth="0.3"
                  opacity="0.5"
                  className="node-pulse"
                />
              )}
              
              {/* Main node circle */}
              <circle
                cx={node.x}
                cy={node.y}
                r={radius}
                fill={getColor()}
                filter={node.type === "local" ? "url(#glow)" : undefined}
                className={node.type === "pending" ? "animate-pulse" : ""}
                style={{
                  animationDelay: `${i * 0.2}s`,
                }}
              />
              
              {/* Node label - only show for local */}
              {node.type === "local" && (
                <text
                  x={node.x}
                  y={node.y + radius + 4}
                  textAnchor="middle"
                  fontSize="3"
                  fill="hsl(45, 20%, 95%)"
                  fontFamily="DM Sans"
                  fontWeight="500"
                >
                  {node.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary shadow-glow" />
          <span>Your Instance</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-accent" />
          <span>Federated</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-node-pending animate-pulse" />
          <span>Pending</span>
        </div>
      </div>
    </div>
  );
}