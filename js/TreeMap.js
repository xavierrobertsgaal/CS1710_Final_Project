// Tree map used in AI incidents by sector visualization
class TreeMap {
    constructor(parentElement, data) {
        let vis = this;
        vis.parentElement = parentElement;
        vis.containerElement = document.getElementById(parentElement);
        vis.data = data;
        vis.displayData = data; // Add this for filtering
        
        // Initialize with shared dimensions
        vis.width = sharedDimensions.width;
        vis.height = sharedDimensions.height;
        
        // Set margins
        vis.margin = { top: 40, right: 10, bottom: 40, left: 10 };
        
        vis.initVis();
    }

    initVis() {
        let vis = this;
        vis.setupSvg();
        vis.setupScales();
        vis.setupTooltip();
        vis.setupDetailsPanel();
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

    setupTooltip() {
        let vis = this;
        
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
    }

    setupDetailsPanel() {
        let vis = this;
        
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
    }

    wrangleData() {
        let vis = this;
        
        // Only process data if we haven't already or if displayData has changed
        if (!vis.processedData || vis.lastDisplayData !== vis.displayData) {
            // Filter out null/undefined sectors and count incidents
            const sectorCounts = d3.rollup(
                vis.displayData.filter(d => d.Cleaned_Sector),
                v => v.length,
                d => d.Cleaned_Sector
            );

            // Sort sectors by count for better visualization
            const sortedSectors = Array.from(sectorCounts, ([sector, count]) => {
                const incidents = vis.displayData.filter(d => d.Cleaned_Sector === sector);
                return {
                    name: sector,
                    value: count,
                    incidents: incidents
                };
            }).sort((a, b) => b.value - a.value);

            // Convert to hierarchical format
            const hierarchicalData = {
                name: "AI Incidents",
                children: sortedSectors
            };

            // Create hierarchy and calculate values
            vis.root = d3.hierarchy(hierarchicalData)
                .sum(d => d.value)
                .sort((a, b) => b.value - a.value);

            vis.processedData = true;
            vis.lastDisplayData = vis.displayData;
        }

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

        // Create group for each leaf
        const leaf = vis.chartGroup.selectAll("g")
            .data(vis.root.leaves())
            .join("g")
            .attr("class", "tree-node")
            .attr("transform", d => `translate(${d.x0},${d.y0})`);

        // Add rectangles and attach all interactions to them
        leaf.append("rect")
            .attr("width", d => d.x1 - d.x0)
            .attr("height", d => d.y1 - d.y0)
            .attr("fill", d => vis.colorScale(d.data.name))
            .style("cursor", "pointer")
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .attr("fill", d3.color(vis.colorScale(d.data.name)).brighter(0.2));
                
                vis.tooltip
                    .style("opacity", 1)
                    .html(`${d.data.name}: ${d.value} incidents`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", function(event, d) {
                d3.select(this)
                    .attr("fill", vis.colorScale(d.data.name));
                vis.tooltip.style("opacity", 0);
            })
            .on("click", function(event, d) {
                event.preventDefault();
                event.stopPropagation();
                if (d.data.incidents && d.data.incidents.length > 0) {
                    const randomIndex = Math.floor(Math.random() * d.data.incidents.length);
                    const incident = d.data.incidents[randomIndex];
                    vis.showIncidentDetails(incident);
                }
            });

        // Add text labels
        vis.addTextLabels(leaf);
    }

    addTextLabels(leaf) {
        let vis = this;
        
        leaf.append("text")
            .selectAll("tspan")
            .data(d => {
                const name = d.data.name;
                const value = d.value;
                const width = d.x1 - d.x0;
                const height = d.y1 - d.y0;
                
                if (width < 60 || height < 30) return [];
                if (width < 100) return [`${value}`];
                return [`${name}`, `(${value})`];
            })
            .join("tspan")
            .attr("x", 3)
            .attr("y", (d, i, nodes) => {
                const height = nodes[0].parentNode.__data__.y1 - nodes[0].parentNode.__data__.y0;
                if (nodes.length === 1) return height / 2 + 5;
                return 13 + i * Math.min(15, height / 3);
            })
            .attr("fill", "white")
            .style("font-size", (d, i, nodes) => {
                const width = nodes[0].parentNode.__data__.x1 - nodes[0].parentNode.__data__.x0;
                return `${Math.min(12, width / 10)}px`;
            })
            .text(d => d);
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
        // Don't rewrangle data, just update treemap and redraw
        vis.treemap.size([vis.width, vis.height]);
        vis.treemap(vis.root);
        vis.updateVis();
    }

    hide() {
        d3.select("#" + this.parentElement).style("display", "none");
    }

    show() {
        d3.select("#" + this.parentElement).style("display", "block");
    }

    showIncidentDetails(incident) {
        let vis = this;
        
        // Format incident details with error handling
        const details = `
            <h5>Sample Incident</h5>
            <p><strong>Sector:</strong> ${incident.Cleaned_Sector || 'Unknown'}</p>
            <p><strong>Date:</strong> ${incident.date ? new Date(incident.date).toLocaleDateString() : 'Date unknown'}</p>
            <p><strong>Description:</strong> ${incident.description || incident.Description || 'No description available'}</p>
            <p><strong>Severity:</strong> ${incident.severity || incident.Severity || 'Not specified'}</p>
        `;
        
        // Show the details panel with transition
        vis.detailsPanel
            .html(details)
            .style("opacity", 0)
            .style("display", "block")
            .transition()
            .duration(200)
            .style("opacity", 1);
        
        // Add close button
        vis.detailsPanel.append("button")
            .attr("class", "btn-close")
            .style("position", "absolute")
            .style("top", "10px")
            .style("right", "10px")
            .style("background", "none")
            .style("border", "none")
            .style("cursor", "pointer")
            .html("×")
            .on("click", () => {
                vis.detailsPanel
                    .transition()
                    .duration(200)
                    .style("opacity", 0)
                    .on("end", () => vis.detailsPanel.style("display", "none"));
            });
    }

    filterByDate(startDate, endDate) {
        let vis = this;
        
        // Filter data based on date range
        vis.displayData = vis.data.filter(d => {
            const date = new Date(d.date);
            return date >= startDate && date <= endDate;
        });
        
        vis.wrangleData();
    }
}