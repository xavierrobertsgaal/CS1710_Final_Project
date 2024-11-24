// Tree map used in AI incidents by sector visualization
class TreeMap {
    constructor(parentElement, data) {
        console.log('TreeMap constructor called with data:', data);
        this.parentElement = parentElement;
        this.data = data;
        
        // Initialize tooltip with Bootstrap classes
        this.tooltip = d3.select('body').append('div')
            .attr('class', 'tooltip shadow-sm')
            .attr('role', 'tooltip')
            .style('opacity', 0)
            .style('font-family', 'Montserrat, sans-serif'); // Match site font
        
        this.initVis();
    }

    initVis() {
        let vis = this;
        
        // Set dimensions
        vis.margin = { top: 40, right: 10, bottom: 40, left: 10 };
        vis.width = 600 - vis.margin.left - vis.margin.right;
        vis.height = 600 - vis.margin.top - vis.margin.bottom;

        // Create SVG
        vis.svg = d3.select('#' + vis.parentElement)
            .append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append("g")
            .attr("transform", `translate(${vis.margin.left},${vis.margin.top})`);

        // Define color palette (blue-focused)
        vis.colorPalette = [
            '#2C5784', // primary blue
            '#5B9BD5', // lighter blue
            '#A5C8ED', // very light blue
            '#7BA7D7', // medium blue
            '#4281C4', // bright blue
            '#1B365D', // dark blue
            '#89A9D3', // muted blue
            '#3E6DA3', // deep blue
            '#6593C5', // sky blue
            '#264D7E'  // navy blue
        ];

        vis.wrangleData();
    }

    wrangleData() {
        let vis = this;
        console.log('TreeMap wrangleData called with:', vis.data);
        
        // Filter out null/undefined sectors and count incidents
        const sectorCounts = d3.rollup(
            vis.data.filter(d => d.Cleaned_Sector),
            v => v.length,
            d => d.Cleaned_Sector
        );

        // Sort sectors by count for better visualization
        const sortedSectors = Array.from(sectorCounts, ([sector, count]) => ({
            name: sector,
            value: count
        })).sort((a, b) => b.value - a.value);

        // Convert to hierarchical format
        const hierarchicalData = {
            name: "AI Incidents",
            children: sortedSectors
        };

        // Create hierarchy and calculate values
        vis.root = d3.hierarchy(hierarchicalData)
            .sum(d => d.value)
            .sort((a, b) => b.value - a.value); // Sort by value for better layout

        // Create treemap layout
        vis.treemap = d3.treemap()
            .size([vis.width, vis.height])
            .paddingTop(10)
            .paddingRight(2)
            .paddingBottom(2)
            .paddingLeft(2);

        vis.treemap(vis.root);

        vis.updateVis();
    }

    updateVis() {
        let vis = this;

        // Clear any existing content
        vis.svg.selectAll("*").remove();

        // Create color scale
        const colorScale = d3.scaleOrdinal()
            .domain(vis.root.leaves().map(d => d.data.name))
            .range(vis.colorPalette);

        // Add rectangles for each leaf node
        const leaf = vis.svg.selectAll("g")
            .data(vis.root.leaves())
            .join("g")
            .attr("transform", d => `translate(${d.x0},${d.y0})`);

        leaf.append("rect")
            .attr("width", d => d.x1 - d.x0)
            .attr("height", d => d.y1 - d.y0)
            .attr("fill", d => colorScale(d.data.name))
            .on("mouseover", function(event, d) {
                // Highlight effect
                d3.select(this).attr("fill", d3.color(colorScale(d.data.name)).brighter(0.2));
                
                // Show tooltip
                vis.tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                vis.tooltip.html(`
                    <div class="p-2">
                        <strong>${d.data.name}</strong><br/>
                        ${d.value} incidents
                    </div>`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", function(event, d) {
                // Remove highlight
                d3.select(this).attr("fill", colorScale(d.data.name));
                // Hide tooltip
                vis.tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });

        // Add text labels
        leaf.append("text")
            .selectAll("tspan")
            .data(d => {
                const name = d.data.name;
                const value = d.value;
                const width = d.x1 - d.x0;
                // Only show text if rectangle is wide enough
                return width > 60 ? [`${name}`, `(${value})`] : [];
            })
            .join("tspan")
            .attr("x", 3)
            .attr("y", (d, i) => 13 + i * 10)
            .attr("fill", "white")
            .text(d => d);
    }
}