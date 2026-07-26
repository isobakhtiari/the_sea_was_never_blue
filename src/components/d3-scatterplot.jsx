import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import fullData from '../data/iliad_colour_data.json';
import { HOMERIC_COLOURS } from '../data/constants.js';
import './visualisation.css';

const LABEL_OFFSETS = {
    'χλωρός': { x: -6, y: -22 },
    'πολιός': { x: -3, y: 0 },  // otherwise χλωρός is overlapping with οἶνοψ
};

const MARGIN = { top: 36, right: 100, bottom: 80, left: 100 };
const CHART_WIDTH = 720 - MARGIN.left - MARGIN.right;
const CHART_HEIGHT = 540 - MARGIN.top - MARGIN.bottom;
const X_SCALE = d3.scaleLinear().domain([0, 10]).range([0, CHART_WIDTH]);
const Y_SCALE = d3.scaleLinear().domain([0, 10]).range([CHART_HEIGHT, 0]);

const buildTooltipHtml = d => { // html tooltip can float anywhere on the page, it is not constrained by the SVG container
    const isWhite = d.Greek_Term === 'ἀργός' || d.Greek_Term === 'λευκός';
    const textColor = isWhite ? '#000000' : HOMERIC_COLOURS[d.Greek_Term];
    return `
        <div style="font-size: 13px; font-weight: bold; margin-bottom: 4px; color: #000;">
            <span>${d.Transliteration}</span>
            <span style="font-family: Georgia, serif; font-weight: normal; font-size: 15px; color: ${textColor};">
                ${d.Greek_Term}
            </span>
        </div>
        <div style="color: #666; font-style: italic;">
            ${d.English}
        </div>
        <div style="margin-top: 5px; padding-top: 5px; font-size: 11px;">
            ${d.Context}
        </div>
    `;
};

const D3ScatterPlot = ({activeStep, onTermHover, activeTerms, fadeDots, pinnedTerms, hoveredTerm}) => {
    const svgRef = useRef(null);
    const tooltipRef = useRef(null); 
    const pinnedTooltipsRef = useRef(null); // container for tooltips that stay visible (not hover-triggered)

    // scatterplot
    useEffect(() => {
        const data = fullData.colour_scales;

        const margin = MARGIN;
        const width = CHART_WIDTH;
        const height = CHART_HEIGHT;

        // clear previous render
        d3.select(svgRef.current).selectAll("*").remove();

        // create SVG container
        const svg = d3.select(svgRef.current)
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
        
        // x, y scales (shared constants, so pinned tooltip positioning uses the same mapping)
        const xScale = X_SCALE;
        const yScale = Y_SCALE;

        // Low/Moderate/High categories on the axes
        const separators = [3.33, 6.66]; 
        const labelPositions = [1.67, 5, 8.33]; // center points for the text labels
        const categoryLabels = ["LOW", "MODERATE", "HIGH"];

        // gridlines
        const makeXGrid = () => d3.axisBottom(xScale).tickValues(separators);
        const makeYGrid = () => d3.axisLeft(yScale).tickValues(separators);

        svg.append("g")
            .attr("class", "grid")
            .attr("transform", `translate(0,${height})`)
            .call(makeXGrid()
                .tickSize(-height)
                .tickFormat("")
            )
            .style("stroke-dasharray", "3 3") // dashed lines for separators
            .style("stroke-opacity", 0.3);

        svg.append("g")
            .attr("class", "grid")
            .call(makeYGrid()
                .tickSize(-width)
                .tickFormat("")
            )
            .style("stroke-dasharray", "3 3")
            .style("stroke-opacity", 0.3);

        // x-axis (Gleam) set-up
        const xAxisGroup = svg.append("g")
            .attr("transform", `translate(0,${height})`);

        // tick labels (Low, Moderate, High)
        xAxisGroup.call(d3.axisBottom(xScale)
            .tickValues(labelPositions)
            .tickFormat((d, i) => categoryLabels[i])
            .tickSize(0) // hide the ticks under the text
            .tickPadding(15));
            
        // ticks (at the boundaries 0.33 and 0.66)
        xAxisGroup.append("g")
            .call(d3.axisBottom(xScale)
            .tickValues([0, ...separators, 10]) // ticks at 0, 3.33, 6.66, 10 (separators)
            .tickFormat("")
            .tickSize(6));

        // axis label
        xAxisGroup.append("text")
            .attr("class", "axis-label")
            .attr("x", width / 2)
            .attr("y", 58)
            .attr("fill", "#333")
            .style("text-anchor", "middle")
            .text("Gleam (shimmer & movement)");

        // y-axis (Luminosity) set-up
        const yAxisGroup = svg.append("g");

        // tick labels (Low, Moderate, High)
        yAxisGroup.call(d3.axisLeft(yScale)
            .tickValues(labelPositions)
            .tickFormat((d, i) => categoryLabels[i])
            .tickSize(0)
            .tickPadding(10)) // padding between tick labels and axis
            .selectAll("text")
                .attr("transform", "rotate(-90)") // rotate text labels 90 degrees counter-clockwise
                .style("text-anchor", "middle")   // centre the text on the tick mark
                .attr("x", 0)   // reset X (which becomes vertical position after rotation)
                .attr("y", -15) // move Y (which becomes horizontal distance) to the left
                .style("font-family", "Martian Mono, monospace")
                .style("font-size", "11px");

        // ticks (at the boundaries 0.33 and 0.66)
        yAxisGroup.append("g")
            .call(d3.axisLeft(yScale)
            .tickValues([0, ...separators, 10])
            .tickFormat("")
            .tickSize(6));

        // axis label
        yAxisGroup.append("text")
            .attr("class", "axis-label")
            .attr("transform", "rotate(-90)")
            .attr("y", -59)
            .attr("x", -height / 2)
            .attr("fill", "#333")
            .style("text-anchor", "middle")
            .text("Luminosity (brightness)");

        // html tooltip
        const tooltipDiv = d3.select(tooltipRef.current);

        {
            // render scatterplot dots
            svg.selectAll(".dot")
                .data(data)
                .join("circle")
                .attr("class", "dot")
                .attr("data-transliteration", d => d.Transliteration) // lets other charts locate this dot's live position
                .attr("cx", d => xScale(d.Unique_gleam_score))
                .attr("cy", d => yScale(d.Luminosity_Score))     
                .attr("r", 8) 
                .style("fill", d => HOMERIC_COLOURS[d.Greek_Term] || "#ccc")
                .style("opacity", 1)
                .style("cursor", "pointer")
                // tooltip listeners
                .on("mouseover", (event, d) => {
                    onTermHover?.(d.Transliteration); // hover callback
                    const [x, y] = d3.pointer(event, svgRef.current);

                    tooltipDiv.html(buildTooltipHtml(d));

                    const nearRight = x > (width + margin.left) * 0.95;

                    tooltipDiv
                        .style("opacity", 1)
                        .style("min-width", nearRight ? "160px" : "300px")
                        .style("max-width", nearRight ? "180px" : "320px")
                        .style("left", (x + 20) + "px")
                        .style("top", (y - 10) + "px");
                    
                    d3.select(event.currentTarget)
                        .transition().duration(200)
                        .attr("r", 10);
                })
                .on("mouseout", (event, d) => {
                    onTermHover?.(null); // hover callback reset
                    tooltipDiv.style("opacity", 0);
                    d3.select(event.currentTarget)
                        .transition().duration(200)
                        .attr("r", 8);
                });

            // render greek labels
            svg.selectAll(".label")
                .data(data)
                .enter()
                .append("text")
                .attr("class", "label")
                .attr("x", d => {
                    const offset = LABEL_OFFSETS[d.Greek_Term]?.x || 0;
                    return xScale(d.Unique_gleam_score) + 14 + offset;
                })
                .attr("y", d => {
                    const offset = LABEL_OFFSETS[d.Greek_Term]?.y || 0;
                    return yScale(d.Luminosity_Score) + 10 + offset;
                })
                .text(d => d.Greek_Term)
                .style("font-size", "13px")
                .style("font-family", "Georgia, serif")
                .style("fill", "#333")
                .style("opacity", 1);
        }
    }, []); // this only builds once (dots/labels persist as the same DOM elements as user scrolls down the page)

    // scatterplot dots fade in/out depending on the scrolly-telling cards
    useEffect(() => {
        const svg = d3.select(svgRef.current);
        const pinned = pinnedTerms || [];

        if (pinned.length > 0) {
            // pinned colour terms (dots and labels); depends on the previous scrolly-telling card
            svg.selectAll('.dot')
                .transition().duration(300)
                .style('opacity', d => pinned.includes(d.Transliteration) ? 1 : 0.08);
            svg.selectAll('.label')
                .transition().duration(300)
                .style('opacity', d => pinned.includes(d.Transliteration) ? 1 : 0.08);
        } else if (!fadeDots) {
            // reset all dots and labels to full opacity
            svg.selectAll('.dot').transition().duration(300).style('opacity', 1);
            svg.selectAll('.label').transition().duration(300).style('opacity', 1);
        } else {
            // fade out dots and labels that are not a part of the selected colour palette
            const terms = activeTerms || new Set();
            svg.selectAll('.dot')
                .transition().duration(300)
                .style('opacity', d => terms.has(d.Transliteration) ? 1 : 0.08);
            svg.selectAll('.label')
                .transition().duration(300)
                .style('opacity', d => terms.has(d.Transliteration) ? 1 : 0.08);
        }
    }, [fadeDots, activeTerms, pinnedTerms]);

    // make the tooltips always visible (not hover dependent) for the pinned colour terms
    useEffect(() => {
        const data = fullData.colour_scales;
        const pinnedContainer = d3.select(pinnedTooltipsRef.current);
        const pinned = pinnedTerms || [];

        const pinnedData = pinned.length > 0
            ? data
                .filter(d => pinned.includes(d.Transliteration))
                .map(d => {
                    const x = MARGIN.left + X_SCALE(d.Unique_gleam_score);
                    const y = MARGIN.top + Y_SCALE(d.Luminosity_Score);
                    return { ...d, _x: x, _y: y, _nearRight: x > (CHART_WIDTH + MARGIN.left) * 0.95 };
                })
            : [];

        pinnedContainer.selectAll(".pinned-tooltip")
            .data(pinnedData, d => d.Transliteration)
            .join(
                enter => enter.append("div")
                    .attr("class", "pinned-tooltip")
                    .style("opacity", 0)
                    .style("min-width", d => d._nearRight ? "160px" : "300px")
                    .style("max-width", d => d._nearRight ? "180px" : "320px")
                    .style("left", d => (d._x + 20) + "px")
                    .style("top", d => (d._y - 10) + "px")
                    .html(buildTooltipHtml)
                    .call(e => e.transition("pinned-fade").delay(150).duration(300).style("opacity", 1)),
                update => update
                    .interrupt("pinned-fade")
                    .style("opacity", 1)
                    .style("left", d => (d._x + 20) + "px")
                    .style("top", d => (d._y - 10) + "px")
                    .html(buildTooltipHtml),
                exit => exit
                    .interrupt("pinned-fade")
                    .transition("pinned-fade").duration(400)
                    .style("opacity", 0)
                    .remove()
            );
    }, [pinnedTerms]);

    // when the user hovers on the colour term segment in the polar area chart, this reflects back onto the
    // scatterplot (shows the hover tooltip and enlarges the corresponding dot)
    useEffect(() => {
        const svg = d3.select(svgRef.current);
        const tooltipDiv = d3.select(tooltipRef.current);

        svg.selectAll(".dot")
            .transition().duration(200)
            .attr("r", d => (hoveredTerm && d.Transliteration === hoveredTerm) ? 10 : 8);

        if (!hoveredTerm) {
            tooltipDiv.style("opacity", 0);
            return;
        }

        const match = fullData.colour_scales.find(d => d.Transliteration === hoveredTerm);
        if (!match) {
            tooltipDiv.style("opacity", 0);
            return;
        }

        const x = MARGIN.left + X_SCALE(match.Unique_gleam_score);
        const y = MARGIN.top + Y_SCALE(match.Luminosity_Score);
        const nearRight = x > (CHART_WIDTH + MARGIN.left) * 0.95;

        tooltipDiv
            .html(buildTooltipHtml(match))
            .style("min-width", nearRight ? "160px" : "300px")
            .style("max-width", nearRight ? "180px" : "320px")
            .style("left", (x + 20) + "px")
            .style("top", (y - 10) + "px")
            .style("opacity", 1);
    }, [hoveredTerm]);

    return (
        <div className="viz-container">
            <svg ref={svgRef}></svg>
            <div ref={tooltipRef} className="html-tooltip"></div>
            <div ref={pinnedTooltipsRef}></div>
        </div>
    );
};

export default D3ScatterPlot;