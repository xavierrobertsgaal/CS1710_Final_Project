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
    // Prevent multiple calls for the same section/step
    if (showVis.lastSection === section && showVis.lastStep === step) {
        return;
    }
    showVis.lastSection = section;
    showVis.lastStep = step;

    // Skip visibility changes for intro section
    if (section === 'intro') return;

    // Hide all visualization containers first
    document.querySelectorAll('.vis-container').forEach(container => {
        container.style.visibility = 'hidden';
        container.style.opacity = '0';
        container.style.display = 'none';
    });

    // Show the container for current section
    const currentContainer = document.getElementById(`${section}-vis`);
    if (currentContainer) {
        currentContainer.style.display = 'block';
        // Use setTimeout to ensure display takes effect before changing visibility
        setTimeout(() => {
            currentContainer.style.visibility = 'visible';
            currentContainer.style.opacity = '1';
        }, 0);
    }

    // Handle specific section visualizations
    if (section === 'climate') {
        const elements = {
            controls: document.querySelector('.climate-controls'),
            circle: document.getElementById('pretraining-carbon-intensity'),
            map: document.getElementById('electricity-data-center'),
            timeline: document.getElementById('electricity-timeline')
        };

        // Hide all climate elements
        Object.values(elements).forEach(el => {
            if (el) {
                el.style.visibility = 'hidden';
                el.style.opacity = '0';
                el.style.display = 'none';
            }
        });

        // Show elements based on step
        const showElements = {
            'climate-1': ['controls', 'circle'],
            'climate-2': ['map'],
            'climate-3': ['timeline']
        };

        showElements[step]?.forEach(elementKey => {
            const element = elements[elementKey];
            if (element) {
                element.style.display = 'block';
                setTimeout(() => {
                    element.style.visibility = 'visible';
                    element.style.opacity = '1';
                }, 0);
            }
        });

        // Trigger resize for active visualization
        const visMap = {
            'climate-1': 'climate',
            'climate-2': 'electricityMap',
            'climate-3': 'electricityTimeline'
        };
        if (visualizations[visMap[step]]) {
            visualizations[visMap[step]].resize();
        }
    }

    // Similar pattern for incidents section
    if (section === 'incidents' || section === 'incidents-2') {
        const elements = {
            incidents: document.getElementById('incidents-over-time'),
            sectors: document.getElementById('ai-incidents-by-sector'),
            brush: document.getElementById('date-brush')
        };

        // Hide all elements first
        Object.values(elements).forEach(el => {
            if (el) {
                el.style.visibility = 'hidden';
                el.style.opacity = '0';
                el.style.display = 'none';
            }
        });

        // Show elements based on step
        const showElements = {
            'incidents-1': ['incidents', 'brush'],
            'incidents-2': ['incidents', 'brush'],
            'incidents-3': ['sectors', 'brush']
        };

        showElements[step]?.forEach(elementKey => {
            const element = elements[elementKey];
            if (element) {
                element.style.display = 'block';
                setTimeout(() => {
                    element.style.visibility = 'visible';
                    element.style.opacity = '1';
                }, 0);
            }
        });

        // Resize and update active visualizations
        ['incidents', 'sectors', 'brush'].forEach(visKey => {
            if (elements[visKey]?.style.visibility === 'visible' && visualizations[visKey]) {
                visualizations[visKey].resize();
                visualizations[visKey].wrangleData();
            }
        });
    }

    // Handle progress section
    if (section === 'progress') {
        const progressVis = document.getElementById('swe-bench-progress');
        if (progressVis) {
            progressVis.style.display = 'block';
            setTimeout(() => {
                progressVis.style.visibility = 'visible';
                progressVis.style.opacity = '1';
            }, 0);
        }
        if (visualizations.progress) {
            visualizations.progress.resize();
            visualizations.progress.wrangleData();
            visualizations.progress.triggerAnimation();
        }
    }

    // Force a resize event
    window.dispatchEvent(new Event('resize'));
}

// Initialize scrollama
function initScrollytelling() {
    // Instantiate the scrollama
    const scroller = scrollama();
    const graphic = document.querySelector('.sticky-graphic');

    // Setup the instance, pass callback functions
    scroller
        .setup({
            step: '.step',
            offset: 0.5,
            progress: true,  // Enable progress tracking
            debug: false
        })
        .onStepProgress(response => {
            // Only handle positioning for non-intro sections
            if (response.element.closest('section').id !== 'intro') {
                // Calculate position based on progress
                // Start at top (0) and move to 50vh based on progress
                const progress = Math.min(1, response.progress * 2); // Double speed for first half
                const targetPosition = progress * 50;
                graphic.style.transform = `translateY(calc(-${targetPosition}% + ${targetPosition}vh))`;
            }
        })
        .onStepEnter(response => {
            // Get current section and step
            const step = response.element.dataset.step;
            const section = response.element.closest('section').id;
            
            // Show appropriate visualization
            showVis(section, step);
        })
        .onStepExit(response => {
            // Reset position when exiting to intro
            if (response.direction === 'up' && response.index === 0) {
                graphic.style.transform = 'translateY(0)';
            }
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
