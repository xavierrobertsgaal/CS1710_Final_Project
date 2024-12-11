// Placeholder for line chart -- used in a number of different visualizations
class LineChart {
    constructor(parentElement, data) {
        let vis = this;
        vis.parentElement = parentElement;
        
        // Create wrapper div for chart and leaderboard
        d3.select(`#${parentElement}`)
            .style("position", "relative")
            .html("");
        
        // Create visualization container with transform
        vis.container = d3.select(`#${parentElement}`)
            .append("div")
            .style("display", "flex")
            .style("flex-direction", "column")
            .style("align-items", "center")
            .style("gap", "5px")
            .style("width", "100%")
            .style("transform", "translateY(-60px)");  // Move everything up
        
        // Add animation controls container FIRST
        vis.animationControls = vis.container
            .append("div")
            .attr("class", "animation-controls")
            .style("width", "100%")
            .style("max-width", "1000px")
            .style("margin-bottom", "10px")
            .style("position", "relative")
            .style("display", "flex")
            .style("gap", "10px")
            .style("align-items", "center");
        
        // Add slider FIRST (keep DOM order)
        vis.slider = vis.animationControls
            .append("input")
            .attr("type", "range")
            .attr("min", "0")
            .attr("max", "100")
            .attr("value", "0")
            .style("width", "calc(100% - 160px)")
            .style("transform", "translateX(70px)")
            .on("input", function() {
                // Stop any ongoing animation when manually sliding
                if (vis.isPlaying) {
                    d3.select(this).interrupt();
                    vis.isPlaying = false;
                }

                const percent = this.value;
                const dates = vis.processedData.map(d => d.date);
                const minDate = d3.min(dates);
                const maxDate = d3.max(dates);
                const currentDate = new Date(minDate.getTime() + (maxDate.getTime() - minDate.getTime()) * (percent / 100));
                
                // Update clip path width
                vis.clipRect.attr("width", (vis.width * percent) / 100);
                
                // Update current date and redraw
                vis.currentDate = currentDate;
                vis.updateVis();
            });
        
        // THEN add play button (positioned left)
        vis.playButton = vis.animationControls
            .append("button")
            .style("padding", "8px 16px")
            .style("cursor", "pointer")
            .style("background-color", "#1e40af")
            .style("color", "white")
            .style("border", "none")
            .style("border-radius", "4px")
            .style("font-weight", "500")
            .style("font-size", "14px")
            .style("height", "36px")
            .style("position", "absolute")
            .style("left", "0")
            .style("transform", "translateY(-50%)")
            .style("top", "50%")
            .text("Play")
            .on("click", function() {
                vis.slider.node().value = 0;
                vis.startAnimation();
            });
        
        // THEN add Today button (positioned right)
        vis.todayButton = vis.animationControls
            .append("button")
            .style("padding", "8px 16px")
            .style("cursor", "pointer")
            .style("background-color", "#1e40af")
            .style("color", "white")
            .style("border", "none")
            .style("border-radius", "4px")
            .style("font-weight", "500")
            .style("font-size", "14px")
            .style("height", "36px")
            .style("position", "absolute")
            .style("right", "0")
            .style("transform", "translateY(-50%)")
            .style("top", "50%")
            .text("Today")
            .on("click", function() {
                vis.slider.node().value = 100;
                vis.slider.node().dispatchEvent(new Event('input'));
            });
        
        vis.hasPlayed = false;
        vis.isPlaying = false;
        
        // THEN create chart container
        vis.chartContainer = vis.container
            .append("div")
            .attr("class", "chart-container")
            .style("width", "100%");
        
        // THEN create leaderboard container
        vis.leaderboard = vis.container
            .append("div")
            .attr("class", "leaderboard")
            .style("width", "100%")
            .style("max-width", "800px");
        
        // Add leaderboard title
        vis.leaderboard.append("div")
            .style("font-size", "20px")
            .style("font-weight", "bold")
            .style("margin-bottom", "5px")
            .style("color", "#1a1a1a")
            .text("Leaderboard");
        
        // Add leaderboard legends with larger font
        vis.leaderboard.append("div")
            .style("display", "flex")
            .style("justify-content", "space-between")
            .style("color", "#666")
            .style("font-size", "14px")
            .style("font-weight", "500")
            .style("margin-top", "5px")
            .style("padding", "0 15px")
            .html(`
                <span>Model</span>
                <span>Score</span>
            `);
        
        vis.data = data;
        vis.currentDate = null;
        
        vis.margin = { 
            top: 100,
            right: 80,
            bottom: 50,
            left: 80
        };
        
        vis.updateDimensions();

        vis.initVis();
    }

    updateDimensions() {
        let vis = this;
        
        // Calculate dimensions based on container
        const container = document.getElementById(vis.parentElement);
        vis.width = container.getBoundingClientRect().width - vis.margin.left - vis.margin.right;
        vis.height = 400;
    }

    initVis() {
        let vis = this;
        
        // Create tooltip div if it doesn't exist
        if (!d3.select("#chart-tooltip").node()) {
            vis.tooltip = d3.select("body").append("div")
                .attr("id", "chart-tooltip")
                .style("position", "absolute")
                .style("visibility", "hidden")
                .style("background-color", "white")
                .style("border", "1px solid #ddd")
                .style("border-radius", "4px")
                .style("padding", "12px")
                .style("font-size", "14px")
                .style("box-shadow", "0 2px 8px rgba(0,0,0,0.1)")
                .style("pointer-events", "none")
                .style("z-index", "1000");
        } else {
            vis.tooltip = d3.select("#chart-tooltip");
        }

        // Create SVG
        vis.svg = vis.chartContainer
            .append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append("g")
            .attr("transform", `translate(${vis.margin.left},${vis.margin.top})`);

        // Add title with conditional wrapping
        const titleText = "AI Model Performance Progress on SWE-Bench-Verified";
        const shouldWrapTitle = vis.width < 600;
        
        const titleElement = vis.svg.append("text")
            .attr("class", "chart-title")
            .attr("x", vis.width / 2)
            .attr("y", -70)
            .attr("text-anchor", "middle")
            .style("font-size", "20px")
            .style("font-weight", "bold");

        if (shouldWrapTitle) {
            titleElement.selectAll("tspan")
                .data(["AI Model Performance Progress", "on SWE-Bench-Verified"])
                .join("tspan")
                .attr("x", vis.width / 2)
                .attr("dy", (d, i) => i === 0 ? 0 : "1.2em")
                .text(d => d);
        } else {
            titleElement.text(titleText);
        }

        // Add legend with proper spacing
        const legendItems = [
            { label: "Claude/Anthropic Models", color: "#f97316" },
            { label: "GPT/OpenAI Models", color: "#22c55e" },
            { label: "Other Models", color: "#6b7280" }
        ];

        const legend = vis.svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${vis.width/2},-35)`);

        const legendSpacing = 180;  // Fixed spacing between items
        const totalWidth = legendSpacing * (legendItems.length - 1);
        const startX = -totalWidth / 2;

        legendItems.forEach((item, i) => {
            const g = legend.append("g")
                .attr("transform", `translate(${startX + i * legendSpacing}, 0)`);
            
            g.append("circle")
                .attr("r", 5)
                .style("fill", item.color);
            
            g.append("text")
                .attr("x", 12)
                .attr("y", 4)
                .style("font-size", "12px")
                .text(item.label);
        });

        // Modify clip path for animation
        vis.clipRect = vis.svg.append("defs")
            .append("clipPath")
            .attr("id", `clip-${vis.parentElement}`)
            .append("rect")
            .attr("width", vis.width)
            .attr("height", vis.height);

        // Add clipped chart area
        vis.chartArea = vis.svg.append("g")
            .attr("clip-path", `url(#clip-${vis.parentElement})`);

        // Create scales
        vis.x = d3.scaleTime().range([0, vis.width]);
        vis.y = d3.scaleLinear().range([vis.height, 0]);

        // Add axes
        vis.xAxis = vis.svg.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${vis.height})`);

        vis.yAxis = vis.svg.append("g")
            .attr("class", "y-axis");

        // Add y-axis label
        vis.svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -40)
            .attr("x", -vis.height / 2)
            .attr("text-anchor", "middle")
            .text("Evaluation Score (higher is more human-like)");

        vis.wrangleData();
    }

    wrangleData() {
        let vis = this;
        
        // Process data
        vis.processedData = vis.data.map(d => {
            const name = d.cleaned_name.toLowerCase();
            let color;
            if (name.includes("anthropic") || name.includes("claude")) {
                color = "#f97316";  // Orange
            } else if (name.includes("openai") || name.includes("gpt")) {
                color = "#22c55e";  // Green
            } else {
                color = "#6b7280";  // Gray
            }
            
            return {
                name: d.cleaned_name,
                date: d3.timeParse("%m/%d/%y")(d.date),
                score: +d.score,
                color: color
            };
        }).sort((a, b) => a.date - b.date);

        // Set current date to latest if not set
        vis.currentDate = vis.currentDate || d3.max(vis.processedData, d => d.date);

        // Calculate Pareto frontier
        vis.paretoPoints = [];
        let maxScore = -Infinity;
        
        const dateGroups = d3.group(vis.processedData, d => d.date.getTime());
        Array.from(dateGroups.entries())
            .sort(([a], [b]) => a - b)
            .forEach(([date, points]) => {
                const maxPoint = points.reduce((max, p) => p.score > max.score ? p : max);
                if (maxPoint.score >= maxScore) {
                    maxScore = maxPoint.score;
                    vis.paretoPoints.push(maxPoint);
                }
            });

        vis.updateVis();
    }

    updateVis() {
        let vis = this;
        
        // Update scales with padding on both sides
        vis.x.domain([
            d3.timeDay.offset(d3.min(vis.processedData, d => d.date), -7),
            d3.timeDay.offset(d3.max(vis.processedData, d => d.date), 7)
        ]);
        vis.y.domain([0, d3.max(vis.processedData, d => d.score) * 1.15]);

        // Update axes with rotated text
        vis.xAxis.call(
            d3.axisBottom(vis.x)
                .tickFormat(d3.timeFormat("%b %Y"))
                .ticks(d3.timeMonth.every(1))
        )
        .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", "rotate(-45)");

        vis.yAxis.call(d3.axisLeft(vis.y));
        
        // Filter data by current date
        const currentData = vis.processedData.filter(d => d.date <= vis.currentDate);
        const currentPareto = vis.paretoPoints.filter(d => d.date <= vis.currentDate);

        // Get latest score for each model for leaderboard
        const modelScores = new Map();
        currentData.forEach(d => {
            if (!modelScores.has(d.name) || modelScores.get(d.name).date < d.date) {
                modelScores.set(d.name, {
                    name: d.name,
                    score: d.score,
                    date: d.date,
                    color: d.color
                });
            }
        });

        // Sort and get top 5 for leaderboard
        const leaderboardData = Array.from(modelScores.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);

        // Calculate score range for scaling leaderboard bars
        const maxScore = d3.max(vis.processedData, d => d.score);
        const minScore = d3.min(vis.processedData, d => d.score);
        const scoreRange = maxScore - minScore;

        // Draw Pareto line
        const line = d3.line()
            .x(d => vis.x(d.date))
            .y(d => vis.y(d.score));

        vis.chartArea.selectAll(".pareto-line")
            .data([currentPareto])
            .join("path")
            .attr("class", "pareto-line")
            .attr("d", line)
            .style("fill", "none")
            .style("stroke", "#1e40af")
            .style("stroke-width", 2);

        // Draw points with linked hover effects
        vis.chartArea.selectAll(".model-point")
            .data(currentData)
            .join("circle")
            .attr("class", d => `model-point model-${d.name.replace(/[^a-zA-Z0-9]/g, '-')}`)
            .attr("cx", d => vis.x(d.date))
            .attr("cy", d => vis.y(d.score))
            .attr("r", d => currentPareto.includes(d) ? 6 : 4)
            .style("fill", d => d.color)
            .style("opacity", d => currentPareto.includes(d) ? 1 : 0.7)
            .style("stroke", d => currentPareto.includes(d) ? "#1e40af" : "none")
            .style("stroke-width", d => currentPareto.includes(d) ? 2 : 0)
            .style("cursor", "pointer")
            .style("transition", "all 0.2s ease")
            .on("mouseover", function(event, d) {
                // More pronounced point highlight
                d3.select(this)
                    .style("opacity", 1)
                    .attr("r", d => currentPareto.includes(d) ? 10 : 8)
                    .style("stroke", "#fbbf24")  // Yellow stroke (#fbbf24 is a nice warm yellow)
                    .style("stroke-width", 3);
                
                // More pronounced leaderboard highlight
                vis.leaderboard.selectAll(".leaderboard-entry")
                    .filter(entry => entry.name === d.name)
                    .style("filter", "brightness(85%)")
                    .style("transform", "scale(1.05)")
                    .style("box-shadow", "0 4px 12px rgba(0,0,0,0.1)")
                    .style("border", "2px solid #fbbf24");  // Add yellow border
                
                // Show tooltip
                vis.tooltip
                    .style("visibility", "visible")
                    .html(`
                        <div style="font-weight: bold; color: ${d.color}; margin-bottom: 8px;">
                            ${d.name}
                        </div>
                        <div style="color: #4a4a4a; margin-bottom: 4px;">
                            Score: <span style="font-weight: 600">${d.score.toFixed(1)}</span>
                        </div>
                        <div style="color: #4a4a4a;">
                            Date: <span style="font-weight: 500">${d3.timeFormat("%B %d, %Y")(d.date)}</span>
                        </div>
                    `)
                    .style("left", `${event.pageX + 15}px`)
                    .style("top", `${event.pageY - 15}px`);
            })
            .on("mouseout", function(event, d) {
                // Reset point
                d3.select(this)
                    .style("opacity", d => currentPareto.includes(d) ? 1 : 0.7)
                    .attr("r", d => currentPareto.includes(d) ? 6 : 4)
                    .style("stroke", d => currentPareto.includes(d) ? "#1e40af" : "none")
                    .style("stroke-width", d => currentPareto.includes(d) ? 2 : 0);
                
                // Reset leaderboard entry
                vis.leaderboard.selectAll(".leaderboard-entry")
                    .style("filter", "none")
                    .style("transform", "none")
                    .style("box-shadow", "none")
                    .style("border", "2px solid transparent");  // Reset border
                
                vis.tooltip.style("visibility", "hidden");
            })
            .on("click", function(event, d) {
                // Calculate the percentage for seven days after this point
                const dates = vis.processedData.map(d => d.date);
                const minDate = d3.min(dates);
                const maxDate = d3.max(dates);
                const sevenDaysAfter = d3.timeDay.offset(d.date, 7);
                const percent = ((sevenDaysAfter - minDate) / (maxDate - minDate)) * 100;
                
                // Set slider value and trigger update
                vis.slider.node().value = Math.min(100, percent);
                vis.slider.node().dispatchEvent(new Event('input'));
            });

        // Update leaderboard with enhanced hover effects
        vis.leaderboard.selectAll(".leaderboard-entry")
            .data(leaderboardData)
            .join("div")
            .attr("class", d => `leaderboard-entry model-${d.name.replace(/[^a-zA-Z0-9]/g, '-')}`)
            .style("background-color", d => d.color)
            .style("padding", "6px 15px")
            .style("margin", "3px 0")
            .style("border-radius", "4px")
            .style("color", "white")
            .style("display", "flex")
            .style("justify-content", "space-between")
            .style("align-items", "center")
            .style("width", d => `${((d.score - minScore) / scoreRange) * 100}%`)
            .style("min-width", "200px")
            .style("cursor", "pointer")
            .style("transition", "all 0.2s ease")
            .style("border", "2px solid transparent")
            .html(d => `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: bold; font-size: 14px;">${d.name}</span>
                </div>
                <span style="font-weight: bold; font-size: 14px;">${d.score.toFixed(1)}</span>
            `)
            .on("mouseover", function(event, d) {
                // More pronounced leaderboard highlight
                d3.select(this)
                    .style("filter", "brightness(85%)")
                    .style("transform", "scale(1.05)")
                    .style("box-shadow", "0 4px 12px rgba(0,0,0,0.1)")
                    .style("border", "2px solid #fbbf24");  // Add yellow border
                
                // More pronounced point highlight
                vis.chartArea.selectAll(".model-point")
                    .filter(point => point.name === d.name)
                    .style("opacity", 1)
                    .attr("r", point => currentPareto.includes(point) ? 10 : 8)
                    .style("stroke", "#fbbf24")  // Yellow stroke
                    .style("stroke-width", 3);
            })
            .on("mouseout", function(event, d) {
                // Reset leaderboard
                d3.select(this)
                    .style("filter", "none")
                    .style("transform", "none")
                    .style("box-shadow", "none");
                
                // Reset points
                vis.chartArea.selectAll(".model-point")
                    .filter(point => point.name === d.name)
                    .style("opacity", point => currentPareto.includes(point) ? 1 : 0.7)
                    .attr("r", point => currentPareto.includes(point) ? 6 : 4)
                    .style("stroke", point => currentPareto.includes(point) ? "#1e40af" : "none")
                    .style("stroke-width", point => currentPareto.includes(point) ? 2 : 0);
            })
            .on("click", function(event, d) {
                // Calculate the percentage for seven days after this point
                const dates = vis.processedData.map(d => d.date);
                const minDate = d3.min(dates);
                const maxDate = d3.max(dates);
                const sevenDaysAfter = d3.timeDay.offset(d.date, 7);
                const percent = ((sevenDaysAfter - minDate) / (maxDate - minDate)) * 100;
                
                // Set slider value and trigger update
                vis.slider.node().value = Math.min(100, percent);
                vis.slider.node().dispatchEvent(new Event('input'));
            });

        // Update legend with fixed positions
        const legendItems = [
            { label: "Anthropic Models", color: "#f97316" },
            { label: "OpenAI/GPT Models", color: "#22c55e" },
            { label: "Other Models", color: "#6b7280" }
        ];

        const legend = vis.svg.select(".legend")
            .attr("transform", `translate(${vis.width/2}, -35)`);

        const legendWidth = vis.width * 0.8;  // Use 80% of chart width
        const itemWidth = legendWidth / legendItems.length;
        const startX = -legendWidth / 2;  // Center the legend

        const legendGroups = legend.selectAll("g")
            .data(legendItems)
            .join("g")
            .attr("transform", (d, i) => `translate(${startX + (i * itemWidth)}, 0)`);

        legendGroups.selectAll("circle").remove();
        legendGroups.selectAll("text").remove();

        legendGroups.append("circle")
            .attr("r", 5)
            .style("fill", d => d.color);

        legendGroups.append("text")
            .attr("x", 12)
            .attr("y", 4)
            .style("font-size", "12px")
            .text(d => d.label);

        // Update leaderboard with current data
        vis.updateLeaderboard(currentData);
    }

    updateLeaderboard(currentData) {
        let vis = this;
        
        // Get latest score for each model
        const modelScores = new Map();
        currentData.forEach(d => {
            if (!modelScores.has(d.name) || modelScores.get(d.name).date < d.date) {
                modelScores.set(d.name, {
                    name: d.name,
                    score: d.score,
                    date: d.date,
                    color: d.color
                });
            }
        });

        // Sort and get top 5
        const leaderboardData = Array.from(modelScores.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);

        // Calculate score range for scaling
        const maxScore = d3.max(vis.processedData, d => d.score);
        const minScore = d3.min(vis.processedData, d => d.score);
        const scoreRange = maxScore - minScore;

        // Update leaderboard entries with thinner bars and smaller text
        vis.leaderboard.selectAll(".leaderboard-entry")
            .data(leaderboardData)
            .join("div")
            .attr("class", "leaderboard-entry")
            .style("background-color", d => d.color)
            .style("padding", "6px 15px")
            .style("margin", "3px 0")
            .style("border-radius", "4px")
            .style("color", "white")
            .style("display", "flex")
            .style("justify-content", "space-between")
            .style("align-items", "center")
            .style("width", d => `${((d.score - minScore) / scoreRange) * 100}%`)
            .style("min-width", "200px")
            .html(d => `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: bold; font-size: 14px;">${d.name}</span>
                </div>
                <span style="font-weight: bold; font-size: 14px;">${d.score.toFixed(1)}</span>
            `);
    }

    getModelColor(name) {
        name = name.toLowerCase();
        if (name.includes("anthropic") || name.includes("claude")) return "#f97316";
        if (name.includes("openai") || name.includes("gpt")) return "#22c55e";
        return "#6b7280";
    }

    resize() {
        let vis = this;
        
        // Update dimensions
        vis.updateDimensions();
        
        // Update chart container size
        vis.svg
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom);
        
        // Update scales
        vis.x.range([0, vis.width]);
        vis.y.range([vis.height, 0]);
        
        // Update title with conditional wrapping
        const shouldWrapTitle = vis.width < 600;
        const titleText = "AI Model Performance Progress on SWE-Bench-Verified";
        
        vis.svg.select(".chart-title").selectAll("*").remove();
        if (shouldWrapTitle) {
            vis.svg.select(".chart-title")
                .selectAll("tspan")
                .data(["Frontier model performance", "on SWE-Bench-Verified"])
                .join("tspan")
                .attr("x", vis.width / 2)
                .attr("dy", (d, i) => i === 0 ? 0 : "1.2em")
                .text(d => d);
        } else {
            vis.svg.select(".chart-title")
                .text(titleText);
        }
        
        // Update legend position and wrapping
        const shouldWrapLegend = vis.width < 800;
        const itemWidth = shouldWrapLegend ? 
            Math.min(100, vis.width / 4) : 
            Math.min(160, vis.width / 4);
        const startX = (vis.width - (itemWidth * 4)) / 2;
        
        vis.svg.selectAll(".legend g")
            .attr("transform", (d, i) => `translate(${startX + i * itemWidth}, 0)`);
        
        // Update visualization
        vis.updateVis();
    }

    // Add this method to be called from main.js's showVis
    triggerAnimation() {
        let vis = this;
        if (!vis.hasPlayed) {
            vis.hasPlayed = true;
            vis.startAnimation();
        }
    }

    startAnimation() {
        let vis = this;
        
        vis.isPlaying = true;
        
        // Create smooth transition with custom easing
        vis.animation = d3.transition()
            .duration(8000)
            .ease(d3.easeCubicOut)  // Changed from easeExpOut to easeCubicOut
            .tween("animation", () => {
                const interpolate = d3.interpolate(0, 100);
                return t => {
                    const percent = interpolate(t);
                    vis.slider.node().value = percent;
                    
                    const dates = vis.processedData.map(d => d.date);
                    const minDate = d3.min(dates);
                    const maxDate = d3.max(dates);
                    const currentDate = new Date(minDate.getTime() + (maxDate.getTime() - minDate.getTime()) * (percent / 100));
                    
                    // Update clip path width
                    vis.clipRect.attr("width", (vis.width * percent) / 100);
                    
                    // Update current date and redraw
                    vis.currentDate = currentDate;
                    vis.updateVis();
                };
            })
            .on("end", () => {
                vis.isPlaying = false;
            });
    }
}

// Common tooltip HTML generator
function getTooltipHTML(d) {
    const color = d.name.toLowerCase().includes('anthropic') || d.name.toLowerCase().includes('claude') ? '#f97316' :
                 d.name.toLowerCase().includes('openai') || d.name.toLowerCase().includes('gpt') ? '#22c55e' :
                 '#6b7280';
                 
    return `
        <div style="font-weight: bold; color: ${color}; margin-bottom: 8px;">
            ${d.name}
        </div>
        <div style="color: #4a4a4a; margin-bottom: 4px;">
            Score: <span style="font-weight: 600">${d.score.toFixed(1)}</span>
        </div>
        <div style="color: #4a4a4a;">
            Date: <span style="font-weight: 500">${d3.timeFormat("%B %d, %Y")(d.date)}</span>
        </div>
    `;
}