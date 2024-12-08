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
        vis.margin = { top: 40, right: 10, bottom: 60, left: 10 };
        
        vis.initVis();
    }

    initVis() {
        let vis = this;
        vis.setupSvg();
        vis.setupScales();
        vis.setupTooltip();
        
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
            .style('border-radius', '8px')
            .style('pointer-events', 'none')
            .style('font-family', 'Montserrat, sans-serif')
            .style('box-shadow', '0 4px 12px rgba(0,0,0,0.15)')
            .style('z-index', '1000');
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

        // Add instruction text at the top
        vis.svg.append("text")
            .attr("class", "instruction-text")
            .attr("x", vis.width / 2)
            .attr("y", 25)
            .attr("text-anchor", "middle")
            .style("font-size", "1.1rem")
            .style("fill", "#111")
            .style("font-weight", "500")
            .text("Click on any sector to see a sample incident");

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
                
                // Show basic sector info
                vis.tooltip
                    .style('pointer-events', 'none')
                    .style('width', 'auto')
                    .style("opacity", 1)
                    .html(`<strong>${d.data.name}</strong><br>${d.value} incidents`)
                    .style("left", (event.pageX + 5) + "px")
                    .style("top", (event.pageY - 5) + "px");
            })
            .on("mouseout", function(event, d) {
                // Only reset fill and hide tooltip if not in expanded state
                if (!vis.tooltip.classed('expanded')) {
                    d3.select(this)
                        .attr("fill", vis.colorScale(d.data.name));
                    vis.tooltip.style("opacity", 0);
                }
            })
            .on("click", function(event, d) {
                event.preventDefault();
                event.stopPropagation();
                if (d.data.incidents && d.data.incidents.length > 0) {
                    const randomIndex = Math.floor(Math.random() * d.data.incidents.length);
                    const incident = d.data.incidents[randomIndex];
                    
                    // Show expanded incident details
                    vis.tooltip
                        .classed('expanded', true)
                        .style('pointer-events', 'all')
                        .style('width', '300px')
                        .html(`
                            <div class="incident-content">
                                <button class="btn-close" style="position:absolute;top:10px;right:10px;background:none;border:none;cursor:pointer;font-size:20px;color:#666;">×</button>
                                <h5 style="font-size: 1rem; margin-bottom: 0.75rem;">Sample Incident</h5>
                                <p style="font-size: 0.9rem; margin-bottom: 0.5rem;"><strong>Sector:</strong> ${incident.Cleaned_Sector || 'Unknown'}</p>
                                <p style="font-size: 0.9rem; margin-bottom: 0.5rem;"><strong>Date:</strong> ${incident.date ? new Date(incident.date).toLocaleDateString() : 'Date unknown'}</p>
                                <p style="font-size: 0.9rem; margin-bottom: 0.5rem;"><strong>Description:</strong> ${incident.description || incident.Description || 'No description available'}</p>
                                <p style="font-size: 0.9rem; margin-bottom: 0.5rem;"><strong>Severity:</strong> ${incident.severity || incident.Severity || 'Not specified'}</p>
                            </div>
                        `)
                        .style("left", (event.pageX + 5) + "px")
                        .style("top", (event.pageY - 5) + "px");

                    // Add close button functionality
                    vis.tooltip.select('.btn-close').on('click', () => {
                        vis.tooltip
                            .classed('expanded', false)
                            .style('pointer-events', 'none')
                            .style("opacity", 0);
                        d3.select(this)
                            .attr("fill", vis.colorScale(d.data.name));
                    });

                    // Add click-outside-to-close functionality
                    d3.select('body').on('click.tooltip', function(event) {
                        if (!event.target.closest('.tooltip')) {
                            vis.tooltip
                                .classed('expanded', false)
                                .style('pointer-events', 'none')
                                .style("opacity", 0);
                            d3.select(this)
                                .attr("fill", vis.colorScale(d.data.name));
                            d3.select('body').on('click.tooltip', null);
                        }
                    });
                }
            });

        // Add text labels
        vis.addTextLabels(leaf);
    }

    addTextLabels(leaf) {
        let vis = this;
        
        const textGroups = leaf.append("text")
            .attr("text-anchor", "middle")
            .attr("x", d => (d.x1 - d.x0) / 2);

        textGroups.selectAll("tspan")
            .data(d => {
                const name = d.data.name;
                const value = d.value;
                const width = d.x1 - d.x0;
                const height = d.y1 - d.y0;
                
                if (width < 60 || height < 30) return [];
                
                // Smart text wrapping function
                function wrapText(text, maxCharsPerLine) {
                    const words = text.split(' ');
                    const lines = [];
                    let currentLine = [];
                    let currentLength = 0;
                    
                    words.forEach(word => {
                        // Special handling for '&' to keep connected phrases together
                        if (word === '&') {
                            currentLine.push(word);
                            return;
                        }
                        
                        const wordLength = word.length;
                        if (currentLength + wordLength + currentLine.length > maxCharsPerLine && currentLine.length > 0) {
                            lines.push(currentLine.join(' '));
                            currentLine = [word];
                            currentLength = wordLength;
                        } else {
                            currentLine.push(word);
                            currentLength += wordLength;
                        }
                    });
                    
                    if (currentLine.length > 0) {
                        lines.push(currentLine.join(' '));
                    }
                    return lines;
                }
                
                // Determine optimal line length based on box width
                const maxCharsPerLine = Math.max(10, Math.floor(width / 10));
                const lines = wrapText(name, maxCharsPerLine);
                
                // Add count as final line
                lines.push(`(${value})`);
                return lines;
            })
            .join("tspan")
            .attr("x", function() {
                const parentNode = d3.select(this.parentNode);
                const parentData = parentNode.datum();
                return (parentData.x1 - parentData.x0) / 2;
            })
            .attr("y", function(d, i) {
                const parentNode = d3.select(this.parentNode);
                const parentData = parentNode.datum();
                const height = parentData.y1 - parentData.y0;
                const totalLines = this.parentNode.childNodes.length;
                const lineHeight = 16; // Fixed, tighter line spacing
                const totalHeight = lineHeight * (totalLines - 1);
                const startY = (height - totalHeight) / 2;
                return startY + (i * lineHeight);
            })
            .attr("fill", "white")
            .style("font-size", function(d) {
                // Just two fixed sizes
                if (d.startsWith('(')) {
                    return "12px"; // Count size
                }
                return "14px"; // Title size
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