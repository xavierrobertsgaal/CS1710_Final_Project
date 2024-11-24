class AreaChart {
    constructor(parentElement, data) {
        this.parentElement = parentElement;
        this.containerElement = document.getElementById(parentElement);
        
        // Process data
        this.data = data.map(d => ({
            date: new Date(d.date),
            severity: d.severity || 'Unknown',
            incident_id: d.incident_id
        }));

        // Store full dataset for filtering
        this.allData = [...this.data];

        // Group by severity levels in a logical order (high at bottom)
        this.severityLevels = ["High", "Medium", "Low"];

        // Set ordinal color scale for severity levels
        this.colorScale = d3.scaleOrdinal()
            .domain(["High", "Medium", "Low"])
            .range(['#2ca02c', '#ff7f0e', '#1f77b4']); // green, orange, blue

        this.initVis();
    }

    initVis() {
        let vis = this;
        
        // Set margins
        vis.margin = { top: 40, right: 40, bottom: 100, left: 50 };
        
        vis.setupSvg();
        vis.setupScales();
        vis.setupAxes();
        
        vis.wrangleData();
    }

    setupSvg() {
        let vis = this;
        
        // Create SVG area
        vis.svg = d3.select(`#${vis.parentElement}`).append("svg")
            .attr("class", "chart-svg");
            
        // Create group for content
        vis.chartGroup = vis.svg.append("g");
        
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
        
        // Initialize scales
        vis.x = d3.scaleTime();
        vis.y = d3.scaleLinear();

        // Initialize stack layout
        vis.stack = d3.stack()
            .keys(vis.severityLevels)
            .order(d3.stackOrderReverse)  // Highest severity at bottom
            .value((d, key) => d[key] || 0);
            
        vis.updateDimensions();
    }

    setupAxes() {
        let vis = this;
        
        vis.xAxis = d3.axisBottom()
            .scale(vis.x);

        vis.yAxis = d3.axisLeft()
            .scale(vis.y);
    }

    wrangleData() {
        let vis = this;
        
        // Group data by year-month for smoother visualization
        let monthlyData = d3.rollup(vis.data,
            values => ({
                High: values.filter(d => d.severity === "High").length,
                Medium: values.filter(d => d.severity === "Medium").length,
                Low: values.filter(d => d.severity === "Low").length,
                date: d3.timeMonth(values[0].date) // Use the month as the date
            }),
            d => d3.timeMonth(d.date) // Group by month
        );

        // Convert to array format and sort by date
        vis.aggregatedData = Array.from(monthlyData, ([_, data]) => data)
            .sort((a, b) => a.date - b.date);

        // Create stacked data
        vis.stackedData = d3.stack()
            .keys(vis.severityLevels)
            .value((d, key) => d[key] || 0)(vis.aggregatedData);

        vis.updateVis();
    }

    updateVis() {
        let vis = this;

        // Update scales
        vis.x.domain(d3.extent(vis.aggregatedData, d => d.date));
        vis.y.domain([0, d3.max(vis.stackedData, d => d3.max(d, d => d[1]))]);

        // Update axes
        vis.chartGroup.select(".x-axis")
            .attr("transform", `translate(0,${vis.height})`)
            .call(vis.xAxis)
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end");

        vis.chartGroup.select(".y-axis")
            .call(vis.yAxis);

        // Draw stacked areas
        const area = d3.area()
            .x(d => vis.x(d.data.date))
            .y0(d => vis.y(d[0]))
            .y1(d => vis.y(d[1]));

        // Update areas
        const layers = vis.chartGroup.selectAll(".layer")
            .data(vis.stackedData);

        // Enter + Update
        layers.enter()
            .append("path")
            .attr("class", "layer")
            .merge(layers)
            .style("fill", d => vis.colorScale(d.key))
            .style("opacity", 0.8)
            .transition()
            .duration(1000)
            .attr("d", area);

        // Exit
        layers.exit().remove();

        vis.updateLegend();
    }

    updateDimensions() {
        let vis = this;
        
        // Update width and height from shared dimensions
        vis.width = sharedDimensions.width - vis.margin.left - vis.margin.right;
        vis.height = sharedDimensions.height - vis.margin.top - vis.margin.bottom;

        // Update SVG size
        vis.svg
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom);

        // Update transform
        vis.chartGroup.attr("transform", `translate(${vis.margin.left},${vis.margin.top})`);

        // Update scales ranges
        vis.x.range([0, vis.width]);
        vis.y.range([vis.height, 0]);
    }

    resize() {
        let vis = this;
        vis.updateDimensions();
        vis.updateVis();
    }

    updateLegend() {
        let vis = this;
        
        // Position legend
        const useVertical = vis.width < 500;
        
        vis.legend.attr("transform", useVertical 
            ? `translate(${vis.width - 100}, 0)` 
            : `translate(0,${vis.height + 30})`);

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
                ? `translate(0, ${i * 25})`
                : `translate(${i * Math.min(150, vis.width / 4)}, 0)`);

        // Add/update rectangles
        legendEnter.append("rect")
            .merge(legendItems.select("rect"))
            .attr("width", 20)
            .attr("height", 20)
            .attr("fill", d => vis.colorScale(d));

        // Add/update text
        legendEnter.append("text")
            .merge(legendItems.select("text"))
            .attr("x", 30)
            .attr("y", 15)
            .text(d => d)
            .style("font-size", useVertical ? "10px" : "12px");

        // Remove old items
        legendItems.exit().remove();
    }

    // Add method to handle brush filtering
    filterByDate(startDate, endDate) {
        if (startDate && endDate) {
            this.data = this.allData.filter(d => 
                d.date >= startDate && d.date <= endDate
            );
        } else {
            this.data = [...this.allData];
        }
        this.wrangleData();
    }
}
