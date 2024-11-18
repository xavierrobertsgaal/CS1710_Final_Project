class CircleChart {
    constructor(parentElement, carbonData) {
        this.parentElement = parentElement;
        this.carbonData = carbonData;

        this.initVis();
    }

    initVis() {
        let vis = this;

        // Set up margins
        vis.margin = {top: 20, right: 20, bottom: 20, left: 20};

        vis.width = document.getElementById(vis.parentElement).getBoundingClientRect().width - vis.margin.left - vis.margin.right;
        vis.height = document.getElementById(vis.parentElement).getBoundingClientRect().height - vis.margin.top - vis.margin.bottom;

        // Initialize SVG
        vis.svg = d3.select("#" + vis.parentElement)
            .append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append("g")
            .attr("transform", `translate(${vis.margin.left}, ${vis.margin.top})`);

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
            .range([5, 80]);

        // Set up force simulation
        vis.simulation = d3.forceSimulation(vis.carbonData)
            .force("x", d3.forceX(vis.width / 2).strength(0.1))
            .force("y", d3.forceY(vis.height / 2).strength(0.1))
            .force(
                "collision",
                d3.forceCollide(d => vis.sizeScale(+d["Total Carbon Emission (g CO2e)"] || 0) + 2).strength(0.2)
            )
            .force("center", d3.forceCenter(vis.width / 2, vis.height / 2))
            .alpha(0.1)
            .alphaDecay(1)
            .alphaMin(0.0001)
            .on("tick", () => vis.updateVis());

        // Initial rendering
        vis.updateVis();

        // Add button functionality
        document.getElementById("moveToBottom").addEventListener("click", () => vis.alignCircles());
        // document.getElementById("transformToArea").addEventListener("click", () => vis.transformToAreaChart());

    }

    updateVis() {
        let vis = this;

        // Bind data
        let circles = vis.svg.selectAll("circle")
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
                else if (d['Uses AI'] === 'Passive') return '#e1a25d';
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

    alignCircles() {
        let vis = this;

        // Define y positions for each category
        const yPositions = {
            Active: vis.height / 4,
            Passive: vis.height / 2,
            No: (3 * vis.height) / 4
        };


        // Update the force simulation to move circles into groups
        vis.simulation
            .force("x", d3.forceX(d => {
                // Align groups horizontally in the center
                return vis.width / 2;
            }).strength(0.1)) // Moderate strength for stability
            .force("y", d3.forceY(d => {
                // Align y positions based on category
                if (d['Uses AI'] === 'Active') return yPositions.Active;
                else if (d['Uses AI'] === 'Passive') return yPositions.Passive;
                else return yPositions.No;
            }).strength(0.1)) // Moderate strength for stability
            .force(
                "collision",
                d3.forceCollide(d => vis.sizeScale(+d["Total Carbon Emission (g CO2e)"] || 0) + 5).strength(0.1)
            ) // Prevent overlaps
            .alpha(0.1) // Moderate initial energy
            .alphaDecay(0.5) // Slow decay for smoother transitions
            .alphaMin(0.0001); // Allow time to stabilize

        // Restart the simulation to apply the new forces
        vis.simulation.alpha(0.5).restart();

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


        // Transition all circles to their final positions after stabilization
        setTimeout(() => {
            vis.simulation.stop();

            vis.svg.selectAll("circle")
                .transition()
                .duration(1000)
                .attr("cx", (d, i) => {
                    if (d['Uses AI'] === 'Active') {
                        // Position in the Active group
                        return spacing.Active * (groupedData.Active.indexOf(d) + 1);
                    } else if (d['Uses AI'] === 'Passive') {
                        // Position in the Passive group
                        return spacing.Passive * (groupedData.Passive.indexOf(d) + 1);
                    } else {
                        // Position in the No group
                        return spacing.No * (groupedData.No.indexOf(d) + 1);
                    }
                })
                .attr("cy", d => {
                    if (d['Uses AI'] === 'Active') return yPositions.Active; // Top group
                    else if (d['Uses AI'] === 'Passive') return yPositions.Passive; // Middle group
                    else return yPositions.No; // Bottom group
                });
        }, 2000);
    }
}

