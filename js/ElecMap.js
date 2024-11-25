
class ElectricityMap {
    constructor(parentElement, csvData, dataCenters) {
        this.parentElement = parentElement;
        this.rawData = this.processData(csvData);
        this.dataCenters = dataCenters;

        // Default settings
        this.currentYear = 1960;
        this.currentSector = 'Commercial';

        // Initialize the visualization
        this.initVis();
    }

    // Data Processing
    processData(csvData) {
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

    // plotDataCenters() {
    //     this.dataCenters.forEach(state => {
    //         state.cities.forEach(city => {
    //             city.data_centers.forEach(dataCenter => {
    //                 // Geocode ZIP code or use external library/API to get coordinates
    //                 const zipCode = dataCenter.zip_code;
    //                 const coords = this.zipCodeToCoordinates(zipCode);
    //
    //                 if (coords) {
    //                     L.circleMarker(coords, {
    //                         radius: 5,
    //                         color: 'red',
    //                         fillColor: 'red',
    //                         fillOpacity: 0.7
    //                     }).addTo(this.map).bindPopup(`
    //                         <b>${dataCenter.name}</b><br>
    //                         ${dataCenter.address}<br>
    //                         ZIP: ${dataCenter.zip_code}
    //                     `);
    //                 }
    //             });
    //         });
    //     });
    // }
    //
    // // Placeholder for converting ZIP code to coordinates
    // async zipCodeToCoordinates(zipCode) {
    //     try {
    //         const response = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${zipCode}&format=json`);
    //         const data = await response.json();
    //         if (data.length > 0) {
    //             return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    //         } else {
    //             console.warn(`Coordinates not found for ZIP code: ${zipCode}`);
    //             return null;
    //         }
    //     } catch (error) {
    //         console.error(`Error fetching coordinates for ZIP code: ${zipCode}`, error);
    //         return null;
    //     }
    // }


    // Initialization
    initVis() {
        this.initMap();
        this.initLegend();
        // this.plotDataCenters();
    }

    initMap() {
        const vis = this;

        // Create Leaflet map
        vis.map = L.map(vis.parentElement).setView([37.8, -96], 4);

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(vis.map);

        // Load GeoJSON and initialize choropleth
        fetch('https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json')
            .then(response => response.json())
            .then(geojson => {
                vis.geojsonLayer = L.geoJSON(geojson, {
                    style: (feature) => this.getStateStyle(feature),
                    onEachFeature: (feature, layer) => this.addFeatureInteraction(feature, layer)
                }).addTo(vis.map);

                this.updateVis();
            })
            .catch(error => {
                console.error('Error loading GeoJSON:', error);
                this.showError('Error loading map data. Please try refreshing the page.');
            });
    }

    addFeatureInteraction(feature, layer) {
        const vis = this;

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
                const value = this.getValue(stateName);
                L.popup()
                    .setLatLng(e.latlng)
                    .setContent(
                        `<b>${stateName}</b><br>${this.currentSector}: ${d3.format(",")(value)} BTU`
                    )
                    .openOn(vis.map);
            }
        });
    }

    // Legend Initialization
    initLegend() {
        const legend = d3.select(`#${this.parentElement}`)
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

        gradient.append('stop').attr('offset', '0%').attr('stop-color', '#ffffff');
        gradient.append('stop').attr('offset', '100%').attr('stop-color', '#0000ff');

        svg.append('rect')
            .attr('width', width)
            .attr('height', height)
            .style('fill', 'url(#legend-gradient)');

        this.legendMin = legend.append('div').style('float', 'left').text('0 BTU');
        this.legendMax = legend.append('div').style('float', 'right').text('Max BTU');
    }

    // Visualization Update
    updateVis() {
        if (this.geojsonLayer) {
            this.geojsonLayer.setStyle((feature) => this.getStateStyle(feature));
        }

        // Update year display
        d3.select('.year-display').text(this.currentYear);

        // Update legend
        const maxValue = this.getMaxValue();
        this.legendMin.text('0 BTU');
        this.legendMax.text(`${d3.format(',')(Math.round(maxValue))} BTU`);
    }

    // State Style and Color
    getStateStyle(feature) {
        const value = this.getValue(feature.properties.name);
        return {
            fillColor: this.getColor(value),
            weight: 1,
            opacity: 1,
            color: '#666',
            fillOpacity: 0.7
        };
    }

    getColor(value) {
        const colorScale = d3.scaleSequential()
            .domain([0, this.getMaxValue()])
            .interpolator(d3.interpolateBlues);

        return value ? colorScale(value) : '#ccc';
    }

    getMaxValue() {
        const values = Object.keys(this.rawData)
            .map(state => this.rawData[state][this.currentSector][this.currentYear])
            .filter(value => value !== undefined && value !== null);

        return d3.max(values) || 0;
    }

    // State Data Helpers
    getValue(stateName) {
        try {
            const stateAbbr = this.getStateAbbreviation(stateName);
            return this.rawData[stateAbbr]?.[this.currentSector]?.[this.currentYear] || 0;
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

    // Error Handling
    showError(message) {
        d3.select(`#${this.parentElement}`)
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
