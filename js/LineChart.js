// Placeholder for line chart -- used in a number of different visualizations
class LineChart {
    constructor(parentElement, data) {
        let vis = this;
        vis.parentElement = parentElement;
        
        // Clear any existing content
        d3.select(`#${parentElement}`).html("");
        
        vis.data = data;
        vis.currentDate = null;
        vis.isPlaying = false;
        
        // Adjust dimensions
        vis.margin = {
            top: 60,     // Reduced top margin
            right: 120,  // Space for legend
            bottom: 50,  // Space for x-axis
            left: 60     // Space for y-axis
        };
        
        // Calculate width based on container
        const container = document.getElementById(parentElement);
        const containerWidth = container.getBoundingClientRect().width;
        vis.width = containerWidth - vis.margin.left - vis.margin.right;
        vis.height = 300;  // Reduced height
        
        vis.initVis();
    }

    initVis() {
        let vis = this;
        vis.setupSvg();
        vis.setupScales();
        vis.setupAxes();
        vis.setupTooltip();
        vis.setupDateSlider();
        vis.wrangleData();
    }

    setupSvg() {
        let vis = this;
        
        // Create chart SVG
        vis.chartSvg = d3.select(`#${vis.parentElement}`)
            .append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom);

        // Create main group for chart
        vis.mainG = vis.chartSvg.append("g")
            .attr("transform", `translate(${vis.margin.left},${vis.margin.top})`);

        // Add clipPath
        vis.mainG.append("defs")
            .append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attr("width", vis.width)
            .attr("height", vis.height);

        // Create chart area with clip path
        vis.chartArea = vis.mainG.append("g")
            .attr("class", "chart-area")
            .attr("clip-path", "url(#clip)");

        // Add axes groups
        vis.xAxisG = vis.mainG.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${vis.height})`);

        vis.yAxisG = vis.mainG.append("g")
            .attr("class", "y-axis");

        // Create separate SVG for leaderboard
        vis.leaderboardSvg = d3.select(`#${vis.parentElement}`)
            .append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", 200)  // Fixed height for leaderboard
            .style("margin-top", "20px");

        // Add leaderboard group
        vis.leaderboard = vis.leaderboardSvg.append("g")
            .attr("class", "leaderboard")
            .attr("transform", `translate(${vis.margin.left},20)`);

        // Add leaderboard title
        vis.leaderboard.append("text")
            .attr("class", "leaderboard-title")
            .attr("x", 0)
            .attr("y", -10)
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .text("Leaderboard");
    }

    setupDateSlider() {
        let vis = this;
        
        // Create timeline controls group
        vis.timelineControls = vis.mainG.append("g")
            .attr("class", "timeline-controls")
            .attr("transform", `translate(0,-20)`);

        // Add play button
        vis.playButton = vis.timelineControls.append("g")
            .attr("class", "play-button")
            .attr("transform", "translate(-30,4)")
            .style("cursor", "pointer")
            .on("click", () => {
                if (vis.isPlaying) vis.stopAnimation();
                else vis.startAnimation();
            });

        // Add play symbol (triangle)
        vis.playSymbol = vis.playButton.append("path")
            .attr("d", "M0,-6L10,0L0,6Z")
            .attr("fill", "#2563eb")
            .style("opacity", 1);

        // Add pause symbol (two rectangles)
        vis.pauseSymbol = vis.playButton.append("g")
            .style("opacity", 0);

        vis.pauseSymbol.append("rect")
            .attr("x", -2)
            .attr("y", -6)
            .attr("width", 4)
            .attr("height", 12)
            .attr("fill", "#2563eb");

        vis.pauseSymbol.append("rect")
            .attr("x", 6)
            .attr("y", -6)
            .attr("width", 4)
            .attr("height", 12)
            .attr("fill", "#2563eb");

        // Add date slider to timeline controls group
        vis.sliderContainer = vis.timelineControls.append("g")
            .attr("class", "date-slider");

        // Add slider background
        vis.sliderContainer.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", vis.width)
            .attr("height", 8)
            .attr("fill", "#eee")
            .attr("rx", 4);

        // Add date label
        vis.sliderContainer.append("text")
            .attr("class", "date-label")
            .attr("x", vis.width)
            .attr("y", -8)
            .attr("text-anchor", "end")
            .style("font-size", "14px");
    }

    setupScales() {
        let vis = this;
        
        vis.x = d3.scaleTime()
            .range([0, vis.width]);

        vis.y = d3.scaleLinear()
            .range([vis.height, 0])
            .domain([0, 55]);  // Fixed y domain to match data range
    }

    setupAxes() {
        let vis = this;
        
        vis.yAxis = d3.axisLeft(vis.y)
            .ticks(10)
            .tickFormat(d3.format("d"));

        vis.xAxis = d3.axisBottom(vis.x)
            .ticks(d3.timeMonth.every(1))
            .tickFormat(d3.timeFormat("%b %Y"));

        // Add axes to main group, not the clipped area
        vis.xAxisG = vis.mainG.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${vis.height})`);

        vis.yAxisG = vis.mainG.append("g")
            .attr("class", "y-axis");

        // Add chart title
        vis.mainG.append("text")
            .attr("class", "chart-title")
            .attr("x", vis.width / 2)
            .attr("y", -30)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .style("font-size", "18px")
            .style("font-weight", "bold")
            .text("AI Model Performance Progress on SWE-Bench-Verified");

        // Add y-axis label
        vis.mainG.append("text")
            .attr("class", "y-axis-label")
            .attr("transform", "rotate(-90)")
            .attr("y", -40)
            .attr("x", -vis.height / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .text("EvaluationScore (higher is better)");

        // Add legend
        const legend = vis.mainG.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${vis.width + 20}, 20)`);

        const legendItems = [
            { label: "Anthropic Models", color: "#f97316" },
            { label: "OpenAI/GPT Models", color: "#22c55e" },
            { label: "Other Models", color: "#6b7280" },
            { label: "Pareto Frontier", color: "#1e40af" }
        ];

        legendItems.forEach((item, i) => {
            const legendItem = legend.append("g")
                .attr("class", "legend-item")
                .attr("transform", `translate(0, ${i * 25})`);

            legendItem.append("circle")
                .attr("r", 6)
                .style("fill", item.color);

            legendItem.append("text")
                .attr("x", 15)
                .attr("y", 5)
                .style("font-size", "14px")
                .text(item.label);
        });
    }

    setupTooltip() {
        let vis = this;
        
        vis.tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0)
            .style("position", "absolute")
            .style("background-color", "white")
            .style("border", "1px solid #ddd")
            .style("padding", "10px")
            .style("border-radius", "5px")
            .style("max-width", "300px");
    }

    wrangleData() {
        let vis = this;
        
        // Parse dates and convert scores to numbers
        vis.processedData = vis.data.map(d => ({
            name: d.cleaned_name,
            date: d3.timeParse("%m/%d/%y")(d.date),
            score: +d.score
        })).sort((a, b) => a.date - b.date);

        // Set initial current date to latest date
        vis.currentDate = vis.currentDate || d3.max(vis.processedData, d => d.date);

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

        // Calculate leaderboard data
        vis.updateLeaderboard();
        vis.updateVis();

        vis.maxScore = d3.max(vis.processedData, d => d.score);
    }

    updateLeaderboard() {
        let vis = this;
        
        // Filter data up to current date
        const filteredData = vis.processedData.filter(d => d.date <= vis.currentDate);
        
        // Get latest score for each model
        const modelScores = new Map();
        filteredData.forEach(d => {
            modelScores.set(d.name, {
                name: d.name,
                score: d.score,
                date: d.date
            });
        });

        // Sort by score and get top 5
        vis.leaderboardData = Array.from(modelScores.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);

        // Update leaderboard visualization
        const barHeight = 25;
        const barPadding = 5;

        const entries = vis.leaderboard.selectAll('.leaderboard-entry')
            .data(vis.leaderboardData)
            .join('g')
            .attr('class', 'leaderboard-entry')
            .attr('transform', (d, i) => `translate(0,${i * (barHeight + barPadding)})`);

        entries.selectAll('*').remove();

        entries.append('rect')
            .attr('width', vis.width)
            .attr('height', barHeight)
            .attr('fill', d => vis.getModelColor(d.name));

        entries.append('text')
            .attr('x', 10)
            .attr('y', barHeight/2)
            .attr('dominant-baseline', 'middle')
            .style('fill', 'white')
            .text(d => d.name);

        entries.append('text')
            .attr('x', vis.width - 10)
            .attr('y', barHeight/2)
            .attr('text-anchor', 'end')
            .attr('dominant-baseline', 'middle')
            .style('fill', 'white')
            .text(d => d.score.toFixed(1));
    }

    getModelColor(name, isPareto = false) {
        if (isPareto) return "#1e40af";
        name = name.toLowerCase();
        if (name.includes("anthropic") || name.includes("claude")) return "#f97316";
        if (name.includes("openai") || name.includes("gpt")) return "#22c55e";
        return "#6b7280";
    }

    startAnimation() {
        let vis = this;
        if (vis.isPlaying) return;

        vis.isPlaying = true;
        vis.playSymbol.style("opacity", 0);
        vis.pauseSymbol.style("opacity", 1);

        // Get start and end dates
        const startDate = d3.min(vis.processedData, d => d.date);
        const endDate = d3.max(vis.processedData, d => d.date);
        const duration = 8000; // 8 seconds total animation

        // Reset to start if near end
        if (vis.currentDate >= endDate || !vis.currentDate) {
            vis.currentDate = startDate;
        }

        // Create animation
        const startTime = Date.now();
        const startValue = vis.currentDate.getTime();
        const endValue = endDate.getTime();

        // Cancel any existing transitions
        vis.chartArea.selectAll("*").interrupt();
        vis.leaderboard.selectAll("*").interrupt();

        const animate = () => {
            if (!vis.isPlaying) return;

            const currentTime = Date.now();
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Calculate current date using easeInOutCubic
            const t = progress < 0.5
                ? 4 * progress * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;

            vis.currentDate = new Date(startValue + (endValue - startValue) * t);
            
            // Update data
            vis.wrangleData();
            
            // Update visualization
            vis.updateVisNoTransitions();

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                vis.stopAnimation();
            }
        };

        requestAnimationFrame(animate);
    }

    stopAnimation() {
        let vis = this;
        vis.isPlaying = false;
        vis.playSymbol.style("opacity", 1);
        vis.pauseSymbol.style("opacity", 0);
    }

    updateVisNoTransitions() {
        let vis = this;

        // Update scales
        vis.x.domain(d3.extent(vis.processedData, d => d.date));
        vis.y.domain([0, Math.ceil(d3.max(vis.processedData, d => d.score) / 5) * 5]);

        // Update axes without transitions
        vis.xAxisG.call(vis.xAxis)
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end")
            .style("font-size", "12px");

        vis.yAxisG.call(vis.yAxis)
            .selectAll("text")
            .style("font-size", "12px");

        // Filter data up to current date
        const currentData = vis.processedData.filter(d => d.date <= vis.currentDate);
        const currentMaxLine = vis.maxScoreLine.filter(d => d.date <= vis.currentDate);

        // Update Pareto frontier line
        const line = d3.line()
            .x(d => vis.x(d.date))
            .y(d => vis.y(d.score))
            .curve(d3.curveMonotoneX);

        vis.chartArea.selectAll(".max-score-line")
            .data([currentMaxLine])
            .join("path")
            .attr("class", "max-score-line")
            .attr("fill", "none")
            .style("stroke", "#1e40af")
            .style("stroke-width", "2px")
            .attr("d", line);

        // Update points
        vis.chartArea.selectAll(".point")
            .data(currentData, d => d.name + d.date)
            .join(
                enter => enter.append("circle")
                    .attr("class", "point")
                    .attr("cx", d => vis.x(d.date))
                    .attr("cy", d => vis.y(d.score))
                    .attr("r", d => {
                        const isMax = currentMaxLine.some(m => 
                            m.date.getTime() === d.date.getTime() && m.score === d.score);
                        return isMax ? 6 : 4;
                    })
                    .style("fill", d => vis.getModelColor(d.name, 
                        currentMaxLine.some(m => m.date.getTime() === d.date.getTime() && m.score === d.score)))
                    .style("opacity", d => {
                        const isMax = currentMaxLine.some(m => 
                            m.date.getTime() === d.date.getTime() && m.score === d.score);
                        return isMax ? 1 : 0.7;
                    }),
                update => update
                    .attr("cx", d => vis.x(d.date))
                    .attr("cy", d => vis.y(d.score))
                    .attr("r", d => {
                        const isMax = currentMaxLine.some(m => 
                            m.date.getTime() === d.date.getTime() && m.score === d.score);
                        return isMax ? 6 : 4;
                    })
                    .style("fill", d => vis.getModelColor(d.name, 
                        currentMaxLine.some(m => m.date.getTime() === d.date.getTime() && m.score === d.score)))
                    .style("opacity", d => {
                        const isMax = currentMaxLine.some(m => 
                            m.date.getTime() === d.date.getTime() && m.score === d.score);
                        return isMax ? 1 : 0.7;
                    }),
                exit => exit.remove()
            );

        // Update leaderboard
        const barHeight = 16;
        const barPadding = 4;
        
        const xLeaderboard = d3.scaleLinear()
            .domain([0, vis.maxScore])
            .range([0, vis.width + 100]);

        vis.leaderboard.selectAll(".leaderboard-bar")
            .data(vis.leaderboardData, d => d.name)
            .join(
                enter => {
                    const g = enter.append("g")
                        .attr("class", "leaderboard-bar")
                        .attr("transform", (d, i) => `translate(0,${i * (barHeight + barPadding)})`);
                    
                    g.append("rect")
                        .attr("height", barHeight)
                        .attr("width", d => xLeaderboard(d.score))
                        .style("fill", d => vis.getModelColor(d.name));

                    g.append("text")
                        .attr("class", "model-name")
                        .attr("x", 10)
                        .attr("y", barHeight / 2)
                        .attr("text-anchor", "start")
                        .attr("dominant-baseline", "middle")
                        .style("font-size", "12px")
                        .style("fill", "#fff")
                        .text(d => truncateText(d.name, xLeaderboard(d.score)));

                    g.append("text")
                        .attr("class", "score-label")
                        .attr("x", d => xLeaderboard(d.score) - 10)
                        .attr("y", barHeight / 2)
                        .attr("text-anchor", "end")
                        .attr("dominant-baseline", "middle")
                        .style("font-size", "12px")
                        .style("fill", "#fff")
                        .text(d => d.score.toFixed(1));

                    return g;
                },
                update => update
                    .attr("transform", (d, i) => `translate(0,${i * (barHeight + barPadding)})`)
                    .call(update => {
                        update.select("rect")
                            .attr("width", d => xLeaderboard(d.score))
                            .style("fill", d => vis.getModelColor(d.name));

                        update.select(".score-label")
                            .attr("x", d => xLeaderboard(d.score) - 10)
                            .text(d => d.score.toFixed(1));
                    }),
                exit => exit.remove()
            );

        // Update slider handle position
        vis.sliderContainer.select(".handle")
            .attr("cx", vis.x(vis.currentDate));

        // Update date label
        vis.sliderContainer.select(".date-label")
            .text(d3.timeFormat("%B %d, %Y")(vis.currentDate));
    }

    updateVis() {
        let vis = this;

        // Update scales
        vis.x.domain(d3.extent(vis.processedData, d => d.date));
        vis.y.domain([0, 55]);

        // Update axes
        vis.xAxisG.call(vis.xAxis)
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end")
            .style("font-size", "12px");

        vis.yAxisG.call(vis.yAxis);

        // Filter data up to current date
        const currentData = vis.processedData.filter(d => d.date <= vis.currentDate);

        // Draw Pareto frontier line
        const paretoLine = d3.line()
            .x(d => vis.x(d.date))
            .y(d => vis.y(d.score));

        const paretoPoints = currentData.filter(d => vis.isPareto(d))
            .sort((a, b) => a.date - b.date);

        vis.chartArea.selectAll(".pareto-line")
            .data([paretoPoints])
            .join("path")
            .attr("class", "pareto-line")
            .attr("d", paretoLine)
            .style("fill", "none")
            .style("stroke", "#1e40af")
            .style("stroke-width", "2px");

        // Update scatter points
        vis.chartArea.selectAll('.point')
            .data(currentData)
            .join('circle')
            .attr('class', 'point')
            .attr('cx', d => vis.x(d.date))
            .attr('cy', d => vis.y(d.score))
            .attr('r', d => vis.isPareto(d) ? 6 : 4)
            .attr('fill', d => vis.getModelColor(d.name))
            .attr('stroke', '#fff')
            .attr('stroke-width', 1)
            .style('fill', d => vis.isPareto(d) ? '#1e40af' : vis.getModelColor(d.name))
            .style('opacity', d => vis.isPareto(d) ? 1 : 0.7);
    }

    updateDimensions() {
        let vis = this;
        
        // Calculate width based on container
        const container = document.getElementById(vis.parentElement);
        const containerWidth = container.getBoundingClientRect().width;
        vis.width = containerWidth - vis.margin.left - vis.margin.right;

        // Update SVG dimensions
        vis.chartSvg
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom);

        // Update leaderboard SVG width
        vis.leaderboardSvg
            .attr("width", vis.width + vis.margin.left + vis.margin.right);

        // Update scales
        vis.x.range([0, vis.width]);

        // Update clip path
        vis.mainG.select("#clip rect")
            .attr("width", vis.width);

        // Update legend position
        vis.mainG.select(".legend")
            .attr("transform", `translate(${vis.width + 20}, 20)`);

        // Update chart title position
        vis.mainG.select(".chart-title")
            .attr("x", vis.width / 2);

        // Update slider width
        if (vis.sliderContainer) {
            vis.sliderContainer.select("rect")
                .attr("width", vis.width);
            
            vis.sliderContainer.select(".date-label")
                .attr("x", vis.width);
        }
    }

    resize() {
        let vis = this;
        vis.updateDimensions();
        vis.updateVis();
        vis.updateLeaderboard();
    }

    hide() {
        d3.select("#" + this.parentElement).style("display", "none");
    }

    show() {
        d3.select("#" + this.parentElement).style("display", "block");
    }

    isPareto(point) {
        let vis = this;
        // A point is on the Pareto frontier if no other point at the same date has a higher score
        const sameDate = vis.processedData.filter(d => 
            d.date.getTime() === point.date.getTime()
        );
        return Math.max(...sameDate.map(d => d.score)) === point.score;
    }
}

const truncateText = (text, availableWidth) => {
    if (!text) return "";
    const scoreWidth = 50;  // Reserve space for score
    const buffer = 20;      // Buffer space
    const maxWidth = availableWidth - scoreWidth - buffer;
    
    if (text.length * 7 > maxWidth) {  // Approximate character width of 7px
        const numChars = Math.floor(maxWidth / 7);
        return text.substring(0, numChars - 3) + "...";
    }
    return text;
};