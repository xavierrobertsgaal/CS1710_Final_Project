let visualizations = {};
let pageNavigation;

// Load data using d3 promises
let promises = [
    d3.csv("data/AIID_incidents_enhanced.csv"),
    d3.csv("data/Internet_Activities.csv"),
];

document.addEventListener('DOMContentLoaded', () => {
    // Load data after DOM is ready
    Promise.all(promises)
        .then(function(data) {
            // Store data
            visualizations.data = data;
            
            // Initialize navigation
            pageNavigation = new PageNavigation();
            
            // Set up visualization handlers
            pageNavigation.onThreadChange = (threadId) => {
                if (!visualizations[threadId]) {
                    switch(threadId) {
                        case 'climate':
                            visualizations[threadId] = new CircleChart('pretraining-carbon-intensity', visualizations.data[1]);
                            break;
                        case 'cyber':
                            visualizations[threadId] = new AreaChart('cyber-incidents-caught', visualizations.data[0]);
                            break;
                        case 'auto':
                            visualizations[threadId] = new TreeMap('ai-incidents-by-sector', visualizations.data[0]);
                            break;
                    }
                }
            };
        })
        .catch(error => console.error('Error loading data:', error));
});
