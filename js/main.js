let visualizations = {};

// Load data using d3 promises
const promises = [
    d3.csv("data/AIID_incidents_enhanced.csv"),
    d3.csv("data/Internet_Activities.csv"),
    d3.csv("data/swebench_verified_cleaned_2024_11_18.csv"),
    d3.csv("data/eia_consumption_by_sector.csv"),
    d3.json("data/datacenters.json")
];

// Map sections to their visualizations
const visualizationsToUpdate = {
    climate: ['climate', 'electricityMap', 'electricityTimeline'],
    incidents: ['incidents', 'sectors', 'brush'],
    'incidents-2': ['incidents', 'sectors', 'brush'],
    progress: ['progress']
};

// Container references
const containers = {
    climate: 'pretraining-carbon-intensity',
    electricityMap: 'electricity-data-center',
    electricityTimeline: 'electricity-timeline',
    incidents: 'incidents-over-time',
    sectors: 'ai-incidents-by-sector',
    progress: 'swe-bench-progress',
    brush: 'date-brush'
};

// Shared dimensions for consistent sizing
let sharedDimensions = {
    width: 0,
    height: 0,
    updateDimensions: function() {
        let container = document.querySelector('.sticky-graphic');
        if (container) {
            const rect = container.getBoundingClientRect();
            this.width = rect.width - 40; // Subtract padding
            this.height = Math.min(600, rect.height - 100); // Max height of 600px, account for controls
        }
    }
};

function initVisualizations(data) {
    console.log("Initializing visualizations with data:", data);
    
    // Ensure DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => initVis(data));
    } else {
        initVis(data);
    }
}

function initVis(data) {
    // Update shared dimensions first
    sharedDimensions.updateDimensions();
    console.log("Shared dimensions:", sharedDimensions);

    // Initialize all visualizations
    console.log("Initializing visualizations with containers:", containers);
    visualizations = {
        climate: new CircleChart(containers.climate, data[1]),
        electricityMap: new ElectricityMap(containers.electricityMap, data[3], data[4]),
        electricityTimeline: new ElectricityTimeline(containers.electricityTimeline, data[3]),
        incidents: new AreaChart(containers.incidents, data[0]),
        sectors: new TreeMap(containers.sectors, data[0]),
        progress: new LineChart(containers.progress, data[2]),
        brush: new BrushChart(containers.brush, data[0])
    };

    // Verify initialization
    Object.entries(visualizations).forEach(([key, vis]) => {
        console.log(`${key} visualization initialized:`, !!vis);
    });

    // Log visualization instances
    console.log("Initialized visualizations:", visualizations);

    // Initial resize for all visualizations
    resizeAllVisualizations();
    
    // Show initial visualization
    showVis('climate', 'climate-1');
}

function resizeAllVisualizations() {
    if (!visualizations) return;
    
    // Update shared dimensions first
    sharedDimensions.updateDimensions();
    
    // Resize all visualizations
    Object.values(visualizations).forEach(vis => {
        if (vis && typeof vis.resize === 'function') {
            vis.resize();
        }
    });
}

function updateVisualization(step) {
    const section = step.split('-')[0];
    
    // Update relevant visualizations
    const visKeys = visualizationsToUpdate[section] || [];
    visKeys.forEach(key => {
        if (visualizations[key]?.wrangleData) {
            visualizations[key].wrangleData();
        }
    });
}

function showVis(section, step) {
    console.log("Showing visualization for section and step:", section, step);

    // Skip visibility changes for intro section
    if (section === 'intro') return;

    // Hide all visualization containers first
    document.querySelectorAll('.vis-container').forEach(container => {
        container.style.visibility = 'hidden';
        container.style.display = 'none';
    });

    // Show the container for current section
    const currentContainer = document.getElementById(`${section}-vis`);
    if (currentContainer) {
        currentContainer.style.visibility = 'visible';
        currentContainer.style.display = 'block';
    }

    // Handle specific section visualizations
    if (section === 'climate') {
        // Get all climate visualization elements
        const climateControls = document.querySelector('.climate-controls');
        const circleVis = document.getElementById('pretraining-carbon-intensity');
        const mapVis = document.getElementById('electricity-data-center');
        const timelineVis = document.getElementById('electricity-timeline');

        // First hide all climate visualizations
        [circleVis, mapVis, timelineVis].forEach(vis => {
            if (vis) {
                vis.style.visibility = 'hidden';
                vis.style.display = 'none';
            }
        });
        if (climateControls) climateControls.style.display = 'none';

        // Show appropriate visualization based on step
        switch(step) {
            case 'climate-1':
                if (circleVis) {
                    circleVis.style.visibility = 'visible';
                    circleVis.style.display = 'block';
                }
                if (climateControls) climateControls.style.display = 'block';
                if (visualizations.climate) {
                    visualizations.climate.resize();
                    visualizations.climate.wrangleData();
                }
                break;
            case 'climate-2':
                if (mapVis) {
                    mapVis.style.visibility = 'visible';
                    mapVis.style.display = 'block';
                }
                if (visualizations.electricityMap) {
                    visualizations.electricityMap.resize();
                    visualizations.electricityMap.wrangleData();
                }
                break;
            case 'climate-3':
                if (timelineVis) {
                    timelineVis.style.visibility = 'visible';
                    timelineVis.style.display = 'block';
                }
                if (visualizations.electricityTimeline) {
                    visualizations.electricityTimeline.resize();
                    visualizations.electricityTimeline.wrangleData();
                }
                break;
        }
    } else if (section === 'incidents') {
        const incidentsVis = document.getElementById('incidents-over-time');
        const sectorsVis = document.getElementById('ai-incidents-by-sector');
        const brushVis = document.getElementById('date-brush');

        // Hide all incidents visualizations first
        [incidentsVis, sectorsVis, brushVis].forEach(vis => {
            if (vis) {
                vis.style.visibility = 'hidden';
                vis.style.display = 'none';
            }
        });

        if (step === 'incidents-1' || step === 'incidents-2') {
            if (incidentsVis) {
                incidentsVis.style.visibility = 'visible';
                incidentsVis.style.display = 'block';
            }
            if (brushVis) {
                brushVis.style.visibility = 'visible';
                brushVis.style.display = 'block';
            }
            if (visualizations.incidents) {
                visualizations.incidents.resize();
                visualizations.incidents.wrangleData();
            }
            if (visualizations.brush) {
                visualizations.brush.resize();
                visualizations.brush.wrangleData();
            }
        } else if (step === 'incidents-3') {
            if (sectorsVis) {
                sectorsVis.style.visibility = 'visible';
                sectorsVis.style.display = 'block';
            }
            if (visualizations.sectors) {
                visualizations.sectors.resize();
                visualizations.sectors.wrangleData();
            }
        }
    } else if (section === 'progress') {
        const progressVis = document.getElementById('swe-bench-progress');
        if (progressVis) {
            progressVis.style.visibility = 'visible';
            progressVis.style.display = 'block';
        }
        if (visualizations.progress) {
            visualizations.progress.resize();
            visualizations.progress.wrangleData();
        }
    }

    // Force a resize event to ensure visualizations render properly
    window.dispatchEvent(new Event('resize'));
}

// Initialize scrollama
function initScrollytelling() {
    // Instantiate the scrollama
    const scroller = scrollama();

    // Setup the instance, pass callback functions
    scroller
        .setup({
            step: '.step',
            offset: 0.5,
            debug: false
        })
        .onStepEnter(response => {
            // Get current section and step
            const step = response.element.dataset.step;
            const section = response.element.closest('section').id;
            
            console.log(`Entering step: ${step}, section: ${section}`);
            
            // Show appropriate visualization
            showVis(section, step);
        });

    // Setup resize event
    window.addEventListener('resize', scroller.resize);
}

// Wait for data to load, then initialize everything
Promise.all(promises)
    .then(function(data) {
        console.log("Data loaded successfully");
        initVisualizations(data);
        initScrollytelling();
    })
    .catch(function(err) {
        console.error("Error loading data:", err);
    });