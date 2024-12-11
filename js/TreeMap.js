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
        
        // Update dimensions to be larger
        vis.width = sharedDimensions.width * 0.95;   
        vis.height = sharedDimensions.height * 0.85;  
        
        // Define categorical color scale with consistent palette
        vis.colorScale = d3.scaleOrdinal()
            .domain([
                'Information & Communication', 'Technology & IT Services', 
                'Law Enforcement & Public Safety', 'Education', 
                'Public Administration & Defense', 'Arts, Entertainment & Recreation',
                'Health & Social Services', 'Manufacturing & Industrial',
                'Retail & E-commerce', 'Transportation', 'Other/Unclear'
            ])
            .range([
                '#2563eb', '#dc2626', '#16a34a', '#9333ea',
                '#2C5784', '#5B9BD5', '#A5C8ED', '#7BA7D7',
                '#4281C4', '#1B365D', '#89A9D3'
            ]);
        
        // Setup SVG and groups as before
        vis.svg = d3.select('#' + vis.parentElement)
            .append("svg")
            .attr("class", "chart-svg")
            .attr("width", vis.width)
            .attr("height", vis.height);

        vis.chartGroup = vis.svg.append("g")
            .attr("transform", `translate(0,40)`);

        // Update treemap layout
        vis.treemap = d3.treemap()
            .size([vis.width, vis.height - 60])
            .paddingTop(14)
            .paddingRight(3)
            .paddingBottom(3)
            .paddingLeft(3);

        // Add title
        vis.svg.append("text")
            .attr("class", "chart-title")
            .attr("x", vis.width/2)
            .attr("y", 25)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("fill", "black")
            .text("Click on a sector to explore incidents");

        // Setup enhanced tooltip
        vis.tooltip = d3.select('body').append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0)
            .style('width', '400px')  // Wider to accommodate new content
            .style('padding', '15px');

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

            // Store processed state
            vis.processedData = true;
            vis.lastDisplayData = vis.displayData;
        }

        // Update treemap with current dimensions
        vis.treemap(vis.root);
        
        vis.updateVis();
    }

    updateVis() {
        let vis = this;
        vis.chartGroup.selectAll("*").remove();

        const leaf = vis.chartGroup.selectAll("g")
            .data(vis.root.leaves())
            .join("g")
            .attr("class", "tree-node")
            .attr("transform", d => `translate(${d.x0},${d.y0})`);

        // Add rectangles - removed hover
        leaf.append("rect")
            .attr("width", d => d.x1 - d.x0)
            .attr("height", d => d.y1 - d.y0)
            .attr("fill", d => vis.colorScale(d.data.name))
            .style("cursor", "pointer")
            .on("click", function(event, d) {
                event.preventDefault();
                event.stopPropagation();
                
                if (d.data.incidents && d.data.incidents.length > 0) {
                    const avgAutonomy = d3.mean(d.data.incidents, i => i.autonomy_level) || 0;
                    const categories = d3.rollup(d.data.incidents, 
                        v => v.length, 
                        i => i.Category || 'Unknown'
                    );
                    
                    const randomIndex = Math.floor(Math.random() * d.data.incidents.length);
                    const incident = d.data.incidents[randomIndex];
                    
                    // Improved bar chart dimensions
                    const margin = {top: 20, right: 20, bottom: 60, left: 60};
                    const width = 320;
                    const height = 180;
                    
                    const svg = d3.create('svg')
                        .attr('width', width + margin.left + margin.right)
                        .attr('height', height + margin.top + margin.bottom)
                        .append('g')
                        .attr('transform', `translate(${margin.left},${margin.top})`);
                    
                    const x = d3.scaleBand()
                        .domain([...categories.keys()])
                        .range([0, width])
                        .padding(0.2);
                    
                    const y = d3.scaleLinear()
                        .domain([0, d3.max(categories.values())])
                        .nice()
                        .range([height, 0]);
                    
                    // Add bars
                    svg.selectAll('rect')
                        .data(categories)
                        .join('rect')
                        .attr('x', d => x(d[0]))
                        .attr('y', d => y(d[1]))
                        .attr('width', x.bandwidth())
                        .attr('height', d => height - y(d[1]))
                        .attr('fill', vis.colorScale(d.data.name));
                    
                    // Add x axis with rotated labels
                    svg.append('g')
                        .attr('transform', `translate(0,${height})`)
                        .call(d3.axisBottom(x))
                        .selectAll('text')
                        .attr('transform', 'rotate(-45)')
                        .style('text-anchor', 'end')
                        .attr('dx', '-.8em')
                        .attr('dy', '.15em')
                        .style('font-size', '10px');
                    
                    // Add y axis
                    svg.append('g')
                        .call(d3.axisLeft(y).ticks(5));
                    
                    // Enhanced tooltip with better styling
                    vis.tooltip
                        .style('opacity', 1)
                        .style('left', (event.pageX + 10) + 'px')
                        .style('top', (event.pageY - 10) + 'px')
                        .style('width', '400px')
                        .html(`
                            <div style="padding: 15px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                                    <h3 style="margin: 0; font-size: 18px;">Sector Analysis: ${d.data.name}</h3>
                                    <button class="btn-close" style="border: none; background: none; font-size: 20px; cursor: pointer;">×</button>
                                </div>
                                
                                <div style="display: flex; justify-content: space-between; margin: 20px 0; background: #f8f9fa; padding: 15px; border-radius: 8px;">
                                    <div style="text-align: center;">
                                        <h4 style="margin: 0; font-size: 14px; color: #666;">Average Autonomy Level</h4>
                                        <div style="font-size: 28px; font-weight: bold; color: ${vis.colorScale(d.data.name)};">
                                            ${avgAutonomy.toFixed(1)}/5
                                        </div>
                                    </div>
                                    <div style="text-align: center;">
                                        <h4 style="margin: 0; font-size: 14px; color: #666;">Total Incidents</h4>
                                        <div style="font-size: 28px; font-weight: bold; color: ${vis.colorScale(d.data.name)};">
                                            ${d.data.value}
                                        </div>
                                    </div>
                                </div>
                                
                                <div style="margin: 20px 0;">
                                    <h4 style="margin: 0 0 10px 0; font-size: 14px; color: #666;">AI Categories Distribution</h4>
                                    ${svg.node().outerHTML}
                                </div>
                                
                                <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #dee2e6;">
                                    <h4 style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Sample Incident</h4>
                                    <p style="margin: 5px 0; font-size: 12px;"><strong>Date:</strong> ${incident.date ? new Date(incident.date).toLocaleDateString() : 'Unknown'}</p>
                                    <p style="margin: 5px 0; font-size: 12px;"><strong>Description:</strong> ${incident.description || 'No description available'}</p>
                                    <p style="margin: 5px 0; font-size: 12px;"><strong>Severity:</strong> ${incident.severity || 'Not specified'}</p>
                                </div>
                            </div>
                        `);
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
                if (d.startsWith('(')) {
                    return "12px";
                }
                return "14px";
            })
            .text(d => d);
    }

    updateDimensions() {
        let vis = this;
        
        // Update width and height
        vis.width = sharedDimensions.width * 0.95;
        vis.height = sharedDimensions.height * 0.85;

        // Update SVG size
        vis.svg
            .attr("width", vis.width)
            .attr("height", vis.height);

        // Update treemap size
        if (vis.treemap) {
            vis.treemap.size([vis.width, vis.height - 60]);
        }

        // Update chart group position
        vis.chartGroup.attr("transform", `translate(0,40)`);
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