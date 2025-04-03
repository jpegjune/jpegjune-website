document.addEventListener('DOMContentLoaded', () => {
    fetch('content.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(content => {
            // --- Global Content ---
            document.querySelectorAll('[data-content-key^="global."]').forEach(el => {
                const key = el.dataset.contentKey.split('.');
                let value = content;
                key.forEach(k => value = value ? value[k] : ''); // Navigate nested keys safely

                if (key.join('.') === 'global.copyrightYear') {
                    el.textContent = `© ${value} ${content.global.brandName}. All rights reserved.`;
                } else if (el.tagName === 'A' && key.includes('social')) {
                    el.href = value;
                } else if (el.classList.contains('brand')) {
                    el.textContent = content.global.brandName;
                    el.href = 'index.html'; // Assuming brand always links home
                } else {
                    el.textContent = value;
                }
            });

            // Set Backgrounds specified in global context (if elements exist)
            const pageBackgroundElements = document.querySelectorAll('.page-background');
            if (pageBackgroundElements.length > 0 && content.global.pageBackgroundUrl) {
               pageBackgroundElements.forEach(el => {
                   el.style.backgroundImage = `url('${content.global.pageBackgroundUrl}')`;
               });
            }
            const homeBackgroundElement = document.getElementById('home');
            if (homeBackgroundElement && content.index.backgroundUrl) {
                homeBackgroundElement.style.backgroundImage = `url('${content.index.backgroundUrl}')`;
            }


            // --- Page Specific Content ---
            const pageKey = document.body.dataset.pageKey; // e.g., "index", "about", "portfolio", "contact"
            if (pageKey && content[pageKey]) {
                // Simple text/attribute replacements
                document.querySelectorAll(`[data-content-key^="${pageKey}."]`).forEach(el => {
                    const key = el.dataset.contentKey.substring(pageKey.length + 1); // Get key relative to page
                    const value = key.split('.').reduce((o, k) => o ? o[k] : '', content[pageKey]); // Navigate nested keys

                    if (el.tagName === 'IMG') {
                        el.src = value;
                        // Alt text could be inferred or added to JSON if needed
                        if (!el.alt) el.alt = `${pageKey} ${key}`;
                    } else {
                         el.textContent = value;
                    }
                });

                // Special Handling for complex structures
                // About Page Bio
                if (pageKey === 'about' && content.about.bio) {
                    const bioContainer = document.getElementById('about-bio');
                    if (bioContainer) {
                        bioContainer.innerHTML = ''; // Clear existing (if any)
                        content.about.bio.forEach((pText, index) => {
                            const p = document.createElement('p');
                            if (index === 0) { // Apply quote styles to the first paragraph based on original structure
                                p.className = "font-cormorant text-xl italic text-white/90 mb-6";
                                p.textContent = `"${content.about.quote}"`; // Use the dedicated quote field
                                bioContainer.appendChild(p);
                                const pActual = document.createElement('p'); // Add the actual first bio paragraph
                                pActual.textContent = pText;
                                bioContainer.appendChild(pActual);
                            } else {
                                p.textContent = pText;
                                bioContainer.appendChild(p);
                            }
                        });
                    }
                }

                // Contact Page Services/Availability
                if (pageKey === 'contact') {
                    const servicesContainer = document.getElementById('contact-services');
                    if (servicesContainer && content.contact.services) {
                        servicesContainer.innerHTML = ''; // Clear
                         content.contact.services.forEach(line => {
                             const p = document.createElement('p');
                             p.className = "text-white font-light";
                             p.textContent = line;
                             servicesContainer.appendChild(p);
                         });
                    }
                     const availabilityContainer = document.getElementById('contact-availability');
                    if (availabilityContainer && content.contact.availability) {
                        availabilityContainer.innerHTML = ''; // Clear
                         content.contact.availability.forEach(line => {
                             const p = document.createElement('p');
                             p.className = "text-white font-light";
                             p.textContent = line;
                             availabilityContainer.appendChild(p);
                         });
                    }
                }

                // Portfolio Page Categories
                if (pageKey === 'portfolio' && content.portfolio.categories) {
                    const portfolioGrid = document.getElementById('portfolio-grid');
                    if (portfolioGrid) {
                        portfolioGrid.innerHTML = ''; // Clear existing cards
                        content.portfolio.categories.forEach(cat => {
                            const cardHtml = `
                                <a href="${cat.linkUrl}" class="portfolio-card block relative overflow-hidden border border-white/20 shadow-lg">
                                    <div class="aspect-[16/9] w-full">
                                        <img src="${cat.imageUrl}" alt="${cat.title} Photography" class="w-full h-full object-cover">
                                    </div>
                                    <div class="card-overlay absolute inset-0 flex items-end justify-center p-8">
                                        <div class="card-title text-center w-full pb-2">
                                            <h3 class="font-italiana text-3xl text-white mb-2">${cat.title}</h3>
                                            <p class="font-light text-gray-200">${cat.description}</p>
                                        </div>
                                    </div>
                                </a>`;
                            portfolioGrid.innerHTML += cardHtml;
                        });
                    }
                }
            }
        })
        .catch(error => {
            console.error('Error fetching or processing content.json:', error);
            // Optionally display an error message to the user on the page
        });
});