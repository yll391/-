import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Character, Relationship } from '../types';

interface Props {
  characters: Character[];
  relationships: Relationship[];
}

const RelationshipGraph: React.FC<Props> = ({ characters, relationships }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || characters.length === 0) return;

    const width = 600;
    const height = 400;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Map relationships to D3 format (source and target)
    // Filter out relationships where source or target doesn't exist in characters
    const characterIds = new Set(characters.map(c => c.id));
    const links = relationships
      .filter(rel => characterIds.has(rel.sourceId) && characterIds.has(rel.targetId))
      .map(rel => ({
        ...rel,
        source: rel.sourceId,
        target: rel.targetId
      }));

    const simulation = d3.forceSimulation(characters as any)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(150))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2));

    const link = svg.append('g')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('stroke', (d: any) => {
        if (d.affection > d.hostility) return '#10b981'; // green
        if (d.hostility > d.affection) return '#ef4444'; // red
        return '#94a3b8'; // gray
      })
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d: any) => Math.max(1, (d.affection + d.hostility) / 20));

    const node = svg.append('g')
      .selectAll('g')
      .data(characters)
      .enter().append('g')
      .call(d3.drag<any, any>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    node.append('circle')
      .attr('r', 20)
      .attr('fill', '#3b82f6')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    node.append('text')
      .text(d => d.name)
      .attr('x', 25)
      .attr('y', 5)
      .attr('fill', '#1e293b')
      .style('font-size', '12px')
      .style('font-weight', 'bold');

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node
        .attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [characters, relationships]);

  return (
    <div className="w-full h-[400px] bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
      <svg ref={svgRef} width="100%" height="100%" viewBox="0 0 600 400" />
    </div>
  );
};

export default RelationshipGraph;
