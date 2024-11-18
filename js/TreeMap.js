// Tree map used in AI incidents by sector visualization
class TreeMap {
    constructor({parentElement, data}) {
        this.parentElement = parentElement.replace('#', '');
        this.data = data;
        
        const element = document.getElementById(this.parentElement);
        if (element) {
            this.initVis();
        } else {
            console.warn(`Element with id '${this.parentElement}' not found`);
        }
    }

    initVis() {
        let vis = this;
        
        // Set dimensions
        vis.margin = { top: 40, right: 10, bottom: 40, left: 10 };
        vis.width = 800 - vis.margin.left - vis.margin.right;
        vis.height = 600 - vis.margin.top - vis.margin.bottom;

        // Create SVG
        vis.svg = d3.select('#' + vis.parentElement)
            .append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append("g")
            .attr("transform", `translate(${vis.margin.left},${vis.margin.top})`);

        // Process the data
        vis.wrangleData();
    }

    wrangleData() {
        let vis = this;

        // Group incidents by Cleaned_Sector and count them
        const sectorCounts = d3.rollup(
            vis.data,
            v => v.length,
            d => d.Cleaned_Sector
        );

        // Convert to hierarchical format needed for treemap
        const hierarchicalData = {
            name: "AI Incidents",
            children: Array.from(sectorCounts, ([sector, count]) => ({
                name: sector,
                value: count
            }))
        };

        // Create hierarchy and calculate values
        vis.root = d3.hierarchy(hierarchicalData)
            .sum(d => d.value);

        // Create treemap layout
        vis.treemap = d3.treemap()
            .size([vis.width, vis.height])
            .padding(1);

        vis.treemap(vis.root);

        vis.updateVis();
    }

    updateVis() {
        let vis = this;

        // Create color scale
        const colorScale = d3.scaleOrdinal()
            .domain(vis.root.leaves().map(d => d.data.name))
            .range(d3.schemeCategory10);

        // Draw rectangles
        const cell = vis.svg.selectAll("g")
            .data(vis.root.leaves())
            .join("g")
            .attr("transform", d => `translate(${d.x0},${d.y0})`);

        cell.append("rect")
            .attr("width", d => d.x1 - d.x0)
            .attr("height", d => d.y1 - d.y0)
            .attr("fill", d => colorScale(d.data.name))
            .attr("stroke", "white");

        // Add labels
        cell.append("text")
            .selectAll("tspan")
            .data(d => {
                return [
                    d.data.name,
                    `${d.value} incidents`
                ];
            })
            .join("tspan")
            .attr("x", 3)
            .attr("y", (d, i) => 13 + i * 10)
            .attr("fill", "white")
            .text(d => d);
    }
}