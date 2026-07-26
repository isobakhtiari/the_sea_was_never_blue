import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import fullData from '../data/iliad_colour_data.json';
import { HOMERIC_COLOURS } from '../data/constants.js';
import './visualisation.css';

const D3ShimmerStrip = () => {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const hasFallenRef = useRef(false); // only play the fall-and-bounce once

  useEffect(() => {
    const data = [...fullData.colour_scales].sort(
      (a, b) => a.Unique_gleam_score - b.Unique_gleam_score
    );

    const r = 8; // dot radius (px)

    const margin = { top: 20, right: 80, bottom: 72, left: 80 };
    const containerWidth = containerRef.current?.clientWidth || 800;
    const width = containerWidth - margin.left - margin.right;

    // dots positioned along the axis
    const xScale = d3.scaleLinear().domain([0, 10]).range([r * 2, width - r * 2]);

    const plottedData = data.map(d => ({
      ...d,
      px: xScale(d.Unique_gleam_score),
      py: 0,
    }));

    // SVG dimensions
    const dotsHeight = r; // just enough room above the axis for the dot radius
    const totalHeight = margin.top + dotsHeight + margin.bottom;
    const baselineY = margin.top + dotsHeight; // y of the axis line inside the SVG

    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', containerWidth)
      .attr('height', totalHeight)
      .append('g')
      .attr('transform', `translate(${margin.left},${baselineY})`);

    // axis line
    svg.append('line')
      .attr('x1', 0).attr('y1', 0)
      .attr('x2', width).attr('y2', 0)
      .attr('stroke', '#1A1A1A')
      .attr('stroke-width', 1);

    // end ticks
    [0, width].forEach(x => {
      svg.append('line')
        .attr('x1', x).attr('y1', -8)
        .attr('x2', x).attr('y2', 8)
        .attr('stroke', '#1A1A1A')
        .attr('stroke-width', 1);
    });

    // axis label
    svg.append('text')
      .attr('x', 0).attr('y', 34)
      .attr('text-anchor', 'middle')
      .style('font-family', 'Martian Mono, monospace')
      .style('font-size', '12px')
      .style('fill', '#1A1A1A')
      .text('No gleam');

    // axis label
    svg.append('text')
      .attr('x', width).attr('y', 34)
      .attr('text-anchor', 'middle')
      .style('font-family', 'Martian Mono, monospace')
      .style('font-size', '12px')
      .style('fill', '#1A1A1A')
      .text('Very high gleam');

    // axis title
    svg.append('text')
      .attr('x', width / 2).attr('y', 52)
      .attr('text-anchor', 'middle')
      .style('font-family', 'Martian Mono, monospace')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('fill', '#1A1A1A')
      .text('Shimmer and movement quality');

    // dots fall from the scatterplot and on to the gleam axis
    const FALL_HEIGHT = 260; // fallback drop height, used only if a dot's source can't be found

    // diamond highlight on the porphureos dot
    const porphureos = plottedData.find(d => d.Greek_Term === 'πορφυρεός');
    const porphureosIndex = plottedData.findIndex(d => d.Greek_Term === 'πορφυρεός');
    const eyeshineStarPath = (() => {
      const s = 4.5, sw = 3.5, i = 0.7;
      return `M 0,${-s} L ${i},${-i} L ${sw},0 L ${i},${i} L 0,${s} L ${-i},${i} L ${-sw},0 L ${-i},${-i} Z`;
    })();

    const STAGGER = 60;          // ms between each dot starting its fall
    const FALL_DURATION = 1500;  // ms to drop from scatterplot to final axis position

    // scatterplot dots bounce slightly when they hit the gleam axis
    const BOUNCES = [
      { amp: 14, dur: 150 },
      { amp: 7, dur: 120 },
      { amp: 2.5, dur: 90 },
    ];

    // trigger scatterplot dots to fall on first time scroll 
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || hasFallenRef.current) return;
      hasFallenRef.current = true;

      const svgRect = svgRef.current.getBoundingClientRect();
      const gOriginX = svgRect.left + margin.left;
      const gOriginY = svgRect.top + baselineY;

      const withStarts = plottedData.map(d => {
        const sourceEl = document.querySelector(`.dot[data-transliteration="${d.Transliteration}"]`);
        if (sourceEl) {
          const sourceRect = sourceEl.getBoundingClientRect();
          return {
            ...d,
            sourceEl,
            startX: (sourceRect.left + sourceRect.width / 2) - gOriginX,
            startY: (sourceRect.top + sourceRect.height / 2) - gOriginY,
          };
        }
        // fallback: scatterplot dot not found (e.g. faded out), just drop from above
        return { ...d, sourceEl: null, startX: d.px, startY: d.py - FALL_HEIGHT };
      });

      // hide each original dot on the scatterplot once the dot has fallen on to the gleam axis
      withStarts.forEach((d, i) => {
        if (!d.sourceEl) return;
        d3.select(d.sourceEl)
          .transition()
          .delay(i * STAGGER)
          .duration(0)
          .style('opacity', 0);
      });

      let dotTransition = svg.selectAll('.shimmer-dot')
        .data(withStarts)
        .join('circle')
        .attr('class', d => d.Greek_Term === 'πορφυρεός' ? 'shimmer-dot dot-porphureos-shimmer' : 'shimmer-dot')
        .attr('cx', d => d.startX)
        .attr('cy', d => d.startY)
        .attr('r', r)
        .attr('fill', d => HOMERIC_COLOURS[d.Greek_Term] || '#ccc')
        .style('opacity', 1)
        .transition()
        .delay((d, i) => i * STAGGER)
        .duration(FALL_DURATION)
        .ease(d3.easeCubicIn)
        .attr('cx', d => d.px)
        .attr('cy', d => d.py);

      BOUNCES.forEach(({ amp, dur }) => {
        dotTransition = dotTransition
          .transition().duration(dur).ease(d3.easeCubicOut).attr('cy', d => d.py - amp)
          .transition().duration(dur).ease(d3.easeCubicIn).attr('cy', d => d.py);
      });

      // diamond highlight on porphureos
      if (porphureos) {
        const porphStart = withStarts[porphureosIndex];
        const transformAt = y => `translate(${porphureos.px - 1}, ${y - r + 6})`;

        let eyeshineTransition = svg.append('path')
          .attr('class', 'porphureos-eyeshine')
          .attr('d', eyeshineStarPath)
          .attr('transform', `translate(${porphStart.startX - 1}, ${porphStart.startY - r + 6})`)
          .attr('fill', 'white')
          .style('opacity', 1)
          .transition()
          .delay(porphureosIndex * STAGGER)
          .duration(FALL_DURATION)
          .ease(d3.easeCubicIn)
          .attr('transform', transformAt(porphureos.py));

        BOUNCES.forEach(({ amp, dur }) => {
          eyeshineTransition = eyeshineTransition
            .transition().duration(dur).ease(d3.easeCubicOut).attr('transform', transformAt(porphureos.py - amp))
            .transition().duration(dur).ease(d3.easeCubicIn).attr('transform', transformAt(porphureos.py));
        });
      }

      observer.disconnect();
    }, { threshold: 0.3 });

    if (containerRef.current) observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%', maxWidth: '700px', margin: '0 auto' }}>
      <svg ref={svgRef} style={{ display: 'block', overflow: 'visible' }} />
    </div>
  );
};

export default D3ShimmerStrip;
