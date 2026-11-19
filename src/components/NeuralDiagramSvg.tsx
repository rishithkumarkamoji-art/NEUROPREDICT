import React, { useMemo } from 'react';
import type { ForwardPassInspection } from '../../shared/types';
import { FEATURE_METADATA } from '../../shared/academicRules';

export interface SelectedNeuron {
  layer: 'input' | 'hidden1' | 'hidden2' | 'output';
  index: number;
}

interface NeuralDiagramProps {
  inspection?: ForwardPassInspection | null;
  activeStage?: 'idle' | 'input' | 'hidden1' | 'hidden2' | 'output' | 'backprop';
  selectedNeuron?: SelectedNeuron | null;
  onSelectNeuron?: (neuron: SelectedNeuron) => void;
  compact?: boolean;
}

export function NeuralDiagramSvg({
  inspection,
  activeStage = 'idle',
  selectedNeuron,
  onSelectNeuron,
  compact = false,
}: NeuralDiagramProps) {
  const width = 800;
  const height = compact ? 420 : 500;
  const xCoords = [115, 310, 515, 695];

  const layerPositions = useMemo(() => {
    const padTop = 58;
    const padBottom = 42;
    const usable = height - padTop - padBottom;

    const distribute = (count: number) =>
      Array.from({ length: count }, (_, i) => {
        if (count === 1) return padTop + usable / 2;
        return padTop + (i * usable) / (count - 1);
      });

    return {
      input: distribute(9),
      hidden1: distribute(16),
      hidden2: distribute(8),
      output: distribute(1),
    };
  }, [height]);

  const isBackprop = activeStage === 'backprop';

  const getEdgeColor = (weight: number, isHighlighted: boolean) => {
    if (isBackprop) return isHighlighted ? '#DC2626' : 'rgba(220, 38, 38, 0.25)';
    if (isHighlighted) {
      return weight >= 0 ? '#2563EB' : '#D97706';
    }
    return weight >= 0 ? 'rgba(37, 99, 235, 0.22)' : 'rgba(217, 119, 6, 0.20)';
  };

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto select-none"
        role="img"
        aria-label="Artificial Neural Network architecture diagram with 9 inputs, 16 ReLU hidden layer 1 neurons, 8 ReLU hidden layer 2 neurons, and 1 Sigmoid output neuron"
      >
        {/* Layer Column Headers */}
        <g className="text-[11px] font-medium fill-slate-500 dark:fill-slate-400">
          <text x={xCoords[0]} y={22} textAnchor="middle">
            Input Layer (9)
          </text>
          <text x={xCoords[1]} y={22} textAnchor="middle">
            Hidden Layer 1 (16 · ReLU)
          </text>
          <text x={xCoords[2]} y={22} textAnchor="middle">
            Hidden Layer 2 (8 · ReLU)
          </text>
          <text x={xCoords[3]} y={22} textAnchor="middle">
            Output (1 · Sigmoid)
          </text>
        </g>

        {/* Connections: Input -> Hidden 1 */}
        <g>
          {layerPositions.input.map((y1, i) =>
            layerPositions.hidden1.map((y2, j) => {
              const w = inspection?.weights.inputToHidden1?.[i]?.[j] ?? ((i + j) % 3 === 0 ? -0.3 : 0.4);
              const absW = Math.min(1.5, Math.abs(w));
              const highlighted =
                activeStage === 'hidden1' ||
                isBackprop ||
                (selectedNeuron?.layer === 'input' && selectedNeuron.index === i) ||
                (selectedNeuron?.layer === 'hidden1' && selectedNeuron.index === j);
              return (
                <line
                  key={`in-h1-${i}-${j}`}
                  x1={xCoords[0]}
                  y1={y1}
                  x2={xCoords[1]}
                  y2={y2}
                  stroke={getEdgeColor(w, highlighted)}
                  strokeWidth={highlighted ? Math.max(1.1, absW * 1.4) : 0.65}
                  opacity={highlighted ? 0.85 : 0.5}
                />
              );
            })
          )}
        </g>

        {/* Connections: Hidden 1 -> Hidden 2 */}
        <g>
          {layerPositions.hidden1.map((y1, i) =>
            layerPositions.hidden2.map((y2, j) => {
              const w = inspection?.weights.hidden1ToHidden2?.[i]?.[j] ?? ((i * 2 + j) % 4 === 0 ? -0.25 : 0.35);
              const absW = Math.min(1.5, Math.abs(w));
              const highlighted =
                activeStage === 'hidden2' ||
                isBackprop ||
                (selectedNeuron?.layer === 'hidden1' && selectedNeuron.index === i) ||
                (selectedNeuron?.layer === 'hidden2' && selectedNeuron.index === j);
              return (
                <line
                  key={`h1-h2-${i}-${j}`}
                  x1={xCoords[1]}
                  y1={y1}
                  x2={xCoords[2]}
                  y2={y2}
                  stroke={getEdgeColor(w, highlighted)}
                  strokeWidth={highlighted ? Math.max(1.1, absW * 1.4) : 0.7}
                  opacity={highlighted ? 0.85 : 0.5}
                />
              );
            })
          )}
        </g>

        {/* Connections: Hidden 2 -> Output */}
        <g>
          {layerPositions.hidden2.map((y1, i) => {
            const y2 = layerPositions.output[0];
            const w = inspection?.weights.hidden2ToOutput?.[i]?.[0] ?? (i % 2 === 0 ? 0.45 : -0.2);
            const absW = Math.min(1.8, Math.abs(w));
            const highlighted =
              activeStage === 'output' ||
              isBackprop ||
              (selectedNeuron?.layer === 'hidden2' && selectedNeuron.index === i) ||
              selectedNeuron?.layer === 'output';
            return (
              <line
                key={`h2-out-${i}`}
                x1={xCoords[2]}
                y1={y1}
                x2={xCoords[3]}
                y2={y2}
                stroke={getEdgeColor(w, highlighted)}
                strokeWidth={highlighted ? Math.max(1.6, absW * 2.1) : 1.1}
                opacity={highlighted ? 0.95 : 0.6}
              />
            );
          })}
        </g>

        {/* Input Nodes (9) */}
        {layerPositions.input.map((y, i) => {
          const inp = inspection?.inputs[i];
          const label = inp?.label ?? FEATURE_METADATA[i]?.shortLabel ?? `x${i + 1}`;
          const isSelected = selectedNeuron?.layer === 'input' && selectedNeuron.index === i;
          const active = activeStage === 'input' || isSelected;
          return (
            <g
              key={`in-${i}`}
              className={onSelectNeuron ? 'cursor-pointer' : undefined}
              onClick={() => onSelectNeuron?.({ layer: 'input', index: i })}
            >
              <text
                x={xCoords[0] - 16}
                y={y + 3.5}
                textAnchor="end"
                className="text-[10.5px] fill-slate-600 dark:fill-slate-300 font-medium"
              >
                {label}
              </text>
              <circle
                cx={xCoords[0]}
                cy={y}
                r={active ? 9 : 7.5}
                className={
                  active
                    ? 'fill-blue-600 stroke-blue-300 dark:stroke-blue-400'
                    : 'fill-white dark:fill-slate-900 stroke-blue-600 dark:stroke-blue-400'
                }
                strokeWidth={active ? 2.5 : 1.75}
              />
            </g>
          );
        })}

        {/* Hidden Layer 1 Nodes (16 ReLU) */}
        {layerPositions.hidden1.map((y, i) => {
          const act = inspection?.hidden1[i]?.activation ?? 0.5;
          const intensity = Math.min(1, act / 2.2);
          const isSelected = selectedNeuron?.layer === 'hidden1' && selectedNeuron.index === i;
          const active = activeStage === 'hidden1' || isSelected;
          return (
            <g
              key={`h1-${i}`}
              className={onSelectNeuron ? 'cursor-pointer' : undefined}
              onClick={() => onSelectNeuron?.({ layer: 'hidden1', index: i })}
            >
              <circle
                cx={xCoords[1]}
                cy={y}
                r={active ? 7.5 : 6}
                fill={
                  isBackprop
                    ? 'rgba(220,38,38,0.85)'
                    : act > 0.01
                    ? `rgba(37, 99, 235, ${0.25 + intensity * 0.75})`
                    : 'rgba(148, 163, 184, 0.25)'
                }
                stroke={isSelected ? '#0F172A' : '#2563EB'}
                strokeWidth={isSelected ? 2.2 : 1.25}
              />
            </g>
          );
        })}

        {/* Hidden Layer 2 Nodes (8 ReLU) */}
        {layerPositions.hidden2.map((y, i) => {
          const act = inspection?.hidden2[i]?.activation ?? 0.5;
          const intensity = Math.min(1, act / 2.2);
          const isSelected = selectedNeuron?.layer === 'hidden2' && selectedNeuron.index === i;
          const active = activeStage === 'hidden2' || isSelected;
          return (
            <g
              key={`h2-${i}`}
              className={onSelectNeuron ? 'cursor-pointer' : undefined}
              onClick={() => onSelectNeuron?.({ layer: 'hidden2', index: i })}
            >
              <circle
                cx={xCoords[2]}
                cy={y}
                r={active ? 9.5 : 8}
                fill={
                  isBackprop
                    ? 'rgba(220,38,38,0.85)'
                    : act > 0.01
                    ? `rgba(79, 70, 229, ${0.25 + intensity * 0.75})`
                    : 'rgba(148, 163, 184, 0.25)'
                }
                stroke={isSelected ? '#0F172A' : '#4F46E5'}
                strokeWidth={isSelected ? 2.2 : 1.5}
              />
            </g>
          );
        })}

        {/* Output Node (1 Sigmoid) */}
        <g
          className={onSelectNeuron ? 'cursor-pointer' : undefined}
          onClick={() => onSelectNeuron?.({ layer: 'output', index: 0 })}
        >
          <circle
            cx={xCoords[3]}
            cy={layerPositions.output[0]}
            r={activeStage === 'output' || selectedNeuron?.layer === 'output' ? 22 : 19}
            fill={isBackprop ? '#DC2626' : '#059669'}
            stroke="#FFFFFF"
            strokeWidth={2.5}
          />
          <text
            x={xCoords[3]}
            y={layerPositions.output[0] + 4}
            textAnchor="middle"
            className="fill-white font-mono text-[11px] font-semibold tabular-nums"
          >
            {inspection ? `${inspection.output.predictedScore.toFixed(0)}%` : 'ŷ'}
          </text>
          <text
            x={xCoords[3]}
            y={layerPositions.output[0] + 38}
            textAnchor="middle"
            className="fill-slate-600 dark:fill-slate-300 text-[11px] font-medium"
          >
            {inspection ? `σ = ${inspection.output.sigmoid.toFixed(3)}` : 'Predicted Score'}
          </text>
        </g>

        {/* Bottom Legend */}
        <g className="text-[10.5px] fill-slate-500 dark:fill-slate-400">
          <text x={24} y={height - 10}>
            {isBackprop
              ? 'Backpropagation: gradients ∂MSE/∂W propagate right-to-left via Adam (lr = 0.001)'
              : 'Blue edges: positive weights · Amber edges: negative weights · Node fill reflects ReLU activation strength'}
          </text>
        </g>
      </svg>
    </div>
  );
}
