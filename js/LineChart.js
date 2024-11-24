// Placeholder for line chart -- used in a number of different visualizations
class LineChart {
    constructor(containerId, data) {
        this.containerId = containerId;
        this.data = data;
        
        // Set up dimensions - make it bigger
        this.margin = {top: 60, right: 100, bottom: 60, left: 60};
        this.width = sharedDimensions.width - this.margin.left - this.margin.right;
        this.height = Math.min(500, sharedDimensions.height * 0.7) - this.margin.top - this.margin.bottom; // Increased height

        // Add title
        this.title = "AI Model Performance Progress on SWE-Bench";
        this.subtitle = "Red line shows the maximum score achieved to date";
        
        this.initVis();
    }

    initVis() {
        const vis = this;

        // Create SVG with more space for title
        vis.svg = d3.select(`#${vis.containerId}`)
            .append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append("g")
            .attr("transform", `translate(${vis.margin.left},${vis.margin.top})`);

        // Add title and subtitle
        vis.svg.append("text")
            .attr("class", "chart-title")
            .attr("x", vis.width / 2)
            .attr("y", -30)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .text(vis.title);

        vis.svg.append("text")
            .attr("class", "chart-subtitle")
            .attr("x", vis.width / 2)
            .attr("y", -10)
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .style("fill", "#666")
            .text(vis.subtitle);

        // Initialize scales
        vis.x = d3.scaleTime()
            .range([0, vis.width]);

        vis.y = d3.scaleLinear()
            .range([vis.height, 0]);

        // Initialize axes
        vis.xAxis = d3.axisBottom(vis.x)
            .tickFormat(d3.timeFormat("%b %Y"));

        vis.yAxis = d3.axisLeft(vis.y);

        // Add axes groups
        vis.xAxisG = vis.svg.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${vis.height})`);

        vis.yAxisG = vis.svg.append("g")
            .attr("class", "y-axis");

        // Add labels
        vis.svg.append("text")
            .attr("class", "x-label")
            .attr("text-anchor", "middle")
            .attr("x", vis.width / 2)
            .attr("y", vis.height + 40)
            .text("Evaluation Date");

        vis.svg.append("text")
            .attr("class", "y-label")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("x", -vis.height / 2)
            .attr("y", -40)
            .text("SWE-Bench Score (higher is better)");

        // Add tooltip with more detailed information
        vis.tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0)
            .style("position", "absolute")
            .style("background-color", "white")
            .style("border", "1px solid #ddd")
            .style("padding", "10px")
            .style("border-radius", "5px")
            .style("max-width", "300px");

        this.wrangleData();
    }

    wrangleData() {
        const vis = this;
        
        // Parse dates and convert scores to numbers
        vis.processedData = vis.data.map(d => ({
            name: d.cleaned_name,
            date: d3.timeParse("%m/%d/%y")(d.date),
            score: +d.score
        })).sort((a, b) => a.date - b.date);

        // Calculate running maximum score
        vis.maxScoreLine = [];
        let maxScore = -Infinity;
        const dateGroups = d3.group(vis.processedData, d => d.date.getTime());
        
        Array.from(dateGroups.entries())
            .sort(([a], [b]) => a - b)
            .forEach(([date, points]) => {
                const dateMaxScore = d3.max(points, d => d.score);
                maxScore = Math.max(maxScore, dateMaxScore);
                vis.maxScoreLine.push({
                    date: new Date(+date),
                    score: maxScore,
                    name: points.find(p => p.score === dateMaxScore)?.name
                });
            });

        this.updateVis();
    }

    updateVis() {
        const vis = this;

        // Update scales
        vis.x.domain(d3.extent(vis.processedData, d => d.date));
        vis.y.domain([0, d3.max(vis.processedData, d => d.score)]);

        // Update axes
        vis.xAxisG.call(vis.xAxis)
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end");
        vis.yAxisG.call(vis.yAxis);

        // Draw max score line
        const line = d3.line()
            .x(d => vis.x(d.date))
            .y(d => vis.y(d.score));

        vis.svg.selectAll(".max-score-line")
            .data([vis.maxScoreLine])
            .join("path")
            .attr("class", "max-score-line")
            .attr("fill", "none")
            .attr("stroke", "red")
            .attr("stroke-width", 2)
            .attr("d", line);

        // Add all points
        const points = vis.svg.selectAll(".point")
            .data(vis.processedData)
            .join("circle")
            .attr("class", "point")
            .attr("cx", d => vis.x(d.date))
            .attr("cy", d => vis.y(d.score))
            .attr("r", d => {
                // Make points on the max line slightly larger
                const isMax = vis.maxScoreLine.some(m => 
                    m.date.getTime() === d.date.getTime() && m.score === d.score);
                return isMax ? 6 : 4;
            })
            .attr("fill", d => {
                // Color points on the max line differently
                const isMax = vis.maxScoreLine.some(m => 
                    m.date.getTime() === d.date.getTime() && m.score === d.score);
                return isMax ? "red" : "steelblue";
            })
            .attr("opacity", d => {
                const isMax = vis.maxScoreLine.some(m => 
                    m.date.getTime() === d.date.getTime() && m.score === d.score);
                return isMax ? 1 : 0.6;
            });

        // Update tooltip behavior
        points
            .on("mouseover", function(event, d) {
                const isMax = vis.maxScoreLine.some(m => 
                    m.date.getTime() === d.date.getTime() && m.score === d.score);
                
                d3.select(this)
                    .attr("r", isMax ? 8 : 6)
                    .attr("opacity", 1);
                
                vis.tooltip
                    .style("opacity", 1)
                    .html(`
                        <strong>${d.name}</strong><br/>
                        <strong>Score:</strong> ${d.score.toFixed(1)}/100<br/>
                        <strong>Date:</strong> ${d3.timeFormat("%B %d, %Y")(d.date)}<br/>
                        ${isMax ? "<em>This was the highest score achieved at the time</em>" : ""}
                        <br/><small>Higher scores indicate better performance at understanding and modifying complex codebases</small>
                    `)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", function(event, d) {
                const isMax = vis.maxScoreLine.some(m => 
                    m.date.getTime() === d.date.getTime() && m.score === d.score);
                
                d3.select(this)
                    .attr("r", isMax ? 6 : 4)
                    .attr("opacity", isMax ? 1 : 0.6);
                
                vis.tooltip.style("opacity", 0);
            });
    }

    resize() {
        const vis = this;
        
        // Update width and height based on container
        vis.width = sharedDimensions.width - vis.margin.left - vis.margin.right;
        vis.height = Math.min(400, sharedDimensions.height/2) - vis.margin.top - vis.margin.bottom;

        // Update SVG dimensions
        vis.svg.select("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom);

        // Update scales
        vis.x.range([0, vis.width]);
        vis.y.range([vis.height, 0]);

        // Update labels
        vis.svg.select(".x-label")
            .attr("x", vis.width / 2)
            .attr("y", vis.height + 40);

        vis.svg.select(".y-label")
            .attr("x", -vis.height / 2);

        // Update visualization
        this.updateVis();
    }
}