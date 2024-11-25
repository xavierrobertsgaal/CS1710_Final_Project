let visualizations = {};

// Load data using d3 promises
let promises = [
    d3.csv("data/AIID_incidents_enhanced.csv"),
    d3.csv("data/Internet_Activities.csv"),
    d3.csv("data/swebench_verified_cleaned_2024_11_18.csv")

];

// Add at the top with other global variables
let sharedDimensions = {
    width: 0,
    height: 0,
    updateDimensions: function() {
        // Get dimensions from the sticky-graphic container
        const container = document.querySelector('.sticky-graphic');
        if (container) {
            // Account for padding
            const rect = container.getBoundingClientRect();
            this.width = rect.width - 40; // Subtract padding
            this.height = Math.min(600, rect.height - 100); // Max height of 600px, account for controls
        }
    }
};

function initVisualizations(data) {
    console.log("Initializing visualizations with data:", data);
    
    // Ensure containers exist before creating visualizations
    const containers = {
        climate: document.getElementById('pretraining-carbon-intensity'),
        incidents: document.getElementById('incidents-over-time'),
        sectors: document.getElementById('ai-incidents-by-sector'),
        progress: document.getElementById('swe-bench-progress'),
        brush: document.getElementById('date-brush')
    };

    // Check if containers exist
    for (let key in containers) {
        if (!containers[key]) {
            console.error(`Container for ${key} visualization not found`);
            return;
        }
    }

    // Initialize visualization objects
    visualizations = {
        climate: new CircleChart('pretraining-carbon-intensity', data[1]),
        incidents: new AreaChart('incidents-over-time', data[0]),
        sectors: new TreeMap('ai-incidents-by-sector', data[0]),
        progress: new LineChart('swe-bench-progress', data[2]),
        brush: new BrushChart('date-brush', data[0])
    };

    // Update dimensions for all visualizations
    Object.values(visualizations).forEach(vis => {
        if (vis && typeof vis.resize === 'function') {
            vis.resize();
        }
    });

    console.log("Visualizations initialized:", visualizations);
}

function updateVisualization(step) {
    const section = step.split('-')[0];
    if (visualizations[section]) {
        visualizations[section].wrangleData();
    }
}

// Initialize scrollama after data is loaded
function initScrollama() {
    const scroller = scrollama();

    // Add debug class to body if needed
    // document.body.classList.add('debug');

    scroller
        .setup({
            step: '.step',
            offset: 0.5,
            debug: false,
            progress: true
        })
        .onStepEnter(response => {
            response.element.classList.add('is-active');
            
            const step = response.element.dataset.step;
            const section = step.split('-')[0];
            
            console.log('Step entered:', step);
            
            // Pass both section and step to showVis
            showVis(section, step);
            
            // Update the visualization based on the step
            updateVisualization(step);
        })
        .onStepExit(response => {
            // Remove 'is-active' class from the exited step
            response.element.classList.remove('is-active');
        });

    // Setup resize event
    window.addEventListener('resize', scroller.resize);

    // Trigger a resize to ensure proper positioning
    scroller.resize();
}

document.addEventListener('DOMContentLoaded', () => {
    // First update dimensions
    sharedDimensions.updateDimensions();
    
    // Load data after DOM is ready
    Promise.all(promises)
        .then(function(data) {
            // Initialize visualizations
            initVisualizations(data);
            // Initialize scrollama
            initScrollama();
        })
        .catch(error => console.error('Error loading data:', error));
});

// Add resize handler
window.addEventListener('resize', () => {
    sharedDimensions.updateDimensions();
    if (visualizations) {
        Object.values(visualizations).forEach(vis => {
            if (vis && typeof vis.resize === 'function') {
                vis.resize();
            }
        });
    }
});

function showVis(section, step) {
    console.log("Showing visualization for section and step:", section, step);
    
    // Hide all visualizations and their controls first
    const visContainers = document.querySelectorAll('.vis-container');
    visContainers.forEach(container => {
        container.style.display = 'none';
        container.style.opacity = '0';
    });
    
    // Hide climate controls if they exist
    const climateControls = document.querySelector('.climate-controls');
    if (climateControls) {
        climateControls.style.display = 'none';
    }

    // Don't try to show any visualization for the intro section
    if (section === 'intro') return;

    // Show the relevant visualization with a fade effect
    const visContainer = document.getElementById(`${section}-vis`);
    if (visContainer) {
        visContainer.style.display = 'block';
        
        // Special handling for incidents section
        if (section === 'incidents') {
            const areaChart = document.getElementById('incidents-over-time');
            const treeMap = document.getElementById('ai-incidents-by-sector');
            const brushChart = document.getElementById('date-brush');
            
            // Always show brush chart
            if (brushChart) {
                brushChart.style.display = 'block';
                brushChart.style.opacity = '1';
            }
            
            // Show appropriate visualization based on step
            if (step === 'incidents-1') {
                if (areaChart) {
                    areaChart.style.display = 'block';
                    areaChart.style.opacity = '1';
                }
                if (treeMap) {
                    treeMap.style.display = 'none';
                    treeMap.style.opacity = '0';
                }
            } else {
                if (areaChart) {
                    areaChart.style.display = 'none';
                    areaChart.style.opacity = '0';
                }
                if (treeMap) {
                    treeMap.style.display = 'block';
                    treeMap.style.opacity = '1';
                }
            }
            
            // Ensure brush is properly sized and positioned
            if (visualizations.brush && typeof visualizations.brush.resize === 'function') {
                visualizations.brush.resize();
            }
        }

        // Update dimensions when container becomes visible
        sharedDimensions.updateDimensions();
        
        // Update visualization size if it has a resize method
        if (visualizations[section] && typeof visualizations[section].resize === 'function') {
            visualizations[section].resize();
        }
        
        // Fade in
        setTimeout(() => {
            visContainer.style.opacity = '1';
        }, 50);
        
        // Show climate controls if needed
        if (section === 'climate' && climateControls) {
            climateControls.style.display = 'block';
            const moveToBottomBtn = document.getElementById('moveToBottom');
            if (moveToBottomBtn) {
                moveToBottomBtn.style.display = 'block';
            }
        }
    }
}