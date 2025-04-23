// Track loading progress
let totalResources = 0;
let loadedResources = 0;

async function fetchAndUpdateProgress(resource) {
    totalResources++;
    
    const response = await fetch(resource);
    if (!response.ok) {
        loadedResources++;
        updateProgress();
        throw new Error(`Failed to load ${resource}`);
    }
    
    const reader = response.body.getReader();
    const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
    let receivedLength = 0;
    
    const chunks = [];
    
    while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
            loadedResources++;
            updateProgress();
            break;
        }
        
        chunks.push(value);
        receivedLength += value.length;
        
        if (contentLength > 0) {
            const fileProgress = receivedLength / contentLength;
            updateProgress();
        }
    }
    
    // Combine all chunks into a single Uint8Array
    const chunksAll = new Uint8Array(receivedLength);
    let position = 0;
    for (const chunk of chunks) {
        chunksAll.set(chunk, position);
        position += chunk.length;
    }
    
    return new Response(chunksAll, {
        headers: response.headers,
        status: response.status,
        statusText: response.statusText
    });
}

function updateProgress() {
    const progressBar = document.getElementById('blazor-loading-progress');
    const percentText = document.getElementById('blazor-loading-percentage');
    
    if (progressBar && percentText && totalResources > 0) {
        const percent = Math.min(Math.round((loadedResources / totalResources) * 100), 100);
        
        progressBar.style.width = percent + '%';
        percentText.innerText = percent + '%';
        
        // Hide loading screen when completed
        if (percent >= 100) {
            setTimeout(() => {
                const loadingContainer = document.querySelector('.loading-container');
                if (loadingContainer) {
                    loadingContainer.style.opacity = '0';
                    setTimeout(() => {
                        loadingContainer.style.display = 'none';
                    }, 500);
                }
            }, 500);
        }
    }
}

// Ensure Blazor script is loaded before starting
document.addEventListener('DOMContentLoaded', function() {
    if (window.Blazor) {
        Blazor.start({
            loadBootResource: function (type, name, defaultUri, integrity) {
                if (type === 'dotnetjs') {
                    // Return the default URI for dotnetjs
                    return defaultUri;
                }
                // Track all other resources
                return fetchAndUpdateProgress(defaultUri);
            }
        });
    } else {
        console.error("Blazor script not loaded. Ensure 'blazor.webassembly.js' is included in your HTML.");
    }
});
