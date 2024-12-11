// Tree map used in AI incidents by sector visualization
class TreeMap {
    constructor(parentElement, data) {
        let vis = this;
        vis.parentElement = parentElement;
        vis.containerElement = document.getElementById(parentElement);
        vis.data = data;
        vis.displayData = data;
        
        // Initialize with shared dimensions
        vis.width = sharedDimensions.width * 0.83;
        vis.height = sharedDimensions.height * 0.9;
        
        // Set margins
        vis.margin = { top: 40, right: 10, bottom: 60, left: 10 };

        // Initialize color scale
        vis.colorScale = d3.scaleOrdinal()
            .range([
                '#2563eb',  // Primary blue
                '#5c7077',  // Gray
                '#ff4141',  // Red
                '#16a34a',  // Green
                '#9333ea',  // Purple
                '#2C5784',  // Additional blues
                '#5B9BD5',
                '#A5C8ED',
                '#7BA7D7',
                '#4281C4'
            ]);

        // Create treemap layout
        vis.treemap = d3.treemap()
            .size([vis.width, vis.height])
            .paddingTop(10)
            .paddingRight(2)
            .paddingBottom(2)
            .paddingLeft(2);
        
        vis.initVis();
    }

    initVis() {
        let vis = this;
        
        // Initialize with shared dimensions
        vis.width = sharedDimensions.width * 0.9;
        vis.height = sharedDimensions.height * 1.2;
        
        // Create container div with flip capability
        vis.container = d3.select('#' + vis.parentElement)
            .append('div')
            .attr('class', 'flip-container')
            .style('width', vis.width + 'px')
            .style('height', vis.height + 'px')
            .style('perspective', '1000px')
            .style('position', 'absolute')
            .style('left', '50%')
            .style('top', '50%')
            .style('transform', 'translate(-50%, -50%)')
            .style('border-radius', '12px')
            .style('overflow-y', 'auto');

        vis.flipper = vis.container
            .append('div')
            .attr('class', 'flipper')
            .style('position', 'relative')
            .style('transform-style', 'preserve-3d')
            .style('transition', 'transform 0.6s')
            .style('width', '100%')
            .style('height', '100%');

        // Front side (TreeMap)
        vis.front = vis.flipper.append('div')
            .attr('class', 'front')
            .style('position', 'absolute')
            .style('width', '100%')
            .style('height', '100%')
            .style('backface-visibility', 'hidden');

        // Back side (Analysis)
        vis.back = vis.flipper.append('div')
            .attr('class', 'back')
            .style('position', 'absolute')
            .style('width', '100%')
            .style('height', '100%')
            .style('backface-visibility', 'hidden')
            .style('transform', 'rotateY(180deg)');
        
        // Setup SVG with new dimensions
        vis.svg = vis.front.append('svg')
            .attr('class', 'chart-svg')
            .attr('width', vis.width)
            .attr('height', vis.height)
            .style('background', '#ffffff');

        // Create chart group
        vis.chartGroup = vis.svg.append('g');

        // Add title
        vis.svg.append('text')
            .attr('class', 'chart-title')
            .attr('x', vis.width/2)
            .attr('y', 25)
            .attr('text-anchor', 'middle')
            .style('font-size', '16px')
            .style('fill', 'black')
            .text('Click on a sector to explore incidents');

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
        if (!vis.processedData || JSON.stringify(vis.lastDisplayData) !== JSON.stringify(vis.displayData)) {
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
                    incidents: incidents.map(d => ({
                        incident_id: d.incident_id,  // Add incident_id
                        date: new Date(d.date),
                        description: d.description,
                        severity: d.severity,
                        capability: d.Category,
                        autonomy: +d.Autonomy_Level_v1
                    })),
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

            // Store processed state and current data snapshot
            vis.processedData = true;
            vis.lastDisplayData = [...vis.displayData];
        }

        // Update treemap with current dimensions
        vis.treemap(vis.root);
        
        vis.updateVis();
    }

    updateVis() {
        let vis = this;
        vis.chartGroup.selectAll("*").remove();

        const leaves = vis.root.leaves();
        
        // Create groups
        const leaf = vis.chartGroup.selectAll("g")
            .data(leaves)
            .join("g")
            .attr("class", "tree-node")
            .attr("transform", d => `translate(${d.x0},${d.y0})`);

        // Add rectangles
        leaf.append("rect")
            .attr("width", d => Math.max(0, d.x1 - d.x0))
            .attr("height", d => Math.max(0, d.y1 - d.y0))
            .attr("fill", d => vis.colorScale(d.data.name))
            .attr("rx", d => {
                const isEdge = Math.abs(d.x0) < 1 || 
                              Math.abs(d.x1 - vis.width) < 1 || 
                              Math.abs(d.y0) < 1 || 
                              Math.abs(d.y1 - vis.height) < 1;
                return isEdge ? 8 : 0;
            })
            .attr("ry", d => {
                const isEdge = Math.abs(d.x0) < 1 || 
                              Math.abs(d.x1 - vis.width) < 1 || 
                              Math.abs(d.y0) < 1 || 
                              Math.abs(d.y1 - vis.height) < 1;
                return isEdge ? 8 : 0;
            })
            .style("cursor", "pointer")
            .on("click", (event, d) => {
                vis.flipper.node().style.transform = "rotateY(180deg)";
                vis.showAnalysis(d);
            });

        // Add text with proper wrapping and centering
        const textGroups = leaf.append("text")
            .attr("class", "tree-label")
            .style("fill", "white")
            .style("text-anchor", "middle")
            .style("dominant-baseline", "middle");

        textGroups.each(function(d) {
            const node = d3.select(this);
            const width = d.x1 - d.x0;
            const height = d.y1 - d.y0;
            
            // Skip if too small
            if (width < 50 || height < 40) return;

            // Calculate font size based on area
            const area = width * height;
            const fontSize = Math.min(
                14,  // max font size
                Math.max(10, Math.sqrt(area) / 25)  // dynamic sizing with minimum
            );

            // Split text into words and create lines
            const words = d.data.name.split(/\s+/);
            let lines = [];
            let currentLine = [];
            
            words.forEach(word => {
                currentLine.push(word);
                const testLine = currentLine.join(" ");
                const testWidth = testLine.length * fontSize * 0.6; // Approximate width
                
                if (testWidth > width - 20) {
                    if (currentLine.length === 1) {
                        lines.push(currentLine[0]);
                        currentLine = [];
                    } else {
                        currentLine.pop();
                        lines.push(currentLine.join(" "));
                        currentLine = [word];
                    }
                }
            });
            if (currentLine.length > 0) {
                lines.push(currentLine.join(" "));
            }

            // Calculate total height of text block
            const lineHeight = fontSize * 1.2;
            const totalHeight = lines.length * lineHeight + fontSize; // Extra space for count
            const startY = (height - totalHeight) / 2; // Center vertically

            // Add each line
            lines.forEach((line, i) => {
                node.append("tspan")
                    .attr("x", width / 2)
                    .attr("y", startY + (i * lineHeight) + fontSize)
                    .style("font-size", `${fontSize}px`)
                    .style("fill", "white")
                    .text(line);
            });

            // Add count on new line
            node.append("tspan")
                .attr("x", width / 2)
                .attr("y", startY + (lines.length * lineHeight) + fontSize)
                .style("font-size", `${fontSize - 2}px`)
                .style("fill", "white")
                .text(`(${d.value})`);
        });
    }

    updateDimensions() {
        let vis = this;
        
        // Update width and height
        vis.width = sharedDimensions.width * 0.85;
        vis.height = sharedDimensions.height * 1.2; // Increased significantly

        // Update SVG size
        vis.svg
            .attr("width", vis.width)
            .attr("height", vis.height)
            .style("border-radius", "12px"); // Round the SVG container

        // Update treemap size
        if (vis.treemap) {
            vis.treemap.size([vis.width, vis.height - 40]); // Reduced top padding
        }

        // Update chart group position
        vis.chartGroup.attr("transform", `translate(0,30)`); // Moved up slightly
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
        
        // Store current incident if flipper is showing
        let currentIncident = null;
        if (vis.flipper && vis.flipper.node().style.transform.includes('180deg')) {
            const incidentDetails = document.getElementById('incident-details');
            if (incidentDetails) {
                // Find the current sector
                const currentSector = vis.root.leaves().find(leaf => {
                    const sectorName = leaf.data.name;
                    return vis.back.html().includes(sectorName);
                });
                
                if (currentSector) {
                    // Get the currently displayed incident's description
                    const description = incidentDetails.querySelector('p:nth-child(2)').textContent.split(': ')[1];
                    // Find the incident in the current sector's data
                    currentIncident = currentSector.data.incidents.find(inc => 
                        inc.description === description
                    );
                }
            }
        }
        
        // Filter data based on date range
        vis.displayData = vis.data.filter(d => {
            const date = new Date(d.date);
            return date >= startDate && date <= endDate;
        });
        
        // Reset processed state to force rewrangling
        vis.processedData = false;
        
        // Rewrangle and update
        vis.wrangleData();
        
        // If we're currently showing analysis for a sector, update it
        if (vis.flipper && vis.flipper.node().style.transform.includes('180deg')) {
            // Find the currently displayed sector
            const currentSector = vis.root.leaves().find(leaf => {
                const sectorName = leaf.data.name;
                return vis.back.html().includes(sectorName);
            });
            
            if (currentSector) {
                vis.showAnalysis(currentSector, currentIncident);
            }
        }
    }

    showAnalysis(d, persistedIncident = null) {
        let vis = this;
        
        // Calculate statistics
        const totalIncidents = d.data.incidents.length;
        const avgAutonomy = (d3.mean(d.data.incidents, i => i.autonomy)).toFixed(1);
        
        // Get capability counts and sort alphabetically
        const capabilityCounts = d3.rollup(
            d.data.incidents,
            v => v.length,
            d => d.capability
        );

        // Create bar chart SVG with adjusted dimensions
        const margin = {top: 30, right: 40, bottom: 100, left: 60};
        const width = vis.width - margin.left - margin.right;
        const height = 160;  // Even shorter height
        
        const svg = d3.create('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom);
        
        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Get capability data array
        const data = Array.from(capabilityCounts, ([capability, count]) => ({
            capability,
            count
        })).sort((a, b) => a.capability.localeCompare(b.capability));

        // Create scales
        const x = d3.scaleBand()
            .domain(data.map(d => d.capability))
            .range([0, width])
            .padding(0.1);

        const y = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.count)])
            .range([height, 0]);

        // Add bars
        const bars = g.selectAll('.bar')
            .data(data)
            .join('rect')
            .attr('class', 'bar')
            .attr('x', d => x(d.capability))
            .attr('y', d => y(d.count))
            .attr('width', x.bandwidth())
            .attr('height', d => height - y(d.count))
            .attr('fill', vis.colorScale(d.data.name));

        // Add value labels on top of bars
        g.selectAll('.bar-label')
            .data(data)
            .join('text')
            .attr('class', 'bar-label')
            .attr('x', d => x(d.capability) + x.bandwidth()/2)
            .attr('y', d => y(d.count) - 5)  // Position above bar
            .attr('text-anchor', 'middle')
            .style('fill', 'var(--text-dark)')
            .style('font-size', '12px')
            .text(d => d.count);

        // Add axes with proper styling
        g.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .selectAll('text')
            .style('text-anchor', 'end')
            .style('fill', 'var(--text-dark)')
            .attr('dx', '-.8em')
            .attr('dy', '.15em')
            .attr('transform', 'rotate(-45)');

        g.append('g')
            .call(d3.axisLeft(y))
            .selectAll('text')
            .style('fill', 'var(--text-dark)')
            .style('font-size', '12px')
            ;

        // add y axis label
        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', -margin.left + 20)
            .attr('x', -height + 25)
            .style('fill', 'var(--text-dark)')
            .style('font-size', '10px')
            .text('Number of Incidents');

        // Handle incident selection
        let incident;
        if (persistedIncident && d.data.incidents.some(inc => 
            inc.incident_id === persistedIncident.incident_id
        )) {
            // Keep the persisted incident if it's still in the filtered dataset
            incident = persistedIncident;
        } else {
            // Otherwise get a new random incident
            incident = d.data.incidents[Math.floor(Math.random() * d.data.incidents.length)];
        }

        // Add event listener for resampling
        document.addEventListener('resampleIncident', function(e) {
            if (e.detail === d.data.name) {
                incident = d.data.incidents[Math.floor(Math.random() * d.data.incidents.length)];
                const detailsDiv = document.getElementById('incident-details');
                if (detailsDiv) {
                    detailsDiv.innerHTML = `
                        <p style="color: var(--text-dark); margin: 8px 0;"><strong>Date:</strong> ${incident.date ? new Date(incident.date).toLocaleDateString() : 'Unknown'}</p>
                        <p style="color: var(--text-dark); margin: 8px 0;"><strong>Description:</strong> ${incident.description || 'No description available'}</p>
                        <p style="color: var(--text-dark); margin: 8px 0;"><strong>Severity:</strong> ${incident.severity || 'Not specified'}</p>
                    `;
                }
            }
        });

        // Update back content with proper text colors and event handling
        vis.back.html(`
            <div style="padding: 20px; background: white; height: 100%; border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                    <h2 style="margin: 0; color: ${vis.colorScale(d.data.name)}; font-size: 24px;">
                        ${d.data.name} Sector
                    </h2>
                    <button onclick="this.closest('.flipper').style.transform = 'rotateY(0deg)'" 
                        class="btn-outline-primary">
                        Back to Map
                    </button>
                </div>

                <div style="display: flex; justify-content: space-around; margin: 20px 0;">
                    <div class="stat-box">
                        <h4 style="color: var(--text-dark); font-size: 16px; margin-bottom: 8px;">Total Incidents</h4>
                        <p style="color: ${vis.colorScale(d.data.name)}; font-size: 20px; margin: 0; font-weight: 700;">${totalIncidents}</p>
                    </div>
                    <div class="stat-box">
                        <h4 style="color: var(--text-dark); font-size: 16px; margin-bottom: 8px;">Avg. Autonomy Level</h4>
                        <p style="color: ${vis.colorScale(d.data.name)}; font-size: 20px; margin: 0; font-weight: 700;">${avgAutonomy}/5</p>
                    </div>
                </div>

                <div style="margin: 25px 0;">
                    <h4 style="color: var(--text-dark); font-size: 16px; margin-bottom: 15px;">AI Capabilities Involved in Incidents</h4>
                    ${svg.node().outerHTML}
                </div>

                <div style="color: var(--text-dark);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <h4 style="color: var(--text-dark); font-size: 16px; margin: 0;">Sample Incident</h4>
                        <button onclick="document.dispatchEvent(new CustomEvent('resampleIncident', {detail: '${d.data.name}'}))"
                            class="btn-outline-primary">
                            New Sample
                        </button>
                    </div>
                    <div id="incident-details" style="color: var(--text-dark);">
                        <p style="color: var(--text-dark); margin: 8px 0;"><strong>Date:</strong> ${incident.date ? new Date(incident.date).toLocaleDateString() : 'Unknown'}</p>
                        <p style="color: var(--text-dark); margin: 8px 0;"><strong>Description:</strong> ${incident.description || 'No description available'}</p>
                        <p style="color: var(--text-dark); margin: 8px 0;"><strong>Severity:</strong> ${incident.severity || 'Not specified'}</p>
                    </div>
                </div>
            </div>
        `);
    }
}