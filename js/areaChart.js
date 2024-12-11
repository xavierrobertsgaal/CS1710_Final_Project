class AreaChart {
    constructor(parentElement, data) {
        let vis = this;
        vis.parentElement = parentElement;

        // Store the complete dataset with all dates from 1980s
        vis.completeData = data.map(d => ({
            date: new Date(d.date),
            severity: d.severity || 'Unknown',
            incident_id: d.incident_id
        }));

        // Initially filter to show only 2010 onwards
        vis.data = vis.completeData.filter(d => d.date >= new Date('2010-01-01'));
        
        // Store complete dataset for brush interactions
        vis.allData = [...vis.completeData];
        
        // Group by severity levels in order from bottom to top
        vis.severityLevels = ["High", "Medium", "Low"];
        
        // Simplified severity descriptions for legend
        vis.severityDescriptions = {
            'High': 'High Severity',
            'Medium': 'Medium Severity',
            'Low': 'Low Severity'
        };
        
        // Set ordinal color scale for severity levels with matching colors from circle chart
        vis.colorScale = d3.scaleOrdinal()
            .domain(["Low", "Medium", "High"])
            .range(['#2563eb', '#5c7077', '#ff4141']); // Blue, Gray, Red

        vis.margin = { top: 40, right: 100, bottom: 100, left: 60 };
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
        
        // Get container width
        const container = d3.select(`#${vis.parentElement}`).node();
        const containerWidth = container.getBoundingClientRect().width;
        
        // Set width with more padding
        vis.width = containerWidth - vis.margin.left - vis.margin.right - 20;  // Reduced padding
        vis.height = Math.min(500, window.innerHeight * 0.6);
        
        // Create SVG area with explicit dimensions
        vis.svg = d3.select(`#${vis.parentElement}`)
            .append("svg")
            .attr("class", "chart-svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom);
            
        // Add chart group with translation
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
        
        // Set up stack generator with normal order (since we reversed the levels array)
        vis.stack = d3.stack()
            .keys(vis.severityLevels)
            .order(d3.stackOrderNone);

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

        // Make the data cumulative starting from 0
        let cumulative = {High: 0, Medium: 0, Low: 0};
        vis.aggregatedData.forEach(d => {
            cumulative.High += d.High;
            cumulative.Medium += d.Medium;
            cumulative.Low += d.Low;
            
            // Update the values to be cumulative
            d.High = cumulative.High;
            d.Medium = cumulative.Medium;
            d.Low = cumulative.Low;
            
            // Update total
            d.total = d.High + d.Medium + d.Low;
        });

        // Create stacked data
        vis.stackedData = vis.stack(vis.aggregatedData);

        // Update vis immediately without transition
        vis.updateVis(0);
    }

    updateVis(duration = 0) {
        let vis = this;

        // Update scales with proper domains
        vis.x.domain(d3.extent(vis.aggregatedData, d => d.date));
        vis.y.domain([0, d3.max(vis.aggregatedData, d => d.total)]);

        // Update axes without transition
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

        // Update areas without transition
        const layers = vis.chartGroup.selectAll(".stacked-area")
            .data(vis.stackedData);

        layers.enter()
            .append("path")
            .attr("class", d => `stacked-area area-${d.key.toLowerCase()}`)
            .merge(layers)
            .style("fill", d => vis.colorScale(d.key))
            .style("opacity", 0.7)
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

        // Update legend items with simplified text
        const legendItems = vis.legend.selectAll(".legend-item")
            .data(vis.severityLevels);

        // Enter new items
        const legendEnter = legendItems.enter()
            .append("g")
            .attr("class", "legend-item");

        // Update positions with more spacing
        legendItems.merge(legendEnter)
            .attr("transform", (d, i) => useVertical 
                ? `translate(0, ${i * 25})`  // Reduced vertical spacing
                : `translate(${i * 150}, 0)`);  // Increased horizontal spacing

        // Add/update rectangles
        legendEnter.append("rect")
            .merge(legendItems.select("rect"))
            .attr("width", 20)
            .attr("height", 20)
            .attr("fill", d => vis.colorScale(d));

        // Add/update text with simplified descriptions
        legendEnter.append("text")
            .merge(legendItems.select("text"))
            .attr("x", 30)
            .attr("y", 15)
            .text(d => vis.severityDescriptions[d])
            .style("font-size", "12px");

        // Remove old items
        legendItems.exit().remove();
    }

    // Method to handle brush filtering
    filterByDate(startDate, endDate) {
        let vis = this;
        
        // Filter data based on brush selection
        vis.data = vis.allData.filter(d => {
            return d.date >= startDate && d.date <= endDate;
        });
        
        // Update visualization with filtered data
        vis.wrangleData();
    }
}
