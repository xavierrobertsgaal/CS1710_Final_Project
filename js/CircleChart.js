class CircleChart {
    constructor(parentElement, carbonData) {
        this.parentElement = parentElement;
        this.containerElement = document.getElementById(parentElement);
        this.carbonData = carbonData;
        
        // Initialize with shared dimensions
        this.width = sharedDimensions.width;
        this.height = sharedDimensions.height;
        
        this.originalPositions = [];
        
        this.initVis();
    }

    initVis() {
        let vis = this;
        
        // Set margins
        vis.margin = {top: 20, right: 20, bottom: 20, left: 20};
        
        vis.setupSvg();
        vis.setupScales();
        vis.setupSimulation();
        
        vis.wrangleData();
    }

    setupSvg() {
        let vis = this;
        
        // Create SVG area
        vis.svg = d3.select(`#${vis.parentElement}`)
            .append("svg")
            .attr("class", "chart-svg");
            
        // Create group for content
        vis.chartGroup = vis.svg.append("g");
        
        // Add button event listeners with state management
        const moveToBottomBtn = document.getElementById("moveToBottom");
        const resetForceBtn = document.getElementById("resetForce");
        
        if (moveToBottomBtn && resetForceBtn) {
            moveToBottomBtn.addEventListener("click", () => {
                moveToBottomBtn.classList.add('active');
                resetForceBtn.classList.remove('active');
                vis.alignCircles();
            });
            
            resetForceBtn.addEventListener("click", () => {
                resetForceBtn.classList.add('active');
                moveToBottomBtn.classList.remove('active');
                vis.resetSimulation();
            });
            
            // Set initial state
            resetForceBtn.classList.add('active');
        }

        // Create tooltip
        vis.tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0)
            .style("position", "absolute")
            .style("background", "white")
            .style("padding", "10px")
            .style("border", "1px solid gray")
            .style("border-radius", "5px")
            .style("pointer-events", "none");
    }

    setupScales() {
        let vis = this;
        
        // Create size scale
        vis.sizeScale = d3.scaleSqrt()
            .domain([0, d3.max(vis.carbonData, d => +d["Total Carbon Emission (g CO2e)"] || 0)])
            .range([5, 80]);
            
        vis.updateDimensions();
    }

    setupSimulation() {
        let vis = this;
        
        vis.simulation = d3.forceSimulation(vis.carbonData)
            .force("x", d3.forceX(vis.width / 2).strength(0.1))
            .force("y", d3.forceY(vis.height / 2).strength(0.1))
            .force("collision", d3.forceCollide(d => 
                vis.sizeScale(+d["Total Carbon Emission (g CO2e)"] || 0) + 2).strength(0.2))
            .force("center", d3.forceCenter(vis.width / 2, vis.height / 2))
            .alpha(0.1)
            .alphaDecay(1)
            .alphaMin(0.0001)
            .on("tick", () => vis.updateVis())
            .on("end", () => {
                // Store original positions when simulation first stabilizes
                if (vis.originalPositions.length === 0) {
                    vis.originalPositions = vis.carbonData.map(d => ({
                        id: d.incident_id,
                        x: d.x,
                        y: d.y
                    }));
                }
            });
    }

    wrangleData() {
        let vis = this;
        // No data processing needed for now
        vis.updateVis();
    }

    updateVis() {
        let vis = this;
        vis.renderCircles();
    }

    renderCircles() {
        let vis = this;

        // Bind data
        let circles = vis.chartGroup.selectAll("circle")
            .data(vis.carbonData);

        // Exit
        circles.exit().remove();

        // Helper function to ensure positive radius
        const getRadius = d => Math.max(2, vis.sizeScale(+d["Total Carbon Emission (g CO2e)"] || 0));

        // Update existing circles
        circles
            .attr("r", getRadius)
            .attr("cx", d => d.x)
            .attr("cy", d => d.y)
            .attr('fill', d => {
                if (d['Uses AI'] === 'Active') return '#ff4141';
                else if (d['Uses AI'] === 'Passive') return '#e1a25d';
                else return '#5c7077'
            });

        // Enter new circles
        circles.enter()
            .append("circle")
            .attr("r", getRadius)
            .attr("cx", d => d.x)
            .attr("cy", d => d.y)
            .attr("stroke", "black")
            .attr("stroke-width", 1)
            .attr("opacity", 0.7)
            .attr('fill', d => {
                if (d['Uses AI'] === 'Active') return '#ff4141';
                else if (d['Uses AI'] === 'Passive') return '#e1a25d';
                else return '#5c7077'
            })
            .on("mouseover", function (event, d) {
                d3.select(this)
                    .attr("opacity", 1)
                    .attr("stroke-width", 2);

                vis.tooltip
                    .style("opacity", 1)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 20) + "px")
                    .html(`
                        <strong>Task:</strong> ${d["Task Name"]}<br>
                        <strong>Total Emission:</strong> ${d["Total Carbon Emission (g CO2e)"]} g CO2e<br>
                        <strong>Duration:</strong> ${d["Duration (minutes)"]} min<br>
                        <strong>Uses AI:</strong> ${d["Uses AI"]}<br>
                        <strong>Frequency:</strong> ${d["Times"]} times/day
                    `);
            })
            .on("mouseout", function () {
                d3.select(this)
                    .attr("opacity", 0.7)
                    .attr("stroke-width", 1);

                vis.tooltip
                    .style("opacity", 0);
            });

        // Update simulation
        vis.simulation.nodes(vis.carbonData);
        vis.simulation.alpha(1).restart();
    }

    updateDimensions() {
        let vis = this;
        
        // Update width and height from shared dimensions
        vis.width = sharedDimensions.width - vis.margin.left - vis.margin.right;
        vis.height = sharedDimensions.height - vis.margin.top - vis.margin.bottom;

        // Calculate appropriate scale based on available space
        const minDimension = Math.min(vis.width, vis.height);
        const maxRadius = vis.sizeScale.range()[1];
        
        // If largest circle would be cut off, adjust scale
        if (maxRadius * 2 > minDimension * 0.4) { // 0.4 ensures some padding
            const scaleFactor = Math.max(0.1, (minDimension * 0.4) / (maxRadius * 2));
            vis.sizeScale.range([
                Math.max(2, vis.sizeScale.range()[0] * scaleFactor), // Minimum radius of 2
                Math.max(5, vis.sizeScale.range()[1] * scaleFactor)  // Minimum max radius of 5
            ]);
        } else {
            // Reset to default scale if space permits
            vis.sizeScale.range([5, 80]);
        }

        // Update SVG size
        vis.svg
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom);

        // Update transform
        vis.chartGroup.attr("transform", `translate(${vis.margin.left},${vis.margin.top})`);
    }

    resize() {
        let vis = this;
        vis.updateDimensions();
        vis.updateSimulationForces();
        vis.updateVis();
    }

    updateSimulationForces() {
        let vis = this;
        
        // Update collision force based on current scale
        vis.simulation
            .force("x", d3.forceX(vis.width / 2).strength(0.1))
            .force("y", d3.forceY(vis.height / 2).strength(0.1))
            .force("collision", d3.forceCollide(d => 
                vis.sizeScale(+d["Total Carbon Emission (g CO2e)"] || 0) + 2).strength(0.2))
            .force("center", d3.forceCenter(vis.width / 2, vis.height / 2))
            .alpha(0.3)
            .restart();
    }

    // Additional methods for specific interactions
    alignCircles() {
        let vis = this;

        // Define y positions for each category
        const yPositions = {
            Active: vis.height / 4,
            Passive: vis.height / 2,
            No: (3 * vis.height) / 4
        };

        // Group data by category for even horizontal positioning
        const groupedData = {
            Active: vis.carbonData.filter(d => d['Uses AI'] === 'Active'),
            Passive: vis.carbonData.filter(d => d['Uses AI'] === 'Passive'),
            No: vis.carbonData.filter(d => d['Uses AI'] === 'No')
        };

        // Define spacing for each category
        const spacing = {
            Active: vis.width / (groupedData.Active.length + 1),
            Passive: vis.width / (groupedData.Passive.length + 1),
            No: vis.width / (groupedData.No.length + 1)
        };

        // Stop the simulation
        vis.simulation.stop();

        // Transition circles to their aligned positions
        vis.chartGroup.selectAll("circle")
            .transition()
            .duration(1000)
            .attr("cx", (d, i) => {
                if (d['Uses AI'] === 'Active') {
                    return spacing.Active * (groupedData.Active.indexOf(d) + 1);
                } else if (d['Uses AI'] === 'Passive') {
                    return spacing.Passive * (groupedData.Passive.indexOf(d) + 1);
                } else {
                    return spacing.No * (groupedData.No.indexOf(d) + 1);
                }
            })
            .attr("cy", d => {
                if (d['Uses AI'] === 'Active') return yPositions.Active;
                else if (d['Uses AI'] === 'Passive') return yPositions.Passive;
                else return yPositions.No;
            });
    }

    // Add new method to reset simulation
    resetSimulation() {
        let vis = this;
        
        // Stop current simulation
        vis.simulation.stop();

        // Transition circles back to their original positions
        vis.chartGroup.selectAll("circle")
            .transition()
            .duration(1000)
            .attr("cx", d => {
                const original = vis.originalPositions.find(p => p.id === d.incident_id);
                return original ? original.x : d.x;
            })
            .attr("cy", d => {
                const original = vis.originalPositions.find(p => p.id === d.incident_id);
                return original ? original.y : d.y;
            })
            .on("end", (d, i, nodes) => {
                // Update data positions after transition
                if (i === nodes.length - 1) {
                    vis.carbonData.forEach(d => {
                        const original = vis.originalPositions.find(p => p.id === d.incident_id);
                        if (original) {
                            d.x = original.x;
                            d.y = original.y;
                        }
                    });
                }
            });
    }
}

