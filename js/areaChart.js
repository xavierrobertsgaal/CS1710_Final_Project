class AreaChart {
    constructor(parentElement, data) {
        this.parentElement = parentElement;

        // Filter relevant fields: date, severity, and incident_id
        this.data = data.map(d => ({
            date: new Date(d.date), // Parse as Date
            severity: d.severity,
            incident_id: d.incident_id
        }));

        // Group by severity levels in a logical order
        this.severityLevels = ["Low", "Medium", "High"]; // Adjust based on your data

        // Set ordinal color scale for severity levels
        this.colorScale = d3.scaleOrdinal()
            .domain(this.severityLevels)
            .range(['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd']); // Adjust colors as needed

        this.initVis();
    }

    initVis() {
        let vis = this;

        vis.margin = { top: 40, right: 40, bottom: 100, left: 50 }; // Increased bottom margin for legend
        vis.width = document.getElementById(vis.parentElement).getBoundingClientRect().width - vis.margin.left - vis.margin.right;
        vis.height = document.getElementById(vis.parentElement).getBoundingClientRect().height - vis.margin.top - vis.margin.bottom;

        // SVG drawing area
        vis.svg = d3.select(`#${vis.parentElement}`).append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom + 40) // Extra space for legend
            .append("g")
            .attr("transform", `translate(${vis.margin.left}, ${vis.margin.top})`);

        // Initialize scales and axes
        vis.x = d3.scaleTime()
            .range([0, vis.width]);

        vis.y = d3.scaleLinear()
            .range([vis.height, 0]);

        vis.xAxis = d3.axisBottom()
            .scale(vis.x);

        vis.yAxis = d3.axisLeft()
            .scale(vis.y);

        vis.svg.append("g")
            .attr("class", "x-axis axis")
            .attr("transform", `translate(0, ${vis.height})`);

        vis.svg.append("g")
            .attr("class", "y-axis axis");

        // Initialize stack layout
        vis.stack = d3.stack()
            .keys(vis.severityLevels)
            .value((d, key) => d[key] || 0);

        // Initialize area layout
        vis.area = d3.area()
            .x(d => vis.x(d.data.date))
            .y0(d => vis.y(d[0]))
            .y1(d => vis.y(d[1]));

        // Add legend group
        vis.legend = vis.svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(0, ${vis.height + 30})`);

        vis.wrangleData();
    }

    wrangleData() {
        let vis = this;

        // Aggregate data by month and severity
        vis.aggregatedData = Array.from(
            d3.rollup(
                vis.data,
                v => vis.severityLevels.reduce((acc, severity) => {
                    acc[severity] = v.filter(d => d.severity === severity).length;
                    return acc;
                }, {}),
                d => new Date(d.date.getFullYear(), d.date.getMonth()) // Group by year and month
            ),
            ([date, severityMap]) => ({
                date,
                ...severityMap
            })
        );

        // Ensure all severity levels are represented for each month
        vis.aggregatedData.forEach(d => {
            vis.severityLevels.forEach(severity => {
                if (!(severity in d)) {
                    d[severity] = 0; // Fill missing severity levels with 0
                }
            });
        });

        // Sort aggregated data by date
        vis.aggregatedData.sort((a, b) => a.date - b.date);

        // Add cumulative values for each severity level
        for (let i = 1; i < vis.aggregatedData.length; i++) {
            vis.severityLevels.forEach(severity => {
                vis.aggregatedData[i][severity] += vis.aggregatedData[i - 1][severity];
            });
        }

        // Stack data and attach `key` property to each layer
        vis.stackedData = vis.stack(vis.aggregatedData).map((layer, i) => {
            return Object.assign(layer, { key: vis.severityLevels[i] }); // Explicitly set the key
        });

        console.log("Aggregated Data (Cumulative):", vis.aggregatedData);
        console.log("Stacked Data (With Keys):", vis.stackedData);

        vis.updateVis();
    }

    updateVis() {
        let vis = this;

        // Update scales
        vis.x.domain(d3.extent(vis.aggregatedData, d => d.date));
        vis.y.domain([0, d3.max(vis.stackedData, d => d3.max(d, d => d[1]))]);

        // Draw areas
        let layers = vis.svg.selectAll(".area")
            .data(vis.stackedData);

        layers.enter().append("path")
            .attr("class", "area")
            .merge(layers)
            .style("fill", d => {
                console.log("Layer Key:", d.key); // Debug the key
                console.log("Color for Key:", d.key, vis.colorScale(d.key)); // Debug color assignment
                return vis.colorScale(d.key);
            })
            .attr("d", vis.area)
            .on("mouseover", (event, d) => {
                d3.select(event.currentTarget)
                    .style("opacity", 0.8);
            })
            .on("mouseout", (event, d) => {
                d3.select(event.currentTarget)
                    .style("opacity", 1);
            });

        layers.exit().remove();

        // Update axes
        vis.svg.select(".x-axis").call(vis.xAxis);
        vis.svg.select(".y-axis").call(vis.yAxis);

        // Draw legend
        let legendItems = vis.legend.selectAll(".legend-item")
            .data(vis.severityLevels);

        let legendEnter = legendItems.enter().append("g")
            .attr("class", "legend-item")
            .attr("transform", (d, i) => `translate(${i * 150}, 0)`); // Adjust spacing between legend items

        legendEnter.append("rect")
            .attr("width", 20)
            .attr("height", 20)
            .attr("fill", d => vis.colorScale(d));

        legendEnter.append("text")
            .attr("x", 30)
            .attr("y", 15)
            .text(d => d)
            .style("font-size", "12px")
            .attr("alignment-baseline", "middle");

        legendItems.exit().remove();
    }
}
