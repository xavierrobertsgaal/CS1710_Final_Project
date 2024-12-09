// Placeholder for line chart -- used in a number of different visualizations
class LineChart {
    constructor(parentElement, data) {
        let vis = this;
        vis.parentElement = parentElement;
        vis.data = data;
        vis.currentDate = null;
        vis.isPlaying = false;
        
        // Much more vertical space
        vis.margin = { 
            top: 120,    // Space for timeline controls
            right: 180,  // Space for legend
            bottom: 400, // Space for leaderboard
            left: 80     // Space for y-axis labels
        };
        
        // Add title
        vis.title = "AI Model Performance Progress on SWE-Bench-Verified";
        vis.subtitle = "Pareto frontier shown in dark blue";
        
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
        
        // Much taller SVG
        vis.width = sharedDimensions.width - vis.margin.left - vis.margin.right;
        vis.height = 500; // Fixed height for line chart
        vis.leaderboardHeight = 200;
        vis.spacing = 200; // Spacing between components

        vis.svg = d3.select(`#${vis.parentElement}`)
            .append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom + vis.leaderboardHeight)
            .append("g")
            .attr("transform", `translate(${vis.margin.left},${vis.margin.top})`);

        // Add clipPath for animation
        vis.svg.append("defs")
            .append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attr("width", vis.width)
            .attr("height", vis.height);

        // Add a group for the clipped content
        vis.chartArea = vis.svg.append("g")
            .attr("clip-path", "url(#clip)");

        // Add group for leaderboard with more spacing
        vis.leaderboard = vis.svg.append("g")
            .attr("transform", `translate(0,${vis.height + vis.spacing})`);

        // Move timeline controls to top
        vis.timelineControls = vis.svg.append("g")
            .attr("transform", `translate(0,-80)`);

        // Add title and subtitle below timeline
        vis.svg.append("text")
            .attr("class", "chart-title")
            .attr("x", vis.width / 2)
            .attr("y", -40)
            .attr("text-anchor", "middle")
            .style("font-size", "18px")
            .style("font-weight", "bold")
            .text(vis.title);

        vis.svg.append("text")
            .attr("class", "chart-subtitle")
            .attr("x", vis.width / 2)
            .attr("y", -20)
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .style("fill", "#666")
            .text(vis.subtitle);

        // Add y-axis label
        vis.svg.append("text")
            .attr("class", "y-axis-label")
            .attr("transform", "rotate(-90)")
            .attr("y", -60)
            .attr("x", -vis.height / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .text("SWE-Bench Score (higher is better)");

        // Add legend
        const legendData = [
            { name: "Anthropic Models", color: "#f97316" },
            { name: "OpenAI/GPT Models", color: "#22c55e" },
            { name: "Other Models", color: "#6b7280" },
            { name: "Pareto Frontier", color: "#1e40af" }
        ];

        const legend = vis.svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${vis.width + 20}, 20)`);

        const legendItems = legend.selectAll(".legend-item")
            .data(legendData)
            .join("g")
            .attr("class", "legend-item")
            .attr("transform", (d, i) => `translate(0, ${i * 25})`);

        legendItems.append("circle")
            .attr("r", 6)
            .style("fill", d => d.color);

        legendItems.append("text")
            .attr("x", 15)
            .attr("y", 5)
            .style("font-size", "14px")
            .text(d => d.name);

        // Add leaderboard title
        vis.leaderboard.append("text")
            .attr("class", "leaderboard-title")
            .attr("x", vis.width / 2)
            .attr("y", -70)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .text("Current Leaderboard");
    }

    setupDateSlider() {
        let vis = this;
        
        // Add date slider to timeline controls group
        vis.sliderContainer = vis.timelineControls.append("g")
            .attr("class", "date-slider");

        // Add play button
        const playButton = vis.sliderContainer.append("g")
            .attr("class", "play-button")
            .attr("transform", "translate(-40,4)")
            .style("cursor", "pointer")
            .on("click", function() {
                if (vis.isPlaying) {
                    vis.stopAnimation();
                } else {
                    vis.startAnimation();
                }
            });

        // Play button triangle/pause bars
        vis.playSymbol = playButton.append("path")
            .attr("d", "M0,-6L10,0L0,6Z")
            .attr("fill", "#2563eb");

        vis.pauseSymbol = playButton.append("g")
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

        // Add slider track
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
            .range([vis.height, 0]);
    }

    setupAxes() {
        let vis = this;
        
        // Format y-axis to show whole numbers
        vis.yAxis = d3.axisLeft(vis.y)
            .ticks(10)
            .tickFormat(d3.format("d"));

        // Format x-axis to show abbreviated months
        vis.xAxis = d3.axisBottom(vis.x)
            .ticks(d3.timeMonth.every(1))
            .tickFormat(d3.timeFormat("%b %Y"));

        vis.xAxisG = vis.svg.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${vis.height})`);

        vis.yAxisG = vis.svg.append("g")
            .attr("class", "y-axis");
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

        // Sort by score
        vis.leaderboardData = Array.from(modelScores.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, 5); // Top 5 models
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
        const barHeight = 28;
        const barPadding = 12;
        
        const xLeaderboard = d3.scaleLinear()
            .domain([0, d3.max(vis.leaderboardData, d => d.score)])
            .range([0, vis.width - 200]);

        vis.leaderboard.selectAll(".leaderboard-bar")
            .data(vis.leaderboardData, d => d.name)
            .join(
                enter => {
                    const g = enter.append("g")
                        .attr("class", "leaderboard-bar")
                        .attr("transform", (d, i) => `translate(150,${i * (barHeight + barPadding)})`);
                    
                    g.append("rect")
                        .attr("height", barHeight)
                        .attr("width", d => xLeaderboard(d.score))
                        .style("fill", d => vis.getModelColor(d.name));

                    g.append("text")
                        .attr("class", "model-name")
                        .attr("x", -10)
                        .attr("y", barHeight / 2)
                        .attr("text-anchor", "end")
                        .attr("dominant-baseline", "middle")
                        .style("font-size", "14px")
                        .text(d => d.name.length > 30 ? d.name.substring(0, 27) + "..." : d.name);

                    g.append("text")
                        .attr("class", "score-label")
                        .attr("x", d => xLeaderboard(d.score) + 10)
                        .attr("y", barHeight / 2)
                        .attr("dominant-baseline", "middle")
                        .style("font-size", "14px")
                        .text(d => d.score.toFixed(1));

                    return g;
                },
                update => update
                    .attr("transform", (d, i) => `translate(150,${i * (barHeight + barPadding)})`)
                    .call(update => {
                        update.select("rect")
                            .attr("width", d => xLeaderboard(d.score))
                            .style("fill", d => vis.getModelColor(d.name));

                        update.select(".score-label")
                            .attr("x", d => xLeaderboard(d.score) + 10)
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

        // Update scales with fixed y-axis range
        vis.x.domain(d3.extent(vis.processedData, d => d.date));
        vis.y.domain([0, 60]); // Fixed range to prevent squashing

        // Update axes with transitions
        vis.xAxisG.transition()
            .duration(500)
            .call(vis.xAxis)
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end")
            .style("font-size", "12px");

        vis.yAxisG.transition()
            .duration(500)
            .call(vis.yAxis)
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
        const points = vis.chartArea.selectAll(".point")
            .data(currentData, d => d.name + d.date);

        points.exit()
            .transition()
            .duration(200)
            .attr("r", 0)
            .style("opacity", 0)
            .remove();

        points.enter()
            .append("circle")
            .attr("class", "point")
            .attr("cx", d => vis.x(d.date))
            .attr("cy", d => vis.y(d.score))
            .attr("r", 0)
            .style("opacity", 0)
            .merge(points)
            .transition()
            .duration(200)
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
            });

        // Update leaderboard
        const barHeight = 28;
        const barPadding = 12;
        const totalBarSpace = barHeight + barPadding;
        
        const xLeaderboard = d3.scaleLinear()
            .domain([0, d3.max(vis.leaderboardData, d => d.score)])
            .range([0, vis.width - 200]);

        const bars = vis.leaderboard.selectAll(".leaderboard-bar")
            .data(vis.leaderboardData, d => d.name);

        // Remove old bars with animation from bottom
        bars.exit()
            .transition()
            .duration(200)
            .attr("transform", `translate(150,${vis.leaderboardHeight + totalBarSpace})`)
            .remove();

        // Add new bars starting from bottom
        const barsEnter = bars.enter()
            .append("g")
            .attr("class", "leaderboard-bar")
            .attr("transform", `translate(150,${vis.leaderboardHeight + totalBarSpace})`);

        // Add bar rectangles
        barsEnter.append("rect")
            .attr("height", barHeight)
            .attr("width", 0);

        // Add text immediately
        barsEnter.append("text")
            .attr("class", "model-name")
            .attr("x", -10)
            .attr("y", barHeight / 2)
            .attr("text-anchor", "end")
            .attr("dominant-baseline", "middle")
            .style("font-size", "14px")
            .text(d => {
                if (d.name.length > 30) {
                    return d.name.substring(0, 27) + "...";
                }
                return d.name;
            });

        barsEnter.append("text")
            .attr("class", "score-label")
            .attr("y", barHeight / 2)
            .attr("dominant-baseline", "middle")
            .style("font-size", "14px");

        // Calculate final positions from bottom up
        const getBarY = (i) => {
            const totalBars = vis.leaderboardData.length;
            return (totalBars - 1 - i) * totalBarSpace; // Reverse the order
        };

        // Update all bars with transition
        const allBars = bars.merge(barsEnter);

        // Transition bars to their new positions
        allBars.transition()
            .duration(200)
            .attr("transform", (d, i) => `translate(150,${getBarY(i)})`);

        // Update rectangles
        allBars.select("rect")
            .transition()
            .duration(200)
            .attr("height", barHeight)
            .attr("width", d => xLeaderboard(d.score))
            .style("fill", d => vis.getModelColor(d.name));

        // Update text (moves with the group transform)
        allBars.select(".score-label")
            .attr("x", d => xLeaderboard(d.score) + 10)
            .text(d => d.score.toFixed(1));

        // Update slider handle
        const slider = vis.sliderContainer.selectAll(".date-slider")
            .data([vis.currentDate])
            .join("g")
            .attr("class", "date-slider");

        const handle = slider.selectAll(".handle")
            .data([null])
            .join("circle")
            .attr("class", "handle")
            .attr("cx", vis.x(vis.currentDate))
            .attr("cy", 4)
            .attr("r", 8)
            .attr("fill", "#2563eb")
            .style("cursor", "pointer")
            .call(d3.drag()
                .on("drag", function(event) {
                    vis.stopAnimation(); // Stop animation if dragging
                    const x = Math.max(0, Math.min(vis.width, event.x));
                    const date = vis.x.invert(x);
                    vis.currentDate = date;
                    vis.wrangleData();
                }));

        // Update date label
        vis.sliderContainer.select(".date-label")
            .text(d3.timeFormat("%B %d, %Y")(vis.currentDate));
    }

    updateDimensions() {
        let vis = this;
        
        // Get container dimensions
        const container = document.getElementById(vis.parentElement);
        const containerWidth = container.getBoundingClientRect().width;
        
        vis.width = containerWidth - vis.margin.left - vis.margin.right;
        vis.height = Math.min(500, window.innerHeight * 0.5) - vis.margin.top - vis.margin.bottom;

        // Update SVG dimensions
        vis.svg
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom);

        // Update scales
        vis.x.range([0, vis.width]);
        vis.y.range([vis.height, 0]);

        // Update axes and labels
        vis.xAxis.scale(vis.x);
        vis.yAxis.scale(vis.y);
        
        vis.xAxisG
            .attr("transform", `translate(0,${vis.height})`);
            
        // Update title and subtitle positions
        vis.svg.select(".chart-title")
            .attr("x", vis.width / 2);
        vis.svg.select(".chart-subtitle")
            .attr("x", vis.width / 2);
            
        // Update axis labels
        vis.svg.select(".x-label")
            .attr("x", vis.width / 2)
            .attr("y", vis.height + 40);
        vis.svg.select(".y-label")
            .attr("x", -vis.height / 2);
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