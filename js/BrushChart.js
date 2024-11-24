class BrushChart {
    constructor(containerId, data) {
        this.containerId = containerId;
        this.data = data;
        
        // Set up dimensions - make it shorter than main vis
        this.margin = {top: 10, right: 30, bottom: 20, left: 40};
        
        // Initialize dimensions
        sharedDimensions.updateDimensions();
        this.width = sharedDimensions.width - this.margin.left - this.margin.right;
        this.height = 100 - this.margin.top - this.margin.bottom;
        
        // Ensure we have valid dimensions before initializing
        if (this.width > 0 && this.height > 0) {
            this.initVis();
        } else {
            console.error('Invalid dimensions for BrushChart');
        }
    }

    initVis() {
        const vis = this;

        // Create SVG
        vis.svg = d3.select(`#${vis.containerId}`)
            .append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append("g")
            .attr("transform", `translate(${vis.margin.left},${vis.margin.top})`);

        // Initialize scales
        vis.x = d3.scaleTime()
            .range([0, vis.width]);

        vis.y = d3.scaleLinear()
            .range([vis.height, 0]);

        // Initialize axes
        vis.xAxis = d3.axisBottom(vis.x)
            .tickFormat(d3.timeFormat("%b %Y"));

        // Add axes groups
        vis.xAxisG = vis.svg.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${vis.height})`);

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

        this.wrangleData();
    }

    wrangleData() {
        const vis = this;
        
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

        this.updateVis();
    }

    updateVis() {
        const vis = this;

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
        const vis = this;
        
        // Filter both area chart and treemap
        if (visualizations.incidents) {
            visualizations.incidents.filterByDate(startDate, endDate);
        }
        if (visualizations.sectors) {
            visualizations.sectors.filterByDate(startDate, endDate);
        }
    }

    resize() {
        const vis = this;
        
        // Update dimensions
        sharedDimensions.updateDimensions();
        vis.width = sharedDimensions.width - vis.margin.left - vis.margin.right;

        if (vis.width <= 0) return; // Skip if invalid width

        // Update SVG dimensions
        d3.select(`#${vis.containerId} svg`)
            .attr("width", vis.width + vis.margin.left + vis.margin.right);

        // Update scales
        vis.x.range([0, vis.width]);

        // Update brush extent
        vis.brush.extent([[0, 0], [vis.width, vis.height]]);
        if (vis.brushG) {
            vis.brushG.call(vis.brush);
        }

        // Update visualization
        this.updateVis();
    }
} 