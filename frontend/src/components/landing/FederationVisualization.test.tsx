import { render, screen } from '@testing-library/react';
import { FederationVisualization } from './FederationVisualization';
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';

describe('FederationVisualization', () => {
  it('renders the visualization legend', () => {
    render(<FederationVisualization />);
    
    // Check for legend items
    // "Your Instance" is in the legend and also as a label for the central node
    expect(screen.getByText('Federated')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('renders the central node label', () => {
    render(<FederationVisualization />);
    
    // "Your Instance" appears twice: once in legend, once in SVG text
    const instances = screen.getAllByText('Your Instance');
    expect(instances).toHaveLength(2);
  });
  
  it('renders the SVG element', () => {
      const { container } = render(<FederationVisualization />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('viewBox', '0 0 100 100');
  });
});
