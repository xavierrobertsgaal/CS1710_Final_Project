class ElectricityTimeline {
    constructor(parentElement, data) {
        let vis = this;
        vis.parentElement = parentElement;
        vis.data = data;
        vis.currentSector = 'Commercial';

        vis.sectors = ['Commercial', 'Industrial', 'Residential', 'Transportation'];
        vis.colors = {
            'Commercial': '#2563eb',
            'Industrial': '#dc2626',
            'Residential': '#16a34a',
            'Transportation': '#9333ea'
        };
        
        // Set default dimensions
        vis.margin = { top: 20, right: 150, bottom: 30, left: 80 };
        vis.height = 400;
        
        // Initialize scales with default domains
        vis.x = d3.scaleLinear()
            .domain([1960, 2022]);
            
        vis.y = d3.scaleLinear()
            .domain([0, 1]);

        // Initialize line generator
        vis.line = d3.line()
            .x(d => vis.x(d.year))
            .y(d => vis.y(d.value))
            .curve(d3.curveMonotoneX);

        // Initialize immediately if DOM is ready, otherwise wait
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => vis.initVis());
        } else {
            vis.initVis();
        }
    }

    initVis() {
        let vis = this;
        
        // Get container element
        const element = document.getElementById(vis.parentElement);
        if (!element) {
            console.error(`Element with id ${vis.parentElement} not found`);
            return;
        }

        // Update width based on container
        const containerWidth = element.getBoundingClientRect().width;
        if (containerWidth <= 0) {
            // Use minimum width if container width is 0
            vis.width = 300 - vis.margin.left - vis.margin.right;
        } else {
            vis.width = containerWidth - vis.margin.left - vis.margin.right;
        }

        // Update scale ranges now that we have dimensions
        vis.x.range([0, vis.width]);
        vis.y.range([vis.height, 0]);
        
        // Only proceed if we have valid dimensions
        if (vis.width > 0 && vis.height > 0) {
            vis.setupSvg();
            vis.setupAxes();
            vis.wrangleData();
        }
    }

    setupSvg() {
        let vis = this;

        // Clear any existing SVG
        d3.select(`#${vis.parentElement} svg`).remove();

        // Create SVG drawing area
        vis.svg = d3.select(`#${vis.parentElement}`)
            .append('svg')
            .attr('width', vis.width + vis.margin.left + vis.margin.right)
            .attr('height', vis.height + vis.margin.top + vis.margin.bottom)
            .append('g')
            .attr('transform', `translate(${vis.margin.left}, ${vis.margin.top})`);

        // Add debug rectangle to verify SVG size
        vis.svg.append('rect')
            .attr('width', vis.width)
            .attr('height', vis.height)
            .attr('fill', 'none')
            .attr('stroke', '#ddd');

        // Clip path for preventing overflow
        vis.svg.append('defs')
            .append('clipPath')
            .attr('id', `clip-${vis.parentElement}`)  // Make clip path ID unique
            .append('rect')
            .attr('width', vis.width)
            .attr('height', vis.height);

        // Path group for line chart
        vis.pathGroup = vis.svg.append('g')
            .attr('class', 'pathGroup')
            .attr('clip-path', `url(#clip-${vis.parentElement})`);

        // vis.path = vis.pathGroup.append('path')
        //     .attr('class', 'line');

        // Add legend
        vis.legend = vis.svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${vis.width + 10}, 0)`);

        vis.sectors.forEach((sector, i) => {
            const legendGroup = vis.legend.append('g')
                .attr('transform', `translate(0, ${i * 20})`);

            legendGroup.append('line')
                .attr('x1', 0)
                .attr('x2', 20)
                .attr('y1', 10)
                .attr('y2', 10)
                .attr('stroke', vis.colors[sector])
                .attr('stroke-width', 2);

            legendGroup.append('text')
                .attr('x', 25)
                .attr('y', 10)
                .attr('dy', '.35em')
                .style('font-size', '12px')
                .text(sector);
        });
    }

    setupAxes() {
        let vis = this;

        // Initialize axes
        vis.xAxis = vis.svg.append('g')
            .attr('class', 'axis axis--x')
            .attr('transform', `translate(0, ${vis.height})`);

        vis.yAxis = vis.svg.append('g')
            .attr('class', 'axis axis--y');

        // Add axes labels
        vis.svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', 0 - vis.margin.left + 20)
            .attr('x', 0 - vis.height / 2)
            .attr('dy', '1em')
            .style('text-anchor', 'middle')
            .text('Energy Consumption (BTU)');
    }

    wrangleData() {
        let vis = this;

        // Process data for the current sector
        vis.displayData = [];

        vis.sectors.forEach(sector => {
            vis.displayData[sector] = [];
            const years = d3.range(1960, 2023);

            years.forEach(year => {
                const totalValue = vis.data
                    .filter(d => d.Sector === sector)
                    .reduce((sum, d) => sum + (+d[year] || 0), 0);

                vis.displayData[sector].push({
                    year: year,
                    value: totalValue
                });
            });
        });

        vis.updateVis();
    }

    updateVis() {
        let vis = this;

        // Find the maximum value across all sectors
        const maxValue = d3.max(Object.values(vis.displayData), sectorData =>
            d3.max(sectorData, d => d.value)
        );

        // Update y scale domain based on data
        vis.y.domain([0, maxValue || 0]);

        // Check if we have valid data
        if (!vis.displayData) {
            console.warn('Missing data in ElectricityTimeline');
            return;
        }

        // Update axes
        if (vis.xAxis) {
            vis.xAxis.transition()
                .duration(800)
                .call(d3.axisBottom(vis.x).tickFormat(d3.format('d')).ticks(8));
        }

        if (vis.yAxis) {
            vis.yAxis.transition()
                .duration(800)
                .call(d3.axisLeft(vis.y).ticks(5).tickFormat(d3.format('.1s')));
        }

        // Update y scale domain based on data
        // vis.y.domain([0, d3.max(vis.displayData, d => d.value) || 0]);

        // Update path
        // if (vis.path && vis.line) {
        //     vis.path.datum(vis.displayData)
        //         .transition()
        //         .duration(800)
        //         .attr('d', vis.line)
        //         .attr('stroke', '#2563eb')
        //         .attr('stroke-width', 2)
        //         .attr('fill', 'none');
        // }

        // Update paths for each sector
        vis.sectors.forEach(sector => {
            // Create or update path for each sector
            const path = vis.pathGroup.selectAll(`.line-${sector}`)
                .data([vis.displayData[sector]]);

            // Enter + Update
            path.enter()
                .append('path')
                .attr('class', `line-${sector}`)
                .merge(path)
                .transition()
                .duration(800)
                .attr('d', vis.line)
                .attr('stroke', vis.colors[sector])
                .attr('stroke-width', 2)
                .attr('fill', 'none');

            path.exit().remove();
        });
    }

    updateSector(sector) {
        let vis = this;
        vis.currentSector = sector;
        vis.wrangleData();
    }

    updateDimensions() {
        let vis = this;

        const element = document.getElementById(vis.parentElement);
        if (!element) return;

        const containerWidth = element.getBoundingClientRect().width;
        if (containerWidth <= 0) return;

        vis.width = containerWidth - vis.margin.left - vis.margin.right;

        const svg = d3.select(`#${vis.parentElement} svg`);
        if (!svg.empty()) {
            svg.attr('width', vis.width + vis.margin.left + vis.margin.right)
                .attr('height', vis.height + vis.margin.top + vis.margin.bottom);

            svg.select(`#clip-${vis.parentElement} rect`)
                .attr('width', vis.width)
                .attr('height', vis.height);

            // Update legend position
            vis.legend.attr('transform', `translate(${vis.width + 10}, 0)`);
        }

        if (vis.x) {
            vis.x.range([0, vis.width]);
        }
    }

    resize() {
        let vis = this;
        vis.updateDimensions();
        if (vis.displayData) {
            vis.updateVis();
        }
    }

    hide() {
        d3.select("#" + this.parentElement).style("display", "none");
    }

    show() {
        d3.select("#" + this.parentElement).style("display", "block");
    }
}
