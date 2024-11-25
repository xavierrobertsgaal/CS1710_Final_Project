class ElectTimeline {
    constructor(parentElement, data) {
        this.parentElement = parentElement;
        this.data = data;
        this.currentSector = 'Commercial'; // Default sector

        this.initVis();
    }

    initVis() {
        const vis = this;

        // Set up margins and dimensions
        vis.margin = { top: 20, right: 50, bottom: 30, left: 80 };
        vis.width = document
            .getElementById(vis.parentElement)
            .getBoundingClientRect().width - vis.margin.left - vis.margin.right;
        vis.height = 120;

        // Create SVG drawing area
        vis.svg = d3
            .select(`#${vis.parentElement}`)
            .append('svg')
            .attr('width', vis.width + vis.margin.left + vis.margin.right)
            .attr('height', vis.height + vis.margin.top + vis.margin.bottom)
            .append('g')
            .attr('transform', `translate(${vis.margin.left}, ${vis.margin.top})`);

        // Clip path for preventing overflow
        vis.svg
            .append('defs')
            .append('clipPath')
            .attr('id', 'clip')
            .append('rect')
            .attr('width', vis.width)
            .attr('height', vis.height);

        // Initialize scales
        vis.x = d3.scaleLinear().range([0, vis.width]).domain([1960, 2022]);
        vis.y = d3.scaleLinear().range([vis.height, 0]);

        // Initialize axes
        vis.xAxis = vis.svg
            .append('g')
            .attr('class', 'axis axis--x')
            .attr('transform', `translate(0, ${vis.height})`);
        vis.yAxis = vis.svg.append('g').attr('class', 'axis axis--y');

        // Add axes labels
        vis.svg
            .append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', 0 - vis.margin.left + 20)
            .attr('x', 0 - vis.height / 2)
            .attr('dy', '1em')
            .style('text-anchor', 'middle')
            .text('Energy Consumption (BTU)');

        // Path group for line chart
        vis.pathGroup = vis.svg
            .append('g')
            .attr('class', 'pathGroup')
            .attr('clip-path', 'url(#clip)');

        vis.path = vis.pathGroup.append('path').attr('class', 'line');

        // Tooltip for displaying data on hover
        vis.tooltip = d3
            .select('body')
            .append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0)
            .style('position', 'absolute')
            .style('background-color', 'white')
            .style('border', 'solid')
            .style('border-width', '1px')
            .style('border-radius', '5px')
            .style('padding', '10px');

        // Initialize brush for year selection
        vis.brushGroup = vis.svg.append('g').attr('class', 'brush');
        vis.brush = d3
            .brushX()
            .extent([
                [0, 0],
                [vis.width, vis.height]
            ])
            .on('brush end', function (event) {
                if (event.selection) {
                    const selectedYear = Math.round(vis.x.invert(event.selection[0]));
                    if (vis.yearChangeCallback) {
                        vis.yearChangeCallback(selectedYear);
                    }
                }
            });

        // Line generator
        vis.line = d3
            .line()
            .x(d => vis.x(d.year))
            .y(d => vis.y(d.value))
            .curve(d3.curveMonotoneX);

        // Overlay for interactions
        vis.overlay = vis.svg
            .append('rect')
            .attr('class', 'overlay')
            .attr('width', vis.width)
            .attr('height', vis.height)
            .style('fill', 'none')
            .style('pointer-events', 'all')
            .on('mousemove', function (event) {
                const [xPos] = d3.pointer(event);
                const year = Math.round(vis.x.invert(xPos));
                const dataPoint = vis.displayData.find(d => d.year === year);

                if (dataPoint) {
                    vis.tooltip
                        .style('opacity', 1)
                        .html(
                            `Year: ${dataPoint.year}<br>Consumption: ${d3.format(',')(
                                Math.round(dataPoint.value)
                            )} BTU`
                        )
                        .style('left', `${event.pageX + 10}px`)
                        .style('top', `${event.pageY - 10}px`);
                }
            })
            .on('mouseout', function () {
                vis.tooltip.style('opacity', 0);
            });

        // Initial data wrangling
        this.wrangleData();
    }

    wrangleData() {
        const vis = this;

        // Process data for the current sector
        vis.displayData = [];
        const years = d3.range(1960, 2023);
        years.forEach(year => {
            const totalValue = vis.data
                .filter(d => d.Sector === vis.currentSector)
                .reduce((sum, d) => sum + (+d[year] || 0), 0);

            vis.displayData.push({
                year: year,
                value: totalValue
            });
        });

        // Update the visualization
        this.updateVis();
    }

    updateVis() {
        const vis = this;

        // Update scales
        vis.y.domain([0, d3.max(vis.displayData, d => d.value)]);

        // Update axes
        vis.xAxis
            .transition()
            .duration(800)
            .call(d3.axisBottom(vis.x).tickFormat(d3.format('d')).ticks(8));

        vis.yAxis
            .transition()
            .duration(800)
            .call(d3.axisLeft(vis.y).ticks(5).tickFormat(d3.format('.1s')));

        // Update path
        vis.path
            .datum(vis.displayData)
            .transition()
            .duration(800)
            .attr('d', vis.line)
            .attr('stroke', '#2563eb')
            .attr('stroke-width', 2)
            .attr('fill', 'none');
    }

    updateSector(sector) {
        console.log(`Updating sector to: ${sector}`);
        this.currentSector = sector;
        this.wrangleData();
    }

    updateBrush(year) {
        console.log(`Updating year to: ${year}`);
        this.brushGroup.call(this.brush.move, [this.x(year), this.x(year)]);
    }
}
