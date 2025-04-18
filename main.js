// main.js
async function loadScript(scriptName) {
  try {
    const module = await import(`/scripts/${scriptName}`);
    module.default(); // Execute the default exported function
  } catch (error) {
    console.error(`Error loading script: ${scriptName}`, error);
  }
}

fetch('/scripts-list')
  .then(response => response.json())
  .then(scripts => {
    const selector = document.getElementById('scriptSelector');
    
    // Populate the selector with options
    scripts.forEach(script => {
      const option = document.createElement('option');
      option.value = script;
      option.text = script;
      selector.appendChild(option);
    });

    // Determine which script to load
    let scriptToLoad;
    const urlParams = new URLSearchParams(window.location.search);
    const selectedScript = urlParams.get('script');
    if (selectedScript && scripts.includes(selectedScript)) {
      scriptToLoad = selectedScript;
    } else {
      const lastScript = localStorage.getItem('lastScript');
      scriptToLoad = (lastScript && scripts.includes(lastScript)) ? lastScript : scripts[0];
    }

    if (scriptToLoad) {
      selector.value = scriptToLoad;
      loadScript(scriptToLoad);
      localStorage.setItem('lastScript', scriptToLoad);
    }

    // Handle selector change
    selector.addEventListener('change', (event) => {
      const selectedScript = event.target.value;
      localStorage.setItem('lastScript', selectedScript);
      window.location.search = `?script=${selectedScript}`; // Reload with new script
    });
  })
  .catch(error => console.error('Error fetching script list:', error));