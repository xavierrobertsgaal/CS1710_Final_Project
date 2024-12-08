class CircleChart2 {
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
            .range([5, 70]);

        // Set up force simulation
        // vis.simulation = d3.forceSimulation(vis.carbonData)
        //     .force("x", d3.forceX(vis.width / 2).strength(0.1))
        //     .force("y", d3.forceY(vis.height / 2).strength(0.1))
        //     .force(
        //         "collision",
        //         d3.forceCollide(d => vis.sizeScale(+d["Total Carbon Emission (g CO2e)"] || 0) )
        //     )
        //     .force("center", d3.forceCenter(vis.width / 2, vis.height / 2))
        //     .alpha(0.1)
        //     .alphaDecay(1)
        //     .alphaMin(0.0001)
        //     .on("tick", () => vis.updateVis());

        vis.simulation = d3.forceSimulation(vis.carbonData)
            .force("center", d3.forceCenter(vis.width / 2, vis.height / 2))
            .force('charge', d3.forceManyBody().strength(5))
            .force(
                "collision",
                d3.forceCollide().radius(d => vis.sizeScale(+d["Total Carbon Emission (g CO2e)"] ) )
            )
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
            Active: vis.height / 6,
            Passive: vis.height / 2,
            No: (5 * vis.height) / 6
        };

        const yPositions_after = {
            Active: vis.height / 6,
            Passive: 3 * vis.height / 7,
            No: (5 * vis.height) / 6
        }

        // Define constants for layout
        const FIXED_SPACING = 2; // Space between circles
        const ROW_SPACING = 75;  // Space between rows
        const MARGIN = 50; // Margin from edges



        // Update the force simulation to move circles into groups
        vis.simulation
            .force('charge', d3.forceManyBody().strength(5))
            .force("y", d3.forceY(d => {
                if (d['Uses AI'] === 'Active') return yPositions.Active;
                else if (d['Uses AI'] === 'Passive') return yPositions.Passive;
                else return yPositions.No;
            }).strength(0.5))
            .force(
                "collision",
                d3.forceCollide().radius(d => vis.sizeScale(+d["Total Carbon Emission (g CO2e)"]) )
            )
            // .alpha(4)
            .alphaDecay(0.6)
            .on("tick", () => vis.updateVis());
        // .alphaMin(0.0001);

        // Restart the simulation to apply the new forces
        vis.simulation.alpha(0.5).restart();

        // Group data by category for even horizontal positioning
        const groupedData = {
            Active: vis.carbonData
                .filter(d => d['Uses AI'] === 'Active')
                .sort((a, b) => (+a["Total Carbon Emission (g CO2e)"]) - (+b["Total Carbon Emission (g CO2e)"])),
            Passive: vis.carbonData
                .filter(d => d['Uses AI'] === 'Passive')
                .sort((a, b) => (+a["Total Carbon Emission (g CO2e)"]) - (+b["Total Carbon Emission (g CO2e)"])),
            No: vis.carbonData
                .filter(d => d['Uses AI'] === 'No')
                .sort((a, b) => (+a["Total Carbon Emission (g CO2e)"]) - (+b["Total Carbon Emission (g CO2e)"])),
        };

        // Calculate positions for each category
        const calculatePositions = (data, baseY) => {
            let positions = new Map();
            let rows = [[]];
            let currentRow = 0;
            let currentRowWidth = 0;

            // First pass: organize circles into rows
            data.forEach((d) => {
                const radius = vis.sizeScale(+d["Total Carbon Emission (g CO2e)"]);
                const circleWidth = radius * 2 + FIXED_SPACING;

                // Check if we need to start a new row
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

            // Second pass: calculate centered positions for each row
            rows.forEach((row, rowIndex) => {
                // Calculate total width of current row (excluding last spacing)
                const rowWidth = row.reduce((sum, circle) => sum + circle.width, 0) - FIXED_SPACING;
                // Calculate starting X position to center the row
                let startX = (vis.width - rowWidth) / 2;
                let currentX = startX;

                row.forEach((circle) => {
                    positions.set(circle.data, {
                        x: currentX + circle.radius,
                        y: baseY + (rowIndex * ROW_SPACING)
                    });
                    currentX += circle.width;
                });
            });

            return positions;
        };

        // Calculate positions for each category
        const activePositions = calculatePositions(groupedData.Active, yPositions_after.Active);
        const passivePositions = calculatePositions(groupedData.Passive, yPositions_after.Passive);
        const noPositions = calculatePositions(groupedData.No, yPositions_after.No);


        // Transition all circles to their final positions after stabilization
        setTimeout(() => {
            vis.simulation.stop();

            vis.svg.selectAll("circle")
                .transition()
                .duration(1000)
                .attr("cx", d => {
                    if (d['Uses AI'] === 'Active') return activePositions.get(d).x;
                    if (d['Uses AI'] === 'Passive') return passivePositions.get(d).x;
                    return noPositions.get(d).x;
                })
                .attr("cy", d => {
                    if (d['Uses AI'] === 'Active') return activePositions.get(d).y;
                    if (d['Uses AI'] === 'Passive') return passivePositions.get(d).y;
                    return noPositions.get(d).y;
                });
        }, 3000);
    }
}

