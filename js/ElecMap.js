class ElectricityMap {
    constructor(parentElement, csvData, dataCenters) {
        let vis = this;
        vis.parentElement = parentElement;
        vis.rawData = vis.processData(csvData);
        vis.dataCenters = vis.processDataCenters(dataCenters);
        vis.map = null;

        // Default settings
        vis.currentYear = 2022;
        vis.currentSector = 'Commercial';

        // Initialize margins
        vis.margin = {top: 20, right: 20, bottom: 20, left: 20};
        
        vis.initVis();
    }

    processData(csvData) {
        let vis = this;
        const processed = {};

        csvData.forEach(row => {
            const state = row.State;
            const sector = row.Sector;

            if (state !== 'US') {
                if (!processed[state]) processed[state] = {};
                if (!processed[state][sector]) processed[state][sector] = {};

                // Process each year column (1960 through 2022)
                for (let year = 1960; year <= 2022; year++) {
                    processed[state][sector][year] = parseFloat(row[year]);
                }
            }
        });

        return processed;
    }

    processDataCenters(dataCenters) {
        // Process data centers array into a flat structure with state information
        let processed = [];
        dataCenters.forEach(state => {
            state.cities.forEach(city => {
                city.data_centers.forEach(dc => {
                    processed.push({
                        ...dc,
                        state: state.state,
                        city: city.city
                    });
                });
            });
        });
        return processed;
    }

    initVis() {
        let vis = this;
        
        // Get container dimensions
        const container = document.getElementById(vis.parentElement);
        if (!container) {
            console.warn('Map container not visible yet, waiting...');
            return;
        }

        const rect = container.getBoundingClientRect();
        vis.width = rect.width - vis.margin.left - vis.margin.right;
        vis.height = rect.height - vis.margin.top - vis.margin.bottom;

        // Create a wrapper div to contain both map and buttons
        vis.wrapper = d3.select(`#${vis.parentElement}`)
            .append('div')
            .attr('class', 'map-wrapper')
            .style('position', 'relative')
            .style('width', '100%')
            .style('height', '100%');

        // Create map container
        vis.mapContainer = vis.wrapper
            .append('div')
            .attr('class', 'map-container')
            .style('width', vis.width + 'px')
            .style('height', (vis.height - 60) + 'px')  // Reduced height to make room for buttons
            .style('position', 'relative');

        // Create button container with proper z-index
        const buttonContainer = vis.wrapper
            .append('div')
            .attr('class', 'sector-buttons')
            .style('position', 'absolute')
            .style('bottom', '10px')
            .style('left', '50%')
            .style('transform', 'translateX(-50%)')
            .style('text-align', 'center')
            .style('width', '100%')
            .style('z-index', '1000')
            .style('pointer-events', 'auto');

        // Add sector buttons with better styling
        const sectors = ['Commercial', 'Industrial', 'Residential', 'Transportation'];
        const buttonGroup = buttonContainer.append('div')
            .attr('class', 'btn-group')
            .attr('role', 'group')
            .style('background-color', 'white')  // Add white background
            .style('padding', '5px')
            .style('border-radius', '5px')
            .style('box-shadow', '0 2px 4px rgba(0,0,0,0.1)');

        sectors.forEach(sector => {
            buttonGroup.append('button')
                .attr('type', 'button')
                .attr('class', sector === vis.currentSector ? 'btn btn-primary' : 'btn btn-outline-primary')
                .style('min-width', '120px')  // Ensure consistent button width
                .style('margin', '0 2px')     // Add spacing between buttons
                .text(sector)
                .on('click', function() {
                    // Update active button
                    buttonGroup.selectAll('.btn')
                        .classed('btn-primary', false)
                        .classed('btn-outline-primary', true);
                    d3.select(this)
                        .classed('btn-outline-primary', false)
                        .classed('btn-primary', true);

                    // Update sector and redraw
                    vis.currentSector = sector;
                    if (vis.geojsonLayer) {
                        vis.geojsonLayer.setStyle((feature) => vis.getStateStyle(feature));
                    }
                    vis.updateVis();
                });
        });

        // Initialize map
        vis.initMap();
        vis.initLegend();

        // Create markers for data centers
        vis.initDataCenterMarkers();
    }

    initDataCenterMarkers2() {
        let vis = this;

        // Create a marker layer group
        vis.markersLayer = L.layerGroup();

        // Define coordinates for major cities
        const cityCoordinates = {
            'Los Angeles': [34.0522, -118.2437],
            'San Jose': [37.3382, -121.8863],
            'San Francisco': [37.7749, -122.4194],
            'Montgomery TX': [30.3897, -95.6972],
            'Ashburn': [39.0438, -77.4874],
            'Pittsburgh': [40.4406, -79.9959],
            'Fort Wayne': [41.0793, -85.1394],
            'Cleveland': [41.4993, -81.6944],
            'Baltimore': [39.2904, -76.6122],
            'Wallingford': [41.4570, -72.8230],
            'Hattiesburg': [31.3271, -89.2903]
        };

        // Add markers for each data center
        vis.dataCenters.forEach(dc => {
            const coords = cityCoordinates[dc.city];
            if (coords) {
                // Create marker with slight random offset to prevent complete overlap
                const lat = coords[0] + (Math.random() - 0.5) * 0.1;
                const lng = coords[1] + (Math.random() - 0.5) * 0.1;

                const marker = L.circleMarker([lat, lng], {
                    radius: 5,
                    fillColor: '#E63946',
                    color: '#000',
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.7
                });

                // Add popup with data center info
                marker.bindPopup(`
                    <strong>${dc.name}</strong><br>
                    ${dc.address}<br>
                    ${dc.city}, ${dc.state} ${dc.zip_code}
                `);

                marker.addTo(vis.markersLayer);
            }
        });

        // Add the marker layer to the map
        if (vis.map) {
            vis.markersLayer.addTo(vis.map);
        }
    }

    initDataCenterMarkers() {
        let vis = this;

        // Create a marker layer group
        vis.markersLayer = L.layerGroup();

        // Create tooltip div if it doesn't exist
        if (!vis.tooltip) {
            vis.tooltip = d3.select("body").append("div")
                .attr("class", "datacenter-tooltip")
                .style("opacity", 0)
                .style("position", "absolute")
                .style("background", "white")
                .style("padding", "10px")
                .style("border", "1px solid #ccc")
                .style("border-radius", "5px")
                .style("pointer-events", "none")
                .style("font-size", "12px")
                .style("max-width", "300px")
                .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)")
                .style("z-index", 1000);
        }

        // Define coordinates for major cities
        const cityCoordinates = {
            'Los Angeles': [34.0522, -118.2437],
            'San Jose': [37.3382, -121.8863],
            'San Francisco': [37.7749, -122.4194],
            'Montgomery TX': [30.3897, -95.6972],
            'Ashburn': [39.0438, -77.4874],
            'Pittsburgh': [40.4406, -79.9959],
            'Fort Wayne': [41.0793, -85.1394],
            'Cleveland': [41.4993, -81.6944],
            'Baltimore': [39.2904, -76.6122],
            'Wallingford': [41.4570, -72.8230],
            'Hattiesburg': [31.3271, -89.2903]
        };

        // Add markers for each data center
        vis.dataCenters.forEach(dc => {
            const coords = cityCoordinates[dc.city];
            if (coords) {
                // Create marker with slight random offset to prevent complete overlap
                const lat = coords[0] + (Math.random() - 0.5) * 0.1;
                const lng = coords[1] + (Math.random() - 0.5) * 0.1;

                const marker = L.circleMarker([lat, lng], {
                    radius: 5,
                    fillColor: '#E63946',
                    color: '#000',
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.7
                });

                // Add hover events for tooltip
                marker.on('mouseover', (e) => {
                    // Change marker style on hover
                    e.target.setStyle({
                        radius: 7,
                        fillOpacity: 1
                    });

                    // Show tooltip
                    vis.tooltip
                        .style("opacity", 1)
                        .style("left", (e.originalEvent.pageX + 10) + "px")
                        .style("top", (e.originalEvent.pageY - 10) + "px")
                        .html(`
                            <div style="font-weight: bold; margin-bottom: 5px; color: #333;">
                                ${dc.name}
                            </div>
                            <div style="color: #666;">
                                ${dc.address}<br>
                                ${dc.city}, ${dc.state} ${dc.zip_code}
                            </div>
                        `);
                });

                marker.on('mouseout', (e) => {
                    // Reset marker style
                    e.target.setStyle({
                        radius: 5,
                        fillOpacity: 0.7
                    });

                    // Hide tooltip
                    vis.tooltip.style("opacity", 0);
                });

                marker.on('mousemove', (e) => {
                    // Move tooltip with cursor
                    vis.tooltip
                        .style("left", (e.originalEvent.pageX + 10) + "px")
                        .style("top", (e.originalEvent.pageY - 10) + "px");
                });

                marker.addTo(vis.markersLayer);
            }
        });

        // Add the marker layer to the map
        if (vis.map) {
            vis.markersLayer.addTo(vis.map);
        }
    }




    initMap() {
        let vis = this;

        // Check if container exists
        const container = document.getElementById(vis.parentElement);
        if (!container) {
            console.error(`Map container not found: #${vis.parentElement}`);
            return;
        }

        // Wait for container to be visible
        if (container.offsetParent === null || !container.offsetWidth) {
            console.log('Map container not visible yet, waiting...');
            requestAnimationFrame(() => vis.initMap());
            return;
        }

        // Create Leaflet map only if it doesn't exist
        if (!vis.map) {
            vis.map = L.map(vis.parentElement, {
                zoomControl: true,
                scrollWheelZoom: false
            }).setView([37.8, -96], 4);

            // Add tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
            }).addTo(vis.map);

            // Load GeoJSON and initialize choropleth
            fetch('https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json')
                .then(response => response.json())
                .then(geojson => {
                    if (!vis.map) {
                        console.warn('Map was destroyed before GeoJSON loaded');
                        return;
                    }
                    vis.geojsonLayer = L.geoJSON(geojson, {
                        style: (feature) => vis.getStateStyle(feature),
                        onEachFeature: (feature, layer) => vis.addFeatureInteraction(feature, layer)
                    }).addTo(vis.map);

                    // Add data center markers after states are loaded
                    vis.initDataCenterMarkers();

                    vis.updateVis();
                })
                .catch(error => {
                    console.error('Error loading GeoJSON:', error);
                    vis.showError('Error loading map data. Please try refreshing the page.');
                });
        }
    }

    initLegend() {
        let vis = this;
        
        const legend = d3.select(`#${vis.parentElement}`)
            .append('div')
            .attr('class', 'legend')
            .style('position', 'absolute')
            .style('top', '20px')
            .style('right', '20px')
            .style('background', 'white')
            .style('padding', '10px')
            .style('border-radius', '5px')
            .style('z-index', 1000);

        // Create color gradient
        const width = 200, height = 20;

        const svg = legend.append('svg')
            .attr('width', width)
            .attr('height', height);

        const gradient = svg.append('defs')
            .append('linearGradient')
            .attr('id', 'legend-gradient')
            .attr('x1', '0%')
            .attr('y1', '0%')
            .attr('x2', '100%')
            .attr('y2', '0%');

        gradient.append('stop').attr('offset', '0%').attr('stop-color', '#e8f5f8');
        gradient.append('stop').attr('offset', '100%').attr('stop-color', '#4c6d9a');

        svg.append('rect')
            .attr('width', width)
            .attr('height', height)
            .style('fill', 'url(#legend-gradient)');

        vis.legendMin = legend.append('div').style('float', 'left').text('0 BTU');
        vis.legendMax = legend.append('div').style('float', 'right').text('Max BTU');
    }

    addFeatureInteraction(feature, layer) {
        let vis = this;

        layer.on({
            mouseover: (e) => {
                const layer = e.target;
                layer.setStyle({
                    weight: 2,
                    fillOpacity: 0.9
                });
            },
            mouseout: (e) => {
                vis.geojsonLayer.resetStyle(e.target);
            },
            click: (e) => {
                const stateName = feature.properties.name;
                const value = vis.getValue(stateName);
                L.popup()
                    .setLatLng(e.latlng)
                    .setContent(
                        `<b>${stateName}</b><br>${vis.currentSector}: ${d3.format(",")(value)} BTU`
                    )
                    .openOn(vis.map);
            }
        });
    }

    wrangleData() {
        let vis = this;
        vis.updateVis();
    }

    updateVis() {
        let vis = this;
        
        if (vis.geojsonLayer) {
            vis.geojsonLayer.setStyle((feature) => vis.getStateStyle(feature));
        }

        // Update year display
        d3.select('.year-display').text(vis.currentYear);

        // Update legend
        const maxValue = vis.getMaxValue();
        vis.legendMin.text('0 BTU');
        vis.legendMax.text(`${d3.format(',')(Math.round(maxValue))} BTU`);
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

        // Update map container dimensions
        if (vis.mapContainer) {
            vis.mapContainer
                .style("width", vis.width + "px")
                .style("height", vis.height + "px");
        }
    }

    resize() {
        let vis = this;
        vis.updateDimensions();
        if (vis.map) {
            vis.map.invalidateSize();
        }
    }

    hide() {
        d3.select("#" + this.parentElement).style("display", "none");
    }

    show() {
        d3.select("#" + this.parentElement).style("display", "block");
        if (this.map) {
            setTimeout(() => this.map.invalidateSize(), 100);
        }
    }

    destroy() {
        let vis = this;
        if (vis.map) {
            vis.map.remove();
            vis.map = null;
        }
        if (vis.tooltip) {
            vis.tooltip.remove();
            vis.tooltip = null;
        }
    }

    getStateStyle(feature) {
        let vis = this;
        const value = vis.getValue(feature.properties.name);
        return {
            fillColor: vis.getColor(value),
            weight: 1,
            opacity: 1,
            color: '#666',
            fillOpacity: 0.7
        };
    }

    getColor(value) {
        let vis = this;
        const colorScale = d3.scaleSequential()
            .domain([0, vis.getMaxValue()])
            .interpolator(d3.interpolateBlues);

        return value ? colorScale(value) : '#ccc';
    }

    getMaxValue() {
        let vis = this;
        const values = Object.keys(vis.rawData)
            .map(state => vis.rawData[state][vis.currentSector][vis.currentYear])
            .filter(value => value !== undefined && value !== null);

        return d3.max(values) || 0;
    }

    getValue(stateName) {
        let vis = this;
        try {
            const stateAbbr = vis.getStateAbbreviation(stateName);
            return vis.rawData[stateAbbr]?.[vis.currentSector]?.[vis.currentYear] || 0;
        } catch (error) {
            console.warn(`Error getting value for state ${stateName}:`, error);
            return 0;
        }
    }

    getStateAbbreviation(stateName) {
        const stateMap = {
            'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
            'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
            'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
            'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
            'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
            'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
            'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
            'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
            'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
            'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
            'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
            'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
            'Wisconsin': 'WI', 'Wyoming': 'WY'
        };

        return stateMap[stateName] || stateName;
    }

    showError(message) {
        let vis = this;
        d3.select(`#${vis.parentElement}`)
            .append('div')
            .attr('class', 'error-message')
            .style('position', 'absolute')
            .style('top', '50%')
            .style('left', '50%')
            .style('transform', 'translate(-50%, -50%)')
            .style('background', 'white')
            .style('padding', '20px')
            .style('border-radius', '5px')
            .style('z-index', 1000)
            .text(message);
    }
}
