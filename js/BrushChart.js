class BrushChart {
    constructor(parentElement, data) {
        this.parentElement = parentElement;
        
        // Use all data, don't filter by year
        this.data = data.map(d => ({
            date: new Date(d.date),
            severity: d.severity,
            incident_id: d.incident_id
        }));
        
        // Initialize margins with more space for x-axis labels and reset button
        this.margin = {top: 10, right: 140, bottom: 30, left: 60};  // Increased right margin
        
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
        vis.wrangleData();
        vis.setupBrush();
    }

    setupSvg() {
        let vis = this;

        // Get container dimensions
        const container = document.getElementById(vis.parentElement);
        const rect = container.getBoundingClientRect();
        vis.width = rect.width - vis.margin.left - vis.margin.right;

        // Create SVG with explicit dimensions and extra space for title
        vis.svg = d3.select(`#${vis.parentElement}`)
            .append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom + 30)
            .append("g")
            .attr("transform", `translate(${vis.margin.left},${vis.margin.top + 10})`);

        // Add title
        vis.svg.append("text")
            .attr("class", "brush-title")
            .attr("x", 0)
            .attr("y", -5)
            .attr("text-anchor", "start")
            .style("font-size", "12px")
            .style("fill", "#666")
            .text("Drag to select time period");

        // Add reset button to parent container
        d3.select(`#${vis.parentElement}`)
            .append('button')
            .attr('class', 'btn-outline-primary')
            .style('position', 'absolute')
            .style('right', '10px')
            .style('top', '85%')
            .style('transform', 'translateY(-50%)')
            .style('z-index', '100')
            .style('padding', '4px 12px')
            .style('color', '#f6c744')
            .style('background-color', '#f8f9fa')
            .style('border', 'none')
            .style('font-weight', '500')
            .style('cursor', 'pointer')
            .text('Reset')
            .on('click', () => {
                const endDate = d3.max(vis.data, d => d.date);
                const startDate = new Date('2010-01-01');
                const defaultStart = vis.x(startDate);
                const defaultEnd = vis.x(endDate);
                vis.brushG.call(vis.brush.move, [defaultStart, defaultEnd]);
            });
    }

    setupScales() {
        let vis = this;

        // Initialize scales with explicit ranges
        vis.x = d3.scaleTime()
            .domain([new Date('1985-01-01'), new Date('2024-12-31')])  // Set initial full range
            .range([0, vis.width]);

        vis.y = d3.scaleLinear()
            .range([vis.height, 0]);
    }

    setupAxes() {
        let vis = this;

        // Initialize axes with year-only format
        vis.xAxis = d3.axisBottom(vis.x)
            .tickFormat(d3.timeFormat("%Y"));

        // Add axes groups
        vis.xAxisG = vis.svg.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${vis.height})`);
    }

    setupBrush() {
        let vis = this;

        // Initialize brush with explicit dimensions
        vis.brush = d3.brushX()
            .extent([[0, 0], [vis.width, vis.height]])
            .on("brush", function(event) {
                if (!event.selection) {
                    // If brush is cleared, reset to full range
                    const endDate = d3.max(vis.data, d => d.date);
                    const startDate = new Date('2010-01-01');
                    // Update both visualizations when brush is cleared
                    if (visualizations.incidents) {
                        visualizations.incidents.filterByDate(startDate, endDate);
                    }
                    if (visualizations.sectors) {  // Add TreeMap update
                        visualizations.sectors.filterByDate(startDate, endDate);
                    }
                    return;
                }

                // Convert brush selection to dates
                const [x0, x1] = event.selection.map(vis.x.invert);
                
                // Update both visualizations
                if (visualizations.incidents) {
                    visualizations.incidents.filterByDate(x0, x1);
                }
                if (visualizations.sectors) {  // Add TreeMap update
                    visualizations.sectors.filterByDate(x0, x1);
                }
            });

        // Add brush group
        vis.brushG = vis.svg.append("g")
            .attr("class", "brush")
            .call(vis.brush);

        // Set initial brush position using the actual data range
        const endDate = d3.max(vis.data, d => d.date);
        const startDate = new Date('2010-01-01');
        const defaultStart = vis.x(startDate);
        const defaultEnd = vis.x(endDate);
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

        // Update x domain based on actual data
        vis.x.domain(d3.extent(vis.data, d => d.date));
        vis.y.domain([0, d3.max(vis.aggregatedData, d => d.total)]);

        // Update x-axis
        vis.xAxisG.call(vis.xAxis)
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .attr("y", 10)
            .attr("x", -5)
            .style("text-anchor", "end");

        // Draw stacked areas
        const area = d3.area()
            .x(d => vis.x(d.data.date))
            .y0(d => vis.height)
            .y1(d => vis.y(d[1]));

        // Update areas
        vis.svg.selectAll(".brush-area")
            .data(vis.stackedData)
            .join("path")
            .attr("class", "brush-area")
            .attr("d", area)
            .attr("transform", "translate(0, 5)");

        // Update brush position if it exists
        if (vis.brushG) {
            const startDate = new Date('2010-01-01');
            const endDate = d3.max(vis.data, d => d.date);
            const defaultStart = vis.x(startDate);
            const defaultEnd = vis.x(endDate);
            vis.brushG.call(vis.brush.move, [defaultStart, defaultEnd]);
        }

        // Make sure brush is on top
        if (vis.brushG) vis.brushG.raise();
    }

    brushed(event) {
        let vis = this;
        
        // Only trigger if this is a user-initiated brush event
        if (!event.sourceEvent) return;
        
        // Get the selected dates
        const selection = event.selection || vis.x.range();
        const newDates = selection.map(vis.x.invert);
        
        console.log('Brush event triggered:', newDates);
        
        // Update both visualizations
        vis.onBrush(newDates[0], newDates[1]);
    }

    onBrush(startDate, endDate) {
        let vis = this;
        
        console.log('BrushChart dispatching to TreeMap and AreaChart:', startDate, endDate);
        
        // Update TreeMap
        if (visualizations.sectors) {
            visualizations.sectors.filterByDate(startDate, endDate);
        } else {
            console.warn('TreeMap visualization not found');
        }
        
        // Update AreaChart
        if (visualizations.areaChart) {
            visualizations.areaChart.filterByDate(startDate, endDate);
        } else {
            console.warn('AreaChart visualization not found');
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