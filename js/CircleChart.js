class CircleChart {
    constructor(parentElement, carbonData) {
        this.parentElement = parentElement;
        this.carbonData = carbonData;
        this.margin = {top: 20, right: 20, bottom: 40, left: 20};
        this.initVis();
    }

    initVis() {
        let vis = this;

        // Get initial dimensions
        vis.updateDimensions();

        // Initialize SVG
        vis.svg = d3.select("#" + vis.parentElement)
            .append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom )
            .append("g")
            .attr("transform", `translate(${vis.margin.left}, ${vis.margin.top})`);

        vis.svg.append("text")
            .attr("x", vis.width / 2)
            .attr("y", 10)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .text("AI Carbon Emission by Usage");

        // Store default force simulation settings
        vis.defaultSimulation = {
            center: d3.forceCenter(vis.width / 2, vis.height / 2),
            charge: d3.forceManyBody().strength(5),
            collision: d3.forceCollide().radius(d => vis.sizeScale(+d["Total Carbon Emission (g CO2e)"]))
        };

        // Tooltip
        vis.tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0)
            .style("position", "absolute")
            .style("background", "white")
            .style("padding", "10px")
            .style("border", "1px solid gray")
            .style("border-radius", "5px")
            .style("pointer-events", "none");

        // Create a size scale for circle radius
        vis.sizeScale = d3.scaleSqrt()
            .domain([0, d3.max(vis.carbonData, d => +d["Total Carbon Emission (g CO2e)"] || 0)])
            .range([5, 50]);

        // Initialize force simulation
        vis.initializeSimulation();

        // Initial rendering
        vis.wrangleData();

        // Add legends
        vis.addLegends();

        // Add button functionality
        document.getElementById("organizeClimate").classList.remove("btn-primary");
        document.getElementById("organizeClimate").classList.add("btn-outline-primary");
        document.getElementById("resetForce").classList.remove("btn-primary");
        document.getElementById("resetForce").classList.add("btn-outline-primary");
        document.getElementById("resetForce").style.backgroundColor = "#f8f9fa";

        document.getElementById("organizeClimate").addEventListener("click", () => {
            vis.alignCircles();
            document.getElementById("organizeClimate").classList.add("btn-primary");
            document.getElementById("organizeClimate").classList.remove("btn-outline-primary");
            document.getElementById("resetForce").classList.remove("btn-primary");
            document.getElementById("resetForce").classList.add("btn-outline-primary");
            document.getElementById("resetForce").style.backgroundColor = "";
        });

        document.getElementById("resetForce").addEventListener("click", () => {
            vis.resetSimulation();
            document.getElementById("resetForce").classList.add("btn-primary");
            document.getElementById("resetForce").classList.remove("btn-outline-primary");
            document.getElementById("resetForce").style.backgroundColor = "";
            document.getElementById("organizeClimate").classList.remove("btn-primary");
            document.getElementById("organizeClimate").classList.add("btn-outline-primary");
            document.getElementById("organizeClimate").style.backgroundColor = "#f8f9fa";
        });

    }

    initializeSimulation() {
        let vis = this;
        
        // Initialize force simulation
        vis.simulation = d3.forceSimulation(vis.carbonData)
            .force("center", d3.forceCenter(vis.width / 2, vis.height / 2))
            .force('charge', d3.forceManyBody().strength(5))
            .force(
                "collision",
                d3.forceCollide().radius(d => vis.sizeScale(+d["Total Carbon Emission (g CO2e)"])))
            .   on("tick", () => vis.updateVis());
    }

    addLegends() {
        let vis = this;

        // Add legend group at the bottom center
        const legendGroup = vis.svg.append("g")
            .attr("class", "legend-group")
            .attr("transform", `translate(${vis.width/2 - 225}, ${vis.height + 20})`);  // Centered position

        // Define legend data
        const legendData = [
            { label: "Active AI Use", color: "#ff4141" },
            { label: "Passive AI Use", color: "#2563eb" },
            { label: "No AI Use", color: "#5c7077" }
        ];

        // Create legend items
        const legendItems = legendGroup.selectAll(".legend-item")
            .data(legendData)
            .enter()
            .append("g")
            .attr("class", "legend-item")
            .attr("transform", (d, i) => `translate(${i * 150}, 0)`);

        // Add circles to legend with a specific class
        legendItems.append("circle")
            .attr("class", "legend-circle")  // Add this class
            .attr("r", 10)
            .attr("fill", d => d.color)
            .attr("stroke", "black")
            .attr("stroke-width", 1)
            .attr("opacity", 0.7);

        // Add text to legend
        legendItems.append("text")
            .attr("x", 25)
            .attr("y", 4)
            .style("font-size", "14px")
            .style("font-family", "sans-serif")
            .text(d => d.label);
    }

    resetSimulation() {
        let vis = this;

        // Stop current simulation
        if (vis.simulation) {
            vis.simulation.stop();
        }

        // Reset to default force simulation
        vis.simulation = d3.forceSimulation(vis.carbonData)
            .force("center", vis.defaultSimulation.center)
            .force("charge", vis.defaultSimulation.charge)
            .force("collision", vis.defaultSimulation.collision)
            .on("tick", () => vis.updateVis());

        // Restart simulation
        vis.simulation.alpha(1).restart();
    }

    wrangleData() {
        let vis = this;
        // Process data if needed
        vis.updateVis();
    }

    updateDimensions() {
        let vis = this;
        
        // Get container dimensions
        const container = document.getElementById(vis.parentElement);
        if (!container) return;
        
        const rect = container.getBoundingClientRect();
        vis.width = rect.width - vis.margin.left - vis.margin.right;
        vis.height = rect.height - vis.margin.top - vis.margin.bottom;

        // Update SVG dimensions
        if (vis.svg) {
            vis.svg
                .attr("width", vis.width + vis.margin.left + vis.margin.right)
                .attr("height", vis.height + vis.margin.top + vis.margin.bottom);
        }

        // Update simulation center force if it exists
        if (vis.simulation) {
            vis.simulation
                .force("center", d3.forceCenter(vis.width / 2, vis.height / 2))
                .alpha(0.3)
                .restart();
        }
    }

    resize() {
        let vis = this;
        vis.updateDimensions();
        vis.wrangleData();
    }

    hide() {
        let vis = this;
        // Properly hide the container
        d3.select("#" + this.parentElement)
            .style("display", "none")
            .style("visibility", "hidden");

        // Stop the simulation when hidden
        if (vis.simulation) {
            vis.simulation.stop();
        }
    }

    show() {
        let vis = this;
        // Show the container
        d3.select("#" + this.parentElement)
            .style("display", "block")
            .style("visibility", "visible");

        // Restart the simulation when shown
        if (vis.simulation) {
            vis.simulation
                .alpha(0.1)
                .restart();
        }

        // Make sure the visualization is properly updated
        vis.wrangleData();
    }

    updateVis() {
        let vis = this;

        // Bind data - only select data circles, not legend circles
        let circles = vis.svg.selectAll("circle:not(.legend-circle)")
            .data(vis.carbonData);

        // Exit
        circles.exit().remove();

        // Update existing circles
        circles
            .attr("r", d => vis.sizeScale(+d["Total Carbon Emission (g CO2e)"] || 0))
            .attr("cx", d => d.x)
            .attr("cy", d => d.y)
            .attr('fill', d => {
                if (d['Uses AI'] === 'Active') return '#ff4141';
                else if (d['Uses AI'] === 'Passive') return '#2563eb';
                else return '#5c7077'
            });

        // Enter new circles
        circles.enter()
            .append("circle")
            .attr("r", d => vis.sizeScale(+d["Total Carbon Emission (g CO2e)"] || 0))
            .attr("cx", d => d.x)
            .attr("cy", d => d.y)
            .attr("stroke", "black")
            .attr("stroke-width", 1)
            .attr("opacity", 0.7)
            .attr('fill', d => {
                if (d['Uses AI'] === 'Active') return '#ff4141';
                else if (d['Uses AI'] === 'Passive') return '#2563eb';
                else return '#5c7077'
            })
            .on("mouseover", function(event, d) {
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
            .on("mouseout", function() {
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


    alignCircles() {
        let vis = this;

        // Define y positions for each category
        const yPositions = {
            Active: vis.height / 6,
            Passive: vis.height / 2,
            No: (5 * vis.height) / 6
        };

        // Constants for layout
        const FIXED_SPACING = 2;
        const ROW_SPACING = 75;
        const MARGIN = 50;

        // First phase: Move to categorical groups
        vis.simulation
            .force('charge', d3.forceManyBody().strength(5))
            .force("y", d3.forceY(d => {
                if (d['Uses AI'] === 'Active') return yPositions.Active;
                else if (d['Uses AI'] === 'Passive') return yPositions.Passive;
                else return yPositions.No;
            }).strength(0.5))
            .force(
                "collision",
                d3.forceCollide().radius(d => vis.sizeScale(+d["Total Carbon Emission (g CO2e)"]))
            )
            .alphaDecay(0.6)
            .on("tick", () => vis.updateVis());

        vis.simulation.alpha(0.5).restart();

        // Group and sort all data
        const allData = [...vis.carbonData]
            .sort((a, b) => (+a["Total Carbon Emission (g CO2e)"]) - (+b["Total Carbon Emission (g CO2e)"]))
            .map((d, i) => ({...d, sortIndex: i}));

        // Group data by category
        const groupedData = {
            Active: allData.filter(d => d['Uses AI'] === 'Active'),
            Passive: allData.filter(d => d['Uses AI'] === 'Passive'),
            No: allData.filter(d => d['Uses AI'] === 'No')
        };

        // Calculate positions (previous calculation functions remain the same)
        const calculateRowPositions = (data, baseY) => {
            let positions = {};
            let rows = [[]];
            let currentRow = 0;
            let currentRowWidth = 0;

            data.forEach((d) => {
                const radius = vis.sizeScale(+d["Total Carbon Emission (g CO2e)"]);
                const circleWidth = radius * 2 + FIXED_SPACING;

                if (currentRowWidth + circleWidth > vis.width - MARGIN * 2) {
                    currentRow++;
                    rows[currentRow] = [];
                    currentRowWidth = 0;
                }

                rows[currentRow].push({
                    data: d,
                    radius: radius,
                    width: circleWidth
                });
                currentRowWidth += circleWidth;
            });

            rows.forEach((row, rowIndex) => {
                const rowWidth = row.reduce((sum, circle) => sum + circle.width, 0) - FIXED_SPACING;
                let startX = (vis.width - rowWidth) / 2;
                let currentX = startX;

                row.forEach((circle) => {
                    const id = circle.data["Task Name"];
                    positions[id] = {
                        x: currentX + circle.radius,
                        y: baseY + (rowIndex * ROW_SPACING)
                    };
                    currentX += circle.width;
                });
            });

            return positions;
        };

        const calculateLinePositions = (data) => {
            let positions = {};
            let currentX = MARGIN;

            data.forEach((d) => {
                const radius = vis.sizeScale(+d["Total Carbon Emission (g CO2e)"]);
                const id = d["Task Name"];
                positions[id] = {
                    x: currentX + radius,
                    y: vis.height / 2
                };
                currentX += radius * 2 + FIXED_SPACING;
            });

            return positions;
        };

        const groupPositions = {
            Active: calculateRowPositions(groupedData.Active, yPositions.Active),
            Passive: calculateRowPositions(groupedData.Passive, yPositions.Passive),
            No: calculateRowPositions(groupedData.No, yPositions.No)
        };

        const finalPositions = calculateLinePositions(allData);

        // Execute the two-phase animation
        setTimeout(() => {
            // Stop the simulation
            vis.simulation.stop();

            // First transition: Move to grouped rows
            vis.svg.selectAll("circle:not(.legend-circle)")
                .transition()
                .duration(1000)
                .attr("cx", d => {
                    const id = d["Task Name"];
                    const category = d['Uses AI'];
                    const positions = groupPositions[category];
                    return positions[id]?.x || d.x;
                })
                .attr("cy", d => {
                    const id = d["Task Name"];
                    const category = d['Uses AI'];
                    const positions = groupPositions[category];
                    return positions[id]?.y || d.y;
                })
                .on("end", function(d, i) {
                    // Only trigger the second phase when the last circle finishes
                    if (i === vis.carbonData.length - 1) {
                        // Second transition: Move to single sorted line
                        vis.svg.selectAll("circle")
                            .transition()
                            .duration(1000)
                            .delay(d => d.sortIndex * 50)  // Sequential delay based on size
                            .attr("cx", d => {
                                const id = d["Task Name"];
                                return finalPositions[id]?.x || d.x;
                            })
                            .attr("cy", d => {
                                const id = d["Task Name"];
                                return finalPositions[id]?.y || d.y;
                            });
                    }
                });
        }, 2000);
    }


}

