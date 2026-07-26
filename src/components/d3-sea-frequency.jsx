import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import referencePaletteData from '../data/iliad_references_colour_palettes.json';
import { HOMERIC_COLOURS, GREEK_TO_TRANSLITERATION } from '../data/constants.js';

const D3SeaFrequency = ({ reference = 'Iliad (books 1 to 24)', hoveredTerm, onSegmentHover, size = 400 }) => {
    const svgRef = useRef(null);

    // polar area chart uses the data from the selected context reference, e.g. Gods or Sea
    const data = useMemo(() => {
        const refEntry = referencePaletteData.data.find(d => d.reference === reference);
        if (!refEntry) return [];
        return refEntry.colour_frequencies.map(d => ({
            ...d,
            greekTerm: d.term_category,
            transliteration: GREEK_TO_TRANSLITERATION[d.term_category] || d.term_category,
        }));
    }, [reference]);

    // build polar area chart
    useEffect(() => {
        const width = size;
        const height = size;
        const margin = Math.round(size * 0.1);
        const radius = size / 2 - margin;

        d3.select(svgRef.current).selectAll('*').remove();

        const svg = d3.select(svgRef.current)
            .attr('width', width)
            .attr('height', height)
            .append('g')
            .attr('transform', `translate(${width / 2}, ${height / 2})`);

        // polar area: equal angles, radius encodes frequency
        const angleSlice = (2 * Math.PI) / data.length;
        const maxFreq = d3.max(data, d => d.frequency);
        const rScale = d3.scaleSqrt().domain([0, maxFreq]).range([0, radius]);

        const arc = d3.arc()
            .innerRadius(0)
            .outerRadius(d => rScale(d.frequency))
            .startAngle((_, i) => i * angleSlice)
            .endAngle((_, i) => (i + 1) * angleSlice)
            .padAngle(0); // no gaps so the segments share exact edges

        svg.selectAll('.arc-slice')
            .data(data)
            .join('path')
            .attr('class', 'arc-slice')
            .attr('data-transliteration', d => d.transliteration)
            .attr('d', arc)
            .attr('fill', d => HOMERIC_COLOURS[d.greekTerm] || '#ccc')
            .attr('fill-opacity', 1)
            .attr('stroke', 'none')
            .style('cursor', 'pointer')
            .on('mouseover', (event, d) => { onSegmentHover?.(d.transliteration); })
            .on('mouseout', () => { onSegmentHover?.(null); });


    }, [data, size]);

    // colour term segments in the polar area chart highlight on hover
    useEffect(() => {
        const svg = d3.select(svgRef.current);
        if (!hoveredTerm) {
            // when no sgement is hovered over, all slices are full opacity
            svg.selectAll('.arc-slice')
                .transition().duration(200)
                .attr('fill-opacity', 1);
            return;
        }

        // check if the hovered scatterplot term appears in the current reference's polar area chart
        const termIsInChart = data.some(d => d.transliteration === hoveredTerm);

        svg.selectAll('.arc-slice')
            .transition().duration(200)
            .attr('fill-opacity', d =>
                !termIsInChart ? 1
                : d.transliteration === hoveredTerm ? 1
                : 0.08
            );

    }, [hoveredTerm, data]); // runs whenever hover or reference data changes

    return <svg ref={svgRef} style={{ overflow: 'visible' }}></svg>;
};

export default D3SeaFrequency;