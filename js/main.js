// Overall storyboard file for the project
let pageNavigation = new PageNavigation();

// Load data using d3 promises
let promises = [
    // Carbon intensity data
    // Cybersecurity data
    d3.csv("data/AIID_incidents_enhanced.csv"),
    d3.csv("data/Internet_Activities.csv"),
];

// Load data after DOM is ready
Promise.all(promises)
    .then(function(data) {
        console.log(data);
        createVisualizations(data);
    })
    .catch(error => console.error('Error loading data:', error));

function createVisualizations(data) {
    const treemap = new TreeMap({
        parentElement: '#ai-incidents-by-sector',
        data: data[0]
    });
    const deploymentCarbonIntensity = new CircleChart('pretraining-carbon-intensity', data[1]);
    const cyberIncidentsCaught = new AreaChart('cyber-incidents-caught', data[0]);
}
