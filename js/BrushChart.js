class BrushChart {
    constructor(parentElement, data) {
        this.parentElement = parentElement;
        this.data = data;
        
        // Initialize margins
        this.margin = {top: 10, right: 10, bottom: 20, left: 10};
        
        // Fixed height for brush chart
        this.height = 50;
        
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

        // Create SVG
        vis.svg = d3.select(`#${vis.containerId}`)
            .append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append("g")
            .attr("transform", `translate(${vis.margin.left},${vis.margin.top})`);
    }

    setupScales() {
        let vis = this;

        // Initialize scales
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
            .on("end", function(event) {
                if (!event.selection) {
                    // Reset filters when brush is cleared
                    vis.onBrush(null, null);
                    return;
                }
                // Apply filters when brush is set
                const [x0, x1] = event.selection.map(vis.x.invert);
                vis.onBrush(x0, x1);
            });

        // Add brush group
        vis.brushG = vis.svg.append("g")
            .attr("class", "brush");
    }

    wrangleData() {
        let vis = this;
        
        // Process and aggregate data by date
        vis.processedData = Array.from(d3.rollups(vis.data,
            v => v.length, // count incidents
            d => {
                // Ensure we have a valid date
                const date = new Date(d.date);
                return isNaN(date.getTime()) ? null : d3.timeDay(date);
            }
        ))
        .filter(d => d[0] !== null) // Remove null dates
        .map(([date, count]) => ({date, count}))
        .sort((a, b) => a.date - b.date);

        vis.updateVis();
    }

    updateVis() {
        let vis = this;

        if (vis.processedData.length === 0) {
            console.warn('No valid data for BrushChart');
            return;
        }

        // Update scales
        vis.x.domain(d3.extent(vis.processedData, d => d.date));
        vis.y.domain([0, d3.max(vis.processedData, d => d.count)]);

        // Update x-axis
        vis.xAxisG.call(vis.xAxis);

        // Draw area
        const area = d3.area()
            .x(d => vis.x(d.date))
            .y0(vis.height)
            .y1(d => vis.y(d.count));

        vis.svg.selectAll(".area")
            .data([vis.processedData])
            .join("path")
            .attr("class", "area")
            .attr("fill", "steelblue")
            .attr("opacity", 0.3)
            .attr("d", area);

        // Update brush
        vis.brushG.call(vis.brush);
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