class AreaChart {
    constructor(parentElement, data) {
        let vis = this;
        vis.parentElement = parentElement;
        vis.data = data.map(d => ({
            date: new Date(d.date),
            severity: d.severity || 'Unknown',
            incident_id: d.incident_id
        }));
        
        // Store full dataset for filtering
        vis.allData = [...vis.data];
        
        // Group by severity levels in a logical order (high at bottom)
        vis.severityLevels = ["High", "Medium", "Low"];
        
        // Set ordinal color scale for severity levels
        vis.colorScale = d3.scaleOrdinal()
            .domain(["High", "Medium", "Low"])
            .range(['#2ca02c', '#ff7f0e', '#1f77b4']); // green, orange, blue

        // Standard margins
        vis.margin = { top: 40, right: 40, bottom: 100, left: 50 };
        
        vis.initVis();
    }

    initVis() {
        let vis = this;
        vis.setupSvg();
        vis.setupScales();
        vis.setupAxes();
        vis.wrangleData();
    }

    setupSvg() {
        let vis = this;
        
        // Create SVG area
        vis.svg = d3.select(`#${vis.parentElement}`)
            .append("svg")
            .attr("class", "chart-svg");
            
        // Create group for content
        vis.chartGroup = vis.svg.append("g")
            .attr("transform", `translate(${vis.margin.left},${vis.margin.top})`);
        
        // Add axes groups
        vis.chartGroup.append("g")
            .attr("class", "x-axis axis");

        vis.chartGroup.append("g")
            .attr("class", "y-axis axis");

        // Add legend group
        vis.legend = vis.chartGroup.append("g")
            .attr("class", "legend");
    }

    setupScales() {
        let vis = this;
        
        // Define severity colors
        vis.colorScale = d3.scaleOrdinal()
            .domain(['High', 'Medium', 'Low'])
            .range(['#ff4141', '#e1a25d', '#2563eb']);  // Red, Orange, Blue

        // Set up stack generator
        vis.stack = d3.stack()
            .keys(['High', 'Medium', 'Low']);

        // Initialize scales
        vis.x = d3.scaleTime();
        vis.y = d3.scaleLinear();

        vis.updateDimensions();
    }

    setupAxes() {
        let vis = this;

        // Create axis generators
        vis.xAxis = d3.axisBottom(vis.x);
        vis.yAxis = d3.axisLeft(vis.y);

        // Create axis groups
        vis.xAxisG = vis.chartGroup.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${vis.height})`);

        vis.yAxisG = vis.chartGroup.append("g")
            .attr("class", "y-axis");

        // Add labels
        vis.chartGroup.append("text")
            .attr("class", "y-axis-label")
            .attr("transform", "rotate(-90)")
            .attr("y", -60)
            .attr("x", -vis.height / 2)
            .style("text-anchor", "middle")
            .text("Number of Incidents");

        // Add title
        vis.chartGroup.append("text")
            .attr("class", "chart-title")
            .attr("x", vis.width / 2)
            .attr("y", -20)
            .style("text-anchor", "middle")
            .style("font-size", "16px")
            .text("AI-Related Security Incidents Over Time");

        // Create legend
        vis.legend = vis.chartGroup.append("g")
            .attr("class", "legend");

        vis.severityLevels = ['High', 'Medium', 'Low'];
        vis.severityDescriptions = {
            'High': 'Critical system compromises, major data breaches',
            'Medium': 'Limited system access, minor data exposure',
            'Low': 'Attempted breaches, minimal impact'
        };
    }

    wrangleData() {
        let vis = this;
        
        // Group data by year-month for smoother visualization
        let monthlyData = d3.rollup(vis.data,
            values => ({
                High: values.filter(d => d.severity === "High").length,
                Medium: values.filter(d => d.severity === "Medium").length,
                Low: values.filter(d => d.severity === "Low").length,
                date: d3.timeMonth(values[0].date)
            }),
            d => d3.timeMonth(d.date)
        );

        // Convert to array format and sort by date
        vis.aggregatedData = Array.from(monthlyData, ([_, data]) => data)
            .sort((a, b) => a.date - b.date);

        // Create stacked data
        vis.stackedData = vis.stack(vis.aggregatedData);

        // Calculate total for each month for y-axis domain
        vis.aggregatedData.forEach(d => {
            d.total = d.High + d.Medium + d.Low;
        });

        vis.updateVis();
    }

    updateVis() {
        let vis = this;

        // Update scales with proper domains
        vis.x.domain(d3.extent(vis.aggregatedData, d => d.date));
        vis.y.domain([0, d3.max(vis.aggregatedData, d => d.total)]);

        // Update axes
        vis.xAxisG.call(vis.xAxis)
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end");

        vis.yAxisG.call(vis.yAxis);

        // Draw stacked areas
        const area = d3.area()
            .x(d => vis.x(d.data.date))
            .y0(d => vis.y(d[0]))
            .y1(d => vis.y(d[1]));

        // Update areas with consistent colors
        const layers = vis.chartGroup.selectAll(".layer")
            .data(vis.stackedData);

        layers.enter()
            .append("path")
            .attr("class", "layer")
            .merge(layers)
            .style("fill", d => vis.colorScale(d.key))
            .style("opacity", 0.7)
            .transition()
            .duration(1000)
            .attr("d", area);

        layers.exit().remove();

        vis.updateLegend();
    }

    updateDimensions() {
        let vis = this;
        
        vis.width = sharedDimensions.width - vis.margin.left - vis.margin.right;
        vis.height = sharedDimensions.height - vis.margin.top - vis.margin.bottom;

        // Update SVG size
        vis.svg
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom);

        // Update scales ranges
        vis.x.range([0, vis.width]);
        vis.y.range([vis.height, 0]);
    }

    resize() {
        let vis = this;
        vis.updateDimensions();
        vis.updateVis();
    }

    hide() {
        d3.select("#" + this.parentElement).style("display", "none");
    }

    show() {
        d3.select("#" + this.parentElement).style("display", "block");
    }

    updateLegend() {
        let vis = this;
        
        // Position legend
        const useVertical = vis.width < 500;
        const legendX = useVertical ? vis.width - 150 : 0;
        const legendY = useVertical ? 0 : vis.height + 40;
        
        vis.legend.attr("transform", `translate(${legendX}, ${legendY})`);

        // Update legend items
        const legendItems = vis.legend.selectAll(".legend-item")
            .data(vis.severityLevels);

        // Enter new items
        const legendEnter = legendItems.enter()
            .append("g")
            .attr("class", "legend-item");

        // Update positions
        legendItems.merge(legendEnter)
            .attr("transform", (d, i) => useVertical 
                ? `translate(0, ${i * 40})`
                : `translate(${i * Math.min(200, vis.width / 3)}, 0)`);

        // Add/update rectangles
        legendEnter.append("rect")
            .merge(legendItems.select("rect"))
            .attr("width", 20)
            .attr("height", 20)
            .attr("fill", d => vis.colorScale(d));

        // Add/update text with severity description
        legendEnter.append("text")
            .merge(legendItems.select("text"))
            .attr("x", 30)
            .attr("y", 15)
            .text(d => `${d}: ${vis.severityDescriptions[d]}`)
            .style("font-size", useVertical ? "10px" : "12px")
            .each(function() {
                const text = d3.select(this);
                const words = text.text().split(/\s+/);
                text.text(words.slice(0, 6).join(" ") + (words.length > 6 ? "..." : ""));
            });

        // Remove old items
        legendItems.exit().remove();
    }

    // Method to handle brush filtering
    filterByDate(startDate, endDate) {
        let vis = this;
        
        if (startDate && endDate) {
            vis.data = vis.allData.filter(d => 
                d.date >= startDate && d.date <= endDate
            );
        } else {
            vis.data = [...vis.allData];
        }
        vis.wrangleData();
    }
}
