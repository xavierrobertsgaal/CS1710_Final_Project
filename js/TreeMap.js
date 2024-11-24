// Tree map used in AI incidents by sector visualization
class TreeMap {
    constructor(parentElement, data) {
        this.parentElement = parentElement;
        this.containerElement = document.getElementById(parentElement);
        this.data = data;
        this.displayData = data; // Add this for filtering
        
        // Initialize with shared dimensions
        this.width = sharedDimensions.width;
        this.height = sharedDimensions.height;
        
        this.initVis();
    }

    initVis() {
        let vis = this;
        
        // Set margins
        vis.margin = { top: 40, right: 10, bottom: 40, left: 10 };
        
        vis.setupSvg();
        vis.setupScales();
        
        // Initialize tooltip (remove duplicate)
        vis.tooltip = d3.select('body').append('div')
            .attr('class', 'tooltip shadow-sm')
            .attr('role', 'tooltip')
            .style('opacity', 0)
            .style('position', 'absolute')
            .style('background-color', 'white')
            .style('border', '1px solid #ddd')
            .style('padding', '10px')
            .style('border-radius', '5px')
            .style('pointer-events', 'none')
            .style('font-family', 'Montserrat, sans-serif');

        // Add incident details panel
        vis.detailsPanel = d3.select(`#${vis.parentElement}`)
            .append("div")
            .attr("class", "incident-details")
            .style("position", "absolute")
            .style("right", "20px")
            .style("top", "20px")
            .style("width", "250px")
            .style("background", "white")
            .style("border", "1px solid #ddd")
            .style("border-radius", "5px")
            .style("padding", "15px")
            .style("display", "none");
        
        vis.wrangleData();
    }

    setupSvg() {
        let vis = this;
        
        // Create SVG area
        vis.svg = d3.select('#' + vis.parentElement)
            .append("svg")
            .attr("class", "chart-svg");
            
        // Create group for content
        vis.chartGroup = vis.svg.append("g");
    }

    setupScales() {
        let vis = this;
        
        // Define color palette
        vis.colorPalette = [
            '#2C5784', '#5B9BD5', '#A5C8ED', '#7BA7D7', '#4281C4',
            '#1B365D', '#89A9D3', '#3E6DA3', '#6593C5', '#264D7E'
        ];

        // Create treemap layout
        vis.treemap = d3.treemap()
            .paddingTop(10)
            .paddingRight(2)
            .paddingBottom(2)
            .paddingLeft(2);
            
        vis.updateDimensions();
    }

    wrangleData() {
        let vis = this;
        
        // Filter out null/undefined sectors and count incidents
        const sectorCounts = d3.rollup(
            vis.displayData.filter(d => d.Cleaned_Sector), // Use displayData instead of data
            v => v.length,
            d => d.Cleaned_Sector
        );

        // Sort sectors by count for better visualization
        const sortedSectors = Array.from(sectorCounts, ([sector, count]) => ({
            name: sector,
            value: count,
            incidents: vis.displayData.filter(d => d.Cleaned_Sector === sector) // Store incidents for details
        })).sort((a, b) => b.value - a.value);

        // Convert to hierarchical format
        const hierarchicalData = {
            name: "AI Incidents",
            children: sortedSectors
        };

        // Create hierarchy and calculate values
        vis.root = d3.hierarchy(hierarchicalData)
            .sum(d => d.value)
            .sort((a, b) => b.value - a.value);

        // Update treemap with current dimensions
        vis.treemap.size([vis.width, vis.height]);
        vis.treemap(vis.root);
        
        vis.updateVis();
    }

    updateVis() {
        let vis = this;

        // Clear any existing content
        vis.chartGroup.selectAll("*").remove();

        // Create color scale
        vis.colorScale = d3.scaleOrdinal()
            .domain(vis.root.leaves().map(d => d.data.name))
            .range(vis.colorPalette);

        // Add rectangles for each leaf node
        const leaf = vis.chartGroup.selectAll("g")
            .data(vis.root.leaves())
            .join("g")
            .attr("transform", d => `translate(${d.x0},${d.y0})`);

        leaf.append("rect")
            .attr("width", d => d.x1 - d.x0)
            .attr("height", d => d.y1 - d.y0)
            .attr("fill", d => vis.colorScale(d.data.name))
            .style("cursor", "pointer")
            .on("mouseover", function() {
                d3.select(this)
                    .attr("fill", d => d3.color(vis.colorScale(d.data.name)).brighter(0.2));
            })
            .on("mouseout", function(event, d) {
                d3.select(this)
                    .attr("fill", vis.colorScale(d.data.name));
            })
            .on("click", function(event, d) {
                // Show incident details on click
                const incidents = d.data.incidents;
                if (incidents && incidents.length > 0) {
                    const randomIncident = incidents[Math.floor(Math.random() * incidents.length)];
                    vis.showIncidentDetails(randomIncident);
                }
            });

        // Add text labels with responsive sizing
        leaf.append("text")
            .selectAll("tspan")
            .data(d => {
                const name = d.data.name;
                const value = d.value;
                const width = d.x1 - d.x0;
                const height = d.y1 - d.y0;
                
                // Only show text if rectangle is large enough
                if (width < 60 || height < 30) return [];
                if (width < 100) return [`${value}`]; // Show only value for medium sizes
                return [`${name}`, `(${value})`]; // Show both for large sizes
            })
            .join("tspan")
            .attr("x", 3)
            .attr("y", (d, i, nodes) => {
                const height = nodes[0].parentNode.__data__.y1 - nodes[0].parentNode.__data__.y0;
                // Center text vertically if only one line
                if (nodes.length === 1) return height / 2 + 5;
                // Otherwise spread lines
                return 13 + i * Math.min(15, height / 3);
            })
            .attr("fill", "white")
            .style("font-size", (d, i, nodes) => {
                const width = nodes[0].parentNode.__data__.x1 - nodes[0].parentNode.__data__.x0;
                return `${Math.min(12, width / 10)}px`;
            })
            .text(d => d);

        // Add text instruction
        vis.svg.append("text")
            .attr("class", "instruction-text")
            .attr("x", vis.width / 2)
            .attr("y", 20)
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .style("fill", "#666")
            .text("Click on a sector to see a sample incident");
    }

    updateDimensions() {
        let vis = this;
        
        // Update width and height from shared dimensions
        vis.width = sharedDimensions.width - vis.margin.left - vis.margin.right;
        vis.height = sharedDimensions.height - vis.margin.top - vis.margin.bottom;

        // Update SVG size
        vis.svg
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom);

        // Update transform
        vis.chartGroup.attr("transform", `translate(${vis.margin.left},${vis.margin.top})`);

        // Update treemap size if it exists
        if (vis.treemap) {
            vis.treemap.size([vis.width, vis.height]);
        }
    }

    resize() {
        let vis = this;
        vis.updateDimensions();
        vis.wrangleData(); // Need to recalculate treemap layout with new dimensions
    }

    showIncidentDetails(incident) {
        const vis = this;
        
        // Format incident details
        const details = `
            <h5>Sample Incident</h5>
            <p><strong>Sector:</strong> ${incident.Cleaned_Sector}</p>
            <p><strong>Date:</strong> ${d3.timeFormat("%B %d, %Y")(new Date(incident.date))}</p>
            <p><strong>Description:</strong> ${incident.description || 'No description available'}</p>
            <p><strong>Severity:</strong> ${incident.severity || 'Severity not specified'}</p>
        `;
        
        // Update and show the details panel
        vis.detailsPanel
            .html(details)
            .style("display", "block");
        
        // Add hover handling to keep panel visible
        vis.detailsPanel
            .on("mouseleave", () => {
                vis.detailsPanel.style("display", "none");
            });
    }

    // Update the filterByDate method to use displayData
    filterByDate(startDate, endDate) {
        const vis = this;
        
        // Filter data based on date range
        vis.displayData = vis.data.filter(d => {
            const date = new Date(d.date);
            return date >= startDate && date <= endDate;
        });
        
        // Update the visualization using existing wrangleData
        vis.wrangleData();
    }
}