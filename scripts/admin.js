document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('admin-form');
    const saveButton = document.getElementById('save-button');
    const saveStatus = document.getElementById('save-status');
    const portfolioCategoriesContainer = document.getElementById('portfolio-categories-admin');
    const addCategoryBtn = document.getElementById('add-category-btn');
    let currentContent = {}; // Store fetched content

    // --- Load existing content ---
    function loadContent() {
        fetch('content.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(content => {
                currentContent = content; // Store for later use
                populateForm(content);
                populatePortfolioCategories(content.portfolio.categories);
            })
            .catch(error => {
                console.error('Error loading content.json:', error);
                saveStatus.textContent = 'Error loading content. Please check console.';
                saveStatus.style.color = 'red';
            });
    }

    // --- Populate form fields from JSON ---
    function populateForm(content) {
        form.querySelectorAll('input[name], textarea[name]').forEach(input => {
            const keys = input.name.split('.');
            let value = content;
            try {
                keys.forEach(k => value = value[k]);

                if (input.type === 'textarea' && Array.isArray(value)) {
                    input.value = value.join('\n'); // Join array elements with newline for textarea
                } else {
                    input.value = value || ''; // Handle null/undefined
                }
            } catch (e) {
                console.warn(`Could not find value for ${input.name} in content.json`);
                input.value = ''; // Set to empty if path doesn't exist
            }
        });
    }

    // --- Populate portfolio categories admin section ---
    function populatePortfolioCategories(categories) {
        portfolioCategoriesContainer.innerHTML = ''; // Clear existing
        if (!categories || !Array.isArray(categories)) return;

        categories.forEach((category, index) => {
            const div = document.createElement('div');
            div.className = 'border border-gray-600 p-4 mb-4 rounded';
            div.innerHTML = `
                <h4 class="text-lg font-semibold mb-2 text-gray-300">Category ${index + 1}</h4>
                <label class="admin-label">Title:
                    <input type="text" name="portfolio.categories[${index}].title" value="${category.title || ''}" class="admin-input category-input">
                </label>
                <label class="admin-label">Description:
                    <input type="text" name="portfolio.categories[${index}].description" value="${category.description || ''}" class="admin-input category-input">
                </label>
                <label class="admin-label">Image URL:
                    <input type="url" name="portfolio.categories[${index}].imageUrl" value="${category.imageUrl || ''}" class="admin-input category-input">
                </label>
                 <label class="admin-label">Link URL (optional):
                    <input type="url" name="portfolio.categories[${index}].linkUrl" value="${category.linkUrl || '#'}" class="admin-input category-input">
                </label>
                <button type="button" class="remove-category-btn text-sm bg-red-600 hover:bg-red-700 px-3 py-1" data-index="${index}">Remove</button>
            `;
            portfolioCategoriesContainer.appendChild(div);
        });

        // Add event listeners for remove buttons
        document.querySelectorAll('.remove-category-btn').forEach(btn => {
            btn.addEventListener('click', handleRemoveCategory);
        });
    }

    // --- Add new category ---
    addCategoryBtn.addEventListener('click', () => {
        if (!currentContent.portfolio) currentContent.portfolio = {};
        if (!currentContent.portfolio.categories) currentContent.portfolio.categories = [];

        currentContent.portfolio.categories.push({ title: '', description: '', imageUrl: '', linkUrl: '#' });
        populatePortfolioCategories(currentContent.portfolio.categories); // Re-render
    });

    // --- Remove category ---
    function handleRemoveCategory(event) {
        const indexToRemove = parseInt(event.target.dataset.index, 10);
        if (!isNaN(indexToRemove) && currentContent.portfolio && currentContent.portfolio.categories) {
            currentContent.portfolio.categories.splice(indexToRemove, 1);
            populatePortfolioCategories(currentContent.portfolio.categories); // Re-render
        }
    }

    // --- Handle Form Submission (Placeholder) ---
    form.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevent default form submission
        saveStatus.textContent = 'Saving is disabled in local file view. Deploy first and configure saving mechanism (e.g., Decap CMS).';
        saveStatus.style.color = 'orange';

        // --- NOTE: Actual saving logic will go here after deployment ---
        // This would involve:
        // 1. Collecting data from the form (including dynamically added portfolio items).
        // 2. Formatting it back into the JSON structure.
        // 3. Using an API (like GitHub's API via Decap/Netlify functions) to update content.json in the repo.

        // Example of how you might gather the data (won't work for saving locally):
        const formData = new FormData(form);
        const updatedContent = JSON.parse(JSON.stringify(currentContent)); // Deep clone

        formData.forEach((value, key) => {
            const keys = key.split('.');
            let target = updatedContent;

            // Handle nested properties and arrays (basic example)
            // This needs refinement for portfolio categories array structure
            if (key.includes('portfolio.categories')) {
                 // More complex logic needed here to reconstruct the categories array correctly
                 // based on the input names like 'portfolio.categories[0].title'
                 console.log(`Skipping portfolio category field for now: ${key}`);

            } else {
                 for (let i = 0; i < keys.length - 1; i++) {
                     if (!target[keys[i]]) {
                        target[keys[i]] = {}; // Create object if it doesn't exist
                     }
                     target = target[keys[i]];
                 }
                 // Handle textareas that represent arrays
                 if ( (key === 'about.bio' || key === 'contact.services' || key === 'contact.availability') && typeof value === 'string') {
                     target[keys[keys.length - 1]] = value.split('\n').filter(line => line.trim() !== ''); // Split by newline, remove empty lines
                 } else {
                     target[keys[keys.length - 1]] = value;
                 }
            }

        });

        // Reconstruct portfolio categories more carefully
        const categoryElements = portfolioCategoriesContainer.querySelectorAll('.border.p-4');
        const newCategories = [];
        categoryElements.forEach(catDiv => {
            const category = {};
            catDiv.querySelectorAll('input.category-input').forEach(input => {
                const keys = input.name.split('.'); // e.g., ['portfolio', 'categories', '0', 'title']
                const fieldName = keys[keys.length - 1]; // e.g., 'title'
                category[fieldName] = input.value;
            });
            if (category.title || category.imageUrl) { // Only add if it has some content
                 newCategories.push(category);
            }
        });
        updatedContent.portfolio.categories = newCategories;


        console.log("Updated Content Object (for saving):", updatedContent);
        // In a real scenario, you'd send 'updatedContent' to your save endpoint/API.
    });

    // --- Initial Load ---
    loadContent();
});