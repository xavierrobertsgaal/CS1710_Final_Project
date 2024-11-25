class CircleChart {
    constructor(parentElement, carbonData) {
        this.parentElement = parentElement;
        this.carbonData = carbonData;
        this.margin = {top: 20, right: 20, bottom: 20, left: 20};
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

        // Initialize force simulation
        vis.initializeSimulation();

        // Add button functionality
        document.getElementById("moveToBottom").addEventListener("click", () => vis.alignCircles());

        // Initial rendering
        vis.wrangleData();
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
            .on("tick", () => vis.updateVis());
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
        d3.select("#" + this.parentElement).style("display", "none");
    }

    show() {
        d3.select("#" + this.parentElement).style("display", "block");
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

        // Update the force simulation to move circles into groups
        vis.simulation
            .force('charge', d3.forceManyBody().strength(5))
            .force("center", null)  // Remove center force
            .force("y", d3.forceY(d => {
                if (d['Uses AI'] === 'Active') return yPositions.Active;
                else if (d['Uses AI'] === 'Passive') return yPositions.Passive;
                else return yPositions.No;
            }).strength(0.5))
            .force(
                "collision",
                d3.forceCollide().radius(d => vis.sizeScale(+d["Total Carbon Emission (g CO2e)"]))
            )
            .alphaDecay(0.1);

        // Restart the simulation
        vis.simulation.alpha(1).restart();
    }
}

