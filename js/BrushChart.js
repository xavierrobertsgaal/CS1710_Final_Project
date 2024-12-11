class BrushChart {
    constructor(parentElement, data) {
        this.parentElement = parentElement;
        
        // Use all data, don't filter by year
        this.data = data.map(d => ({
            date: new Date(d.date),
            severity: d.severity,
            incident_id: d.incident_id
        }));
        
        // Initialize margins with more space for x-axis labels
        this.margin = {top: 10, right: 10, bottom: 30, left: 40};
        
        // Fixed height for brush chart
        this.height = 50;
        
        // Group by severity levels in same order as area chart
        this.severityLevels = ["High", "Medium", "Low"];
        
        this.initVis();
    }

    initVis() {
        let vis = this;
        vis.setupSvg();
        vis.setupScales();
        vis.setupAxes();
        vis.setupBrush();
        vis.wrangleData();
    }

    setupSvg() {
        let vis = this;

        // Get container dimensions
        const container = document.getElementById(vis.parentElement);
        const rect = container.getBoundingClientRect();
        vis.width = rect.width - vis.margin.left - vis.margin.right;

        // Create SVG with explicit dimensions
        vis.svg = d3.select(`#${vis.parentElement}`)
            .append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append("g")
            .attr("transform", `translate(${vis.margin.left},${vis.margin.top})`);
    }

    setupScales() {
        let vis = this;

        // Initialize scales with explicit ranges
        vis.x = d3.scaleTime()
            .range([0, vis.width]);

        vis.y = d3.scaleLinear()
            .range([vis.height, 0]);
    }

    setupAxes() {
        let vis = this;

        // Initialize axes
        vis.xAxis = d3.axisBottom(vis.x)
            .tickFormat(d3.timeFormat("%b %Y"));

        // Add axes groups
        vis.xAxisG = vis.svg.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${vis.height})`);
    }

    setupBrush() {
        let vis = this;

        // Initialize brush
        vis.brush = d3.brushX()
            .extent([[0, 0], [vis.width, vis.height]])
            .on("brush", function(event) {
                if (!event.selection) {
                    // If brush is cleared, reset to 2010
                    const defaultStart = new Date('2010-01-01');
                    const defaultEnd = new Date('2024-12-31');
                    if (visualizations.incidents) {
                        visualizations.incidents.filterByDate(defaultStart, defaultEnd);
                    }
                    return;
                }

                // Convert brush selection to dates
                const [x0, x1] = event.selection.map(vis.x.invert);
                
                // Update the area chart immediately
                if (visualizations.incidents) {
                    visualizations.incidents.filterByDate(x0, x1);
                }
            });

        // Add brush group
        vis.brushG = vis.svg.append("g")
            .attr("class", "brush")
            .call(vis.brush);

        // Set initial brush position (2010 to end)
        const defaultStart = vis.x(new Date('2010-01-01'));
        const defaultEnd = vis.x(new Date('2024-12-31'));
        vis.brushG.call(vis.brush.move, [defaultStart, defaultEnd]);
    }

    wrangleData() {
        let vis = this;
        
        // Group data by month and severity, matching area chart's aggregation
        let monthlyData = d3.rollup(vis.data,
            values => ({
                High: values.filter(d => d.severity === "High").length,
                Medium: values.filter(d => d.severity === "Medium").length,
                Low: values.filter(d => d.severity === "Low").length,
                date: d3.timeMonth(values[0].date)
            }),
            d => d3.timeMonth(d.date)
        );

        // Convert to array and sort by date
        vis.aggregatedData = Array.from(monthlyData, ([_, data]) => data)
            .sort((a, b) => a.date - b.date);

        // Make cumulative like the area chart
        let cumulative = {High: 0, Medium: 0, Low: 0};
        vis.aggregatedData.forEach(d => {
            cumulative.High += d.High;
            cumulative.Medium += d.Medium;
            cumulative.Low += d.Low;
            
            d.High = cumulative.High;
            d.Medium = cumulative.Medium;
            d.Low = cumulative.Low;
            d.total = d.High + d.Medium + d.Low;
        });

        // Create stacked data
        vis.stack = d3.stack()
            .keys(vis.severityLevels)
            .order(d3.stackOrderNone);

        vis.stackedData = vis.stack(vis.aggregatedData);

        vis.updateVis();
    }

    updateVis() {
        let vis = this;

        // Set domains to show full date range
        vis.x.domain(d3.extent(vis.data, d => d.date));
        vis.y.domain([0, d3.max(vis.aggregatedData, d => d.total)]);

        // Update x-axis with more space for labels
        vis.xAxisG.call(vis.xAxis)
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .attr("y", 10)
            .attr("x", -5)
            .style("text-anchor", "end");

        // Draw stacked areas aligned with x-axis
        const area = d3.area()
            .x(d => vis.x(d.data.date))
            .y0(vis.height)  // Start from bottom
            .y1(d => vis.y(d[1]));

        // Update areas
        vis.svg.selectAll(".brush-area")
            .data(vis.stackedData)
            .join("path")
            .attr("class", "brush-area")
            .attr("fill", "#cccccc")
            .attr("opacity", 0.3)
            .attr("d", area);

        // Make sure brush is on top
        vis.brushG.raise();
    }

    onBrush(startDate, endDate) {
        let vis = this;
        
        // Filter both area chart and treemap
        if (visualizations.incidents) {
            visualizations.incidents.filterByDate(startDate, endDate);
        }
        if (visualizations.sectors) {
            visualizations.sectors.filterByDate(startDate, endDate);
        }
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

        // Update scales ranges
        if (vis.x) vis.x.range([0, vis.width]);
        if (vis.y) vis.y.range([vis.height, 0]);
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
} 