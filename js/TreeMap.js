// Tree map used in AI incidents by sector visualization
class TreeMap {
    constructor({parentElement, data}) {
        this.parentElement = parentElement.replace('#', '');
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

        // Create color scale with new palette
        const colorScale = d3.scaleOrdinal()
            .domain(vis.root.leaves().map(d => d.data.name))
            .range(vis.colorPalette);

        // Draw rectangles
        const cell = vis.svg.selectAll("g")
            .data(vis.root.leaves())
            .join("g")
            .attr("transform", d => `translate(${d.x0},${d.y0})`);

        // Add rectangles with hover effects
        cell.append("rect")
            .attr("width", d => d.x1 - d.x0)
            .attr("height", d => d.y1 - d.y0)
            .attr("fill", d => colorScale(d.data.name))
            .attr("stroke", "white")
            .attr("stroke-width", 2)
            .style("cursor", "pointer")
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .attr("fill", d3.color(colorScale(d.data.name)).brighter(0.2));
                
                vis.tooltip
                    .style("opacity", 1)
                    .html(`
                        <div class="p-2">
                            <div class="fw-bold mb-1">${d.data.name}</div>
                            <div class="text-muted">${d.value} incidents</div>
                        </div>
                    `)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", function(event, d) {
                d3.select(this)
                    .attr("fill", colorScale(d.data.name));
                
                vis.tooltip.style("opacity", 0);
            });

        // Add labels with size-based visibility and text wrapping
        cell.append("text")
            .attr("class", "treemap-label")
            .attr("x", 4)
            .attr("y", 14)
            .each(function(d) {
                const node = d3.select(this);
                const rectWidth = d.x1 - d.x0;
                const rectHeight = d.y1 - d.y0;
                
                // Only show text if rectangle is big enough
                if (rectWidth > 60 && rectHeight > 30) {
                    // Calculate how many characters can fit on one line
                    const charsPerLine = Math.floor((rectWidth - 8) / 6); // Approximate char width of 6px
                    
                    // Split title into lines if needed
                    const title = d.data.name;
                    let lines = [];
                    if (title.length > charsPerLine) {
                        // Split into words
                        const words = title.split(' ');
                        let currentLine = words[0];
                        
                        for (let i = 1; i < words.length; i++) {
                            if (currentLine.length + words[i].length + 1 <= charsPerLine) {
                                currentLine += " " + words[i];
                            } else if (lines.length < 1) { // Only allow second line if we haven't added one yet
                                lines.push(currentLine);
                                currentLine = words[i];
                            } else {
                                currentLine += "...";
                                break;
                            }
                        }
                        lines.push(currentLine);
                    } else {
                        lines = [title];
                    }

                    // Add the text lines
                    node.selectAll("tspan")
                        .data([...lines, `${d.value} incidents`])
                        .join("tspan")
                        .attr("x", 4)
                        .attr("y", (_, i) => 14 + i * 12)
                        .attr("fill", "white")
                        .style("font-size", "10px")
                        .style("font-weight", (_, i) => i < lines.length ? "bold" : "normal")
                        .text(d => d);
                }
            });

        // Update text styling to use Montserrat
        cell.selectAll("text")
            .style("font-family", "Montserrat, sans-serif");
    }
}