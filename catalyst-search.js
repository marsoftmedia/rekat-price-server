document.addEventListener('DOMContentLoaded', () => {
    // --- Catalyst Search Logic --- //
    const searchModal = document.getElementById('catalyst-search-modal');
    const openSearchBtns = document.querySelectorAll('#open-catalog-btn'); // Matches the updated ID
    const closeSearchBtn = document.querySelector('.catalyst-close');
    const searchInput = document.getElementById('cat-code-input');
    const searchBtn = document.getElementById('run-search-btn');
    const initialView = document.getElementById('search-initial');
    const loaderView = document.getElementById('search-loader');
    const resultView = document.getElementById('search-result');
    const resultText = document.getElementById('result-code-display');
    const contactBtn = document.getElementById('contact-for-price');
    const codeHelperBtn = document.querySelector('.code-helper');

    // Open Modal
    openSearchBtns.forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();

            // If the old logic was calling window.open, we override it here if we want the modal
            // But since I changed the onclick in HTML to 'openCatalogWindow()', I should probably
            // hook into that function OR remove the onclick attribute and rely on this event listener.
            // Let's rely on event listener for cleaner separation, but I need to remove the inline onclick first.

            resetSearch();
            searchModal.classList.add('active');
            document.body.style.overflow = 'hidden';

            // On mobile, scroll to input so it's not hidden by keyboard
            setTimeout(() => {
                searchInput.focus();
                if (window.innerWidth < 600) {
                    searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 300);
        };
    });

    // Close Modal
    if (closeSearchBtn) {
        closeSearchBtn.onclick = () => {
            searchModal.classList.remove('active');
            document.body.style.overflow = 'auto';
        };
    }

    // Close on click outside
    window.onclick = (e) => {
        if (e.target == searchModal) {
            searchModal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    };

    // Run Search
    if (searchBtn) {
        searchBtn.onclick = async () => {
            const code = searchInput.value.trim();
            if (code.length < 2) {
                alert('Prosím zadajte aspoň 2 znaky z kódu.');
                return;
            }

            // Show Loader
            initialView.style.display = 'none';
            loaderView.style.display = 'flex';

            try {
                // Determine timeout (e.g. 60 seconds for cold starts on free tier)
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 60000);

                // Call production proxy server (Vercel)
                const response = await fetch(`https://rekat-price-server.vercel.app/api/price?code=${encodeURIComponent(code)}`, {
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`Server returned ${response.status} ${response.statusText}`);
                }

                const data = await response.json();

                loaderView.style.display = 'none';
                resultView.style.display = 'block';

                if (data.success && data.products && data.products.length > 0) {
                    let html = `<div style="text-align: center; margin-bottom: 15px;">
                        <span style="font-size: 1.2em; font-weight: bold; color: #fff;">${code.toUpperCase()}</span>
                        <div style="font-size: 0.9em; color: #4ade80; margin-top: 5px;">Nájdených ${data.products.length} výsledkov</div>
                    </div>
                    <div class="results-container" style="max-height: 300px; overflow-y: auto; text-align: left;">`;

                    data.products.forEach(prod => {
                        let priceInfoHtml = '';
                        // If we have a valid price (greater than 0)
                        if (prod.price_eur > 0) {
                            priceInfoHtml = `<span style="font-size: 1.4em; font-weight: bold; color: #4ade80;">${prod.display_price}</span>`;
                        } else {
                            // If price is hidden/login to view, show WhatsApp button
                            let msg = `Dobrý deň, mám záujem o presnú cenu pre katalyzátor: ${prod.title}`;
                            priceInfoHtml = `<a href="https://wa.me/+421905763755?text=${encodeURIComponent(msg)}" target="_blank" style="display: inline-block; background-color: #25D366; color: white; padding: 8px 15px; border-radius: 6px; font-size: 0.9em; text-decoration: none; font-weight: 600; text-align: center; width: 100%;"><i class="fa-brands fa-whatsapp"></i> Zistiť cenu cez WhatsApp</a>`;
                        }

                        html += `
                        <div class="result-card" style="background: rgba(40, 40, 40, 0.6); border-radius: 12px; padding: 15px; margin-bottom: 20px; border: 1px solid rgba(181, 156, 110, 0.2); box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                            <div style="font-weight: 700; color: #e0e0e0; margin-bottom: 12px; font-size: 1.1rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">${prod.title}</div>
                            
                            <div style="display: flex; flex-direction: column; gap: 15px;">
                                ${prod.image ? `<div style="text-align: center; background: rgba(0,0,0,0.2); border-radius: 8px; padding: 10px;"><img src="${prod.image}" style="max-width: 100%; max-height: 200px; border-radius: 4px; object-fit: contain;" alt="Katalyzátor"></div>` : ''}
                                
                                <div style="display: flex; flex-direction: column; gap: 8px;">
                                    ${prod.brands ? `<div style="color: #bbb; font-size: 0.9em;"><strong style="color: #b59c6e;">Auto:</strong> ${prod.brands} ${prod.models ? '/ ' + prod.models : ''}</div>` : ''}
                                    
                                    <div style="margin-top: 5px;">
                                        <span style="color: #aaa; font-size: 0.9em; text-transform: uppercase; letter-spacing: 1px;">Orientačná cena:</span>
                                        <div style="margin-top: 3px;">${priceInfoHtml}</div>
                                    </div>
                                </div>
                            </div>
                        </div>`;
                    });

                    html += `</div>`;
                    resultText.innerHTML = html;

                } else {
                    resultText.innerHTML = `${code.toUpperCase()} <br><span style="font-size: 0.6em; color: #ff6b6b;">Cena nebola nájdená automaticky.</span>`;
                }

                // Set up the WhatsApp button
                const whatsappBtn = document.getElementById('modal-whatsapp-btn');
                if (whatsappBtn) {
                    const msg = `Dobrý deň, mám záujem o cenu pre katalyzátor s kódom: ${code}`;
                    whatsappBtn.onclick = (e) => {
                        e.preventDefault();
                        window.open(`https://wa.me/+421905763755?text=${encodeURIComponent(msg)}`, '_blank');
                    };
                }

            } catch (error) {
                console.error("Search error:", error);

                loaderView.style.display = 'none';
                resultView.style.display = 'block';
                resultText.innerHTML = `${code.toUpperCase()} <br><span style="font-size: 0.6em; color: #ff6b6b;">Chyba pripojenia k serveru. (Beží server?)</span>`;

                // Fallback to WA even on error
                const whatsappBtn = document.getElementById('modal-whatsapp-btn');
                if (whatsappBtn) {
                    const msg = `Dobrý deň, mám záujem o cenu pre katalyzátor s kódom: ${code}`;
                    whatsappBtn.onclick = (e) => {
                        e.preventDefault();
                        window.open(`https://wa.me/+421905763755?text=${encodeURIComponent(msg)}`, '_blank');
                    };
                }
            }
        };
    }

    // Reset function
    function resetSearch() {
        searchInput.value = '';
        initialView.style.display = 'block';
        loaderView.style.display = 'none';
        resultView.style.display = 'none';
    }

    // Handle Enter Key
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchBtn.click();
            }
        });
    }

    // Toggle Helper
    if (codeHelperBtn) {
        codeHelperBtn.onclick = () => {
            // Check if helper already exists
            let helperBox = document.getElementById('code-location-helper');

            if (!helperBox) {
                // Create helper box dynamically
                helperBox = document.createElement('div');
                helperBox.id = 'code-location-helper';
                helperBox.className = 'code-location-helper';
                helperBox.innerHTML = `
                    <div class="helper-content">
                        <h4><i class="fa-solid fa-search"></i> Kde nájsť kód?</h4>
                        <p>Kód je vyrazený priamo na kovovom tele katalyzátora. Hľadajte kombináciu písmen a čísel.</p>
                        <ul style="text-align: left; margin: 10px 0; padding-left: 20px; color: #ccc; font-size: 0.9rem;">
                            <li>Očistite hrdzavé miesta drôtenou kefou</li>
                            <li>Hľadajte na plochých častiach obalu</li>
                            <li>Príklad: 1J0 178 EB, 4B0 131 701, atď.</li>
                        </ul>
                        <button id="close-helper-btn" class="close-helper-btn">Rozumiem</button>
                    </div>
                `;
                document.querySelector('#search-initial').appendChild(helperBox);

                // Add close functionality
                document.getElementById('close-helper-btn').onclick = () => {
                    helperBox.style.display = 'none';
                };
            } else {
                // Toggle display
                if (helperBox.style.display === 'none') {
                    helperBox.style.display = 'block';
                } else {
                    helperBox.style.display = 'none';
                }
            }
        };
    }
});
