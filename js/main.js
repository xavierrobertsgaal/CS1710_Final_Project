// Overall storyboard file for the project

// Load data using d3 promises
let promises = [
    // Carbon intensity data
    // Cybersecurity data
    d3.csv("data/AIID_incidents_enhanced.csv"),
    d3.csv("data/Internet_Activities.csv"),
];

Promise.all(promises).then((data) => {
    console.log(data);
    createVisualizations(data);
});

function createVisualizations(data) {
    // Create visualizations
    // const pretrainingCarbonIntensity = new BubbleChart('#pretraining-carbon-intensity', data[0]);
    const deploymentCarbonIntensity = new CircleChart('pretraining-carbon-intensity', data[1]);
    // const cyberIncidentsCaught = new ScatterChart('#cyber-incidents-caught', data[2]);
    // const costOfCyberSecurity = new BarChart('#cost-of-cyber-security', data[3]);
    // const aiProgressEvals = new LineChart('#ai-progress-evals', data[4]);
    // const aiIncidentsBySector = new TreeMap('#ai-incidents-by-sector', data[5]);
}
