document.addEventListener('DOMContentLoaded', () => {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';
    const API_BASE = (isLocal && window.location.port !== '3000') ? 'http://localhost:3000' : '';
    /* ==========================================================================
       0. Dark Mode / Light Mode
       ========================================================================== */
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = themeToggle ? themeToggle.querySelector('i') : null;

    const currentTheme = localStorage.getItem('theme');
    if (currentTheme) {
        document.documentElement.setAttribute('data-theme', currentTheme);
        if (currentTheme === 'dark' && themeIcon) themeIcon.classList.replace('fa-moon', 'fa-sun');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (themeIcon) themeIcon.classList.replace('fa-moon', 'fa-sun');
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            let theme = document.documentElement.getAttribute('data-theme');
            if (theme === 'dark') {
                document.documentElement.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
                themeIcon.classList.replace('fa-sun', 'fa-moon');
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                themeIcon.classList.replace('fa-moon', 'fa-sun');
            }
        });
    }

    /* ==========================================================================
       0.5 Password Visibility Toggle Logic
       ========================================================================== */
    const initPasswordToggles = () => {
        const toggles = document.querySelectorAll('.toggle-password');
        toggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
                const targetId = toggle.getAttribute('data-target');
                const input = document.getElementById(targetId);
                if (!input) return;

                if (input.type === 'password') {
                    input.type = 'text';
                    toggle.classList.replace('fa-eye', 'fa-eye-slash');
                } else {
                    input.type = 'password';
                    toggle.classList.replace('fa-eye-slash', 'fa-eye');
                }
            });
        });
    };
    initPasswordToggles();

    /* ==========================================================================
       1. Navbar & Mobile Menu
       ========================================================================== */
    const navbar = document.getElementById('navbar');
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = document.querySelectorAll('.nav-menu a');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        let current = '';
        const sections = document.querySelectorAll('section');
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            if (window.scrollY >= sectionTop - 100) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href').includes(current)) {
                link.classList.add('active');
            }
        });
    });

    hamburger.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        const icon = hamburger.querySelector('i');
        if (navMenu.classList.contains('active')) {
            icon.classList.replace('fa-bars', 'fa-times');
        } else {
            icon.classList.replace('fa-times', 'fa-bars');
        }
    });

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            hamburger.querySelector('i').classList.replace('fa-times', 'fa-bars');
        });
    });

    /* ==========================================================================
       1.5 Hero Carousel
       ========================================================================== */
    const carouselSlides = document.querySelectorAll('.carousel-slide');
    const carouselIndicators = document.querySelectorAll('.indicator');
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');
    let currentSlide = 0;
    let carouselInterval;

    const goToSlide = (index) => {
        carouselSlides[currentSlide].classList.remove('active');
        carouselIndicators[currentSlide].classList.remove('active');
        currentSlide = (index + carouselSlides.length) % carouselSlides.length;
        carouselSlides[currentSlide].classList.add('active');
        carouselIndicators[currentSlide].classList.add('active');
    };

    const nextSlide = () => goToSlide(currentSlide + 1);
    const prevSlide = () => goToSlide(currentSlide - 1);

    const startCarousel = () => {
        if(carouselInterval) clearInterval(carouselInterval);
        carouselInterval = setInterval(nextSlide, 5000);
    };

    if (carouselSlides.length > 0) {
        if (nextBtn) nextBtn.addEventListener('click', () => { nextSlide(); startCarousel(); });
        if (prevBtn) prevBtn.addEventListener('click', () => { prevSlide(); startCarousel(); });
        carouselIndicators.forEach((ind, idx) => {
            ind.addEventListener('click', () => { goToSlide(idx); startCarousel(); });
        });
        startCarousel();
    }

    /* ==========================================================================
       2. Products Data & Rendering (Nuevo Catálogo)
       ========================================================================== */
    let productData = [];
    
    const fetchProducts = async () => {
        try {
            const res = await fetch(API_BASE + '/api/productos');
            const data = await res.json();
            productData = data.map(p => {
                let parsedFeatures = [p.descripcion];
                if (p.features) {
                    try { 
                        let parsed = JSON.parse(p.features);
                        if (!Array.isArray(parsed)) parsed = [parsed.toString()];
                        parsedFeatures = parsed;
                    }
                    catch(e) { parsedFeatures = p.features.split(',').map(s => s.trim()); }
                }
                return {
                    id: p.id,
                    name: p.nombre,
                    category: p.categoria,
                    price: p.precio_texto || `$${p.precio} MXN`,
                    basePrice: p.precio,
                    badge: p.badge || "",
                    fabric: p.fabric || "N/A",
                    features: parsedFeatures,
                    img: p.imagen.startsWith('/uploads/') ? API_BASE + p.imagen : p.imagen
                };
            });
            renderProducts(productData.filter(p => p.category === 'subliprinting'));
        } catch (error) {
            console.error("Error fetching products", error);
        }
    };

    const productsGrid = document.getElementById('products-grid');
    const noResults = document.getElementById('no-results');

    const renderSkeletons = () => {
        productsGrid.innerHTML = '';
        for (let i = 0; i < 6; i++) {
            productsGrid.innerHTML += `
                <div class="product-card">
                    <div class="product-img skeleton" style="height: 250px;"></div>
                    <div class="product-info">
                        <div class="skeleton" style="height: 20px; width: 60%; margin-bottom: 10px;"></div>
                        <div class="skeleton" style="height: 25px; width: 80%; margin-bottom: 10px;"></div>
                        <div class="skeleton" style="height: 15px; width: 90%; margin-bottom: 5px;"></div>
                        <div class="skeleton" style="height: 15px; width: 85%; margin-bottom: 15px;"></div>
                        <div class="skeleton" style="height: 40px; width: 100%; border-radius: 8px;"></div>
                    </div>
                </div>
            `;
        }
    };

    const renderProducts = (products) => {
        productsGrid.innerHTML = '';

        if (products.length === 0) {
            productsGrid.classList.add('hidden');
            noResults.classList.remove('hidden');
            return;
        }

        productsGrid.classList.remove('hidden');
        noResults.classList.add('hidden');

        products.forEach(product => {
            const el = document.createElement('div');
            el.className = 'product-card fade-in';

            // Build the un-styled list items for features
            const featureList = product.features.map(f => `<li><i class="fas fa-check-circle"></i> ${f}</li>`).join('');

            el.innerHTML = `
                <div class="product-img">
                    ${product.badge ? `<span class="product-badge">${product.badge}</span>` : ''}
                    <img src="${product.img}" alt="${product.name}" loading="lazy" onerror="this.src='https://placehold.co/400x350/e2e8f0/4a5568?text=Sube+Tus+Imágenes'">
                </div>
                <div class="product-info">
                    <div class="fabric-tag"><i class="fas fa-gem"></i> ${product.fabric}</div>
                    <h3 class="product-title">${product.name}</h3>
                    <ul class="product-features">
                        ${featureList}
                    </ul>
                    <div class="product-price">${product.price}</div>
                    <button class="btn-primary" style="width: 100%; border-radius: 8px; justify-content: center; transform: none; box-shadow: none;" onclick="window.addToCart(${product.id})">
                        <i class="fas fa-shopping-cart"></i> Añadir al Carrito
                    </button>
                </div>
            `;
            productsGrid.appendChild(el);
        });
    };

    renderSkeletons();
    fetchProducts();

    /* ==========================================================================
       3. Smart Search & Filters
       ========================================================================== */
    const searchInput = document.getElementById('search-input');
    const suggestionsBox = document.getElementById('search-suggestions');
    const filterBtns = document.querySelectorAll('.tab-btn');

    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();

        filterBtns.forEach(btn => btn.classList.remove('active'));

        if (term.length > 0) {
            const filtered = productData.filter(p =>
                p.name.toLowerCase().includes(term) ||
                p.features.some(f => f.toLowerCase().includes(term)) ||
                p.fabric.toLowerCase().includes(term)
            );

            suggestionsBox.style.display = 'block';
            suggestionsBox.innerHTML = '';

            const suggestItems = filtered.slice(0, 4);
            if (suggestItems.length > 0) {
                suggestItems.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'suggestion-item';
                    const regex = new RegExp(`(${term})`, "gi");
                    const highlightedName = item.name.replace(regex, "<span style='color: var(--primary); font-weight: bold;'>$1</span>");
                    div.innerHTML = `<i class="fas fa-search" style="color: var(--border); font-size:0.8rem; margin-right: 10px;"></i> ${highlightedName} <br><small style="color:var(--text-light); margin-left: 25px;">${item.fabric}</small>`;
                    div.addEventListener('click', () => {
                        searchInput.value = item.name;
                        suggestionsBox.style.display = 'none';
                        renderProducts([item]);
                    });
                    suggestionsBox.appendChild(div);
                });
            } else {
                suggestionsBox.style.display = 'none';
            }

            renderProducts(filtered);
        } else {
            suggestionsBox.style.display = 'none';
            document.querySelector('[data-filter="subliprinting"]').classList.add('active');
            renderProducts(productData.filter(p => p.category === 'subliprinting'));
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            suggestionsBox.style.display = 'none';
        }
    });

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            searchInput.value = '';
            suggestionsBox.style.display = 'none';

            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filterVal = btn.getAttribute('data-filter');

            productsGrid.style.opacity = 0;
            setTimeout(() => {
                const filtered = productData.filter(p => p.category === filterVal);
                renderProducts(filtered);
                productsGrid.style.opacity = 1;
            }, 300);
        });
    });

    /* ==========================================================================
       4. Direct WhatsApp Order -> Changed to In-Page Cart
       ========================================================================== */
    let cart = [];
    const cartIcon = document.getElementById('cart-icon-btn');
    const cartCount = document.getElementById('cart-count');
    const cartDrawer = document.getElementById('cart-drawer');
    const closeCart = document.getElementById('close-cart');
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalAmount = document.getElementById('cart-total-amount');
    const checkoutBtn = document.getElementById('checkout-btn');
    const checkoutModal = document.getElementById('checkout-modal');
    const closeCheckoutModal = document.getElementById('close-checkout-modal');
    const checkoutFormWrapper = document.getElementById('checkout-form-wrapper');

    if(cartIcon) cartIcon.addEventListener('click', () => cartDrawer.classList.add('open'));
    if(closeCart) closeCart.addEventListener('click', () => cartDrawer.classList.remove('open'));

    window.addToCart = (id) => {
        const product = productData.find(p => p.id === id);
        if (!product) return;
        
        const existing = cart.find(item => item.id === id);
        if (existing) {
            existing.qty += 1;
        } else {
            cart.push({ ...product, qty: 1 });
        }
        updateCartUI();
        
        if(cartIcon) {
            cartIcon.classList.add('bounce');
            setTimeout(() => cartIcon.classList.remove('bounce'), 300);
        }
        
        cartDrawer.classList.add('open');
    };

    window.removeFromCart = (id) => {
        cart = cart.filter(item => item.id !== id);
        updateCartUI();
    };

    window.updateQty = (id, change) => {
        const item = cart.find(i => i.id === id);
        if(item) {
            item.qty += change;
            if(item.qty <= 0) window.removeFromCart(id);
            else updateCartUI();
        }
    };

    const updateCartUI = () => {
        if (!cartItemsContainer || !cartCount || !cartTotalAmount) return;
        
        cartCount.textContent = cart.reduce((acc, item) => acc + item.qty, 0);
        
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<div class="empty-cart"><i class="fas fa-shopping-cart" style="font-size:3rem; color: #cbd5e1; margin-bottom:1rem;"></i><p>Tu carrito está vacío</p></div>';
            cartTotalAmount.textContent = '$0.00 MXN';
            checkoutBtn.disabled = true;
            return;
        }
        
        checkoutBtn.disabled = false;
        cartItemsContainer.innerHTML = '';
        let total = 0;
        
        cart.forEach(item => {
            total += item.basePrice * item.qty;
            const subtotal = item.basePrice * item.qty;
            
            cartItemsContainer.innerHTML += `
                <div class="cart-item">
                    <img src="${item.img}" alt="${item.name}">
                    <div class="cart-item-info">
                        <h4>${item.name}</h4>
                        <p class="cart-item-price">$${item.basePrice} MXN</p>
                        <div class="qty-controls">
                            <button onclick="updateQty(${item.id}, -1)">-</button>
                            <span>${item.qty}</span>
                            <button onclick="updateQty(${item.id}, 1)">+</button>
                        </div>
                    </div>
                    <div class="cart-item-right">
                        <span class="cart-item-subtotal">$${subtotal}</span>
                        <button class="remove-btn" onclick="removeFromCart(${item.id})"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
        });
        
        cartTotalAmount.textContent = `$${total} MXN`;
    };

    if(checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            cartDrawer.classList.remove('open');
            if(checkoutModal) checkoutModal.classList.add('open');
        });
    }

    if(closeCheckoutModal) checkoutModal.addEventListener('click', (e) => {
        // Prevent closing if clicking on the popup itself, but close if clicking outside or on close button
        if(e.target === checkoutModal || e.target.closest('#close-checkout-modal')) {
            checkoutModal.classList.remove('open');
        }
    });

    const innerCheckoutForm = document.getElementById('inner-checkout-form');
    if(innerCheckoutForm) {
        innerCheckoutForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = document.getElementById('process-order-btn');
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Redirigiendo a WhatsApp...';
            btn.disabled = true;
            
            setTimeout(() => {
                const name = document.getElementById('co-name').value;
                const email = document.getElementById('co-email').value;
                let orderText = `Hola SubliPrinting, soy ${name} (${email}). Quiero realizar el siguiente pedido:\n\n`;
                let total = 0;
                cart.forEach(item => {
                    orderText += `- ${item.qty}x ${item.name} ($${item.basePrice * item.qty} MXN)\n`;
                    total += item.basePrice * item.qty;
                });
                orderText += `\n*Total estimado: $${total} MXN*\n`;
                orderText += `\nPor favor, confírmenme para proceder. ¡Gracias!`;

                const phone = "5219992333539";
                const encodedText = encodeURIComponent(orderText);
                const wpUrl = `https://wa.me/${phone}?text=${encodedText}`;

                // Redirect to WhatsApp
                window.open(wpUrl, '_blank');

                checkoutModal.classList.remove('open');
                cart = [];
                updateCartUI();
                
                btn.innerHTML = '<i class="fas fa-lock"></i> Pagar Ahora';
                btn.disabled = false;
                innerCheckoutForm.reset();
            }, 1000);
        });
    }

    /* ==========================================================================
       Animations on Scroll (Intersection Observer)
       ========================================================================== */
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // observer.unobserve(entry.target); // Optional: if we only want it to run once
            }
        });
    }, observerOptions);

    const animatedElements = document.querySelectorAll('.obs-reveal, .obs-scale');
    animatedElements.forEach(el => observer.observe(el));

    /* ==========================================================================
       6. FAQ Accordions
       ========================================================================== */
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        if(question) {
            question.addEventListener('click', () => {
                const isActive = item.classList.contains('active');
                faqItems.forEach(otherItem => otherItem.classList.remove('active'));
                if (!isActive) item.classList.add('active');
            });
        }
    });

    /* ==========================================================================
       7. Contact form validation
       ========================================================================== */
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = contactForm.querySelector('button');
            const originalText = btn.innerHTML;

            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
            btn.disabled = true;

            setTimeout(() => {
                btn.innerHTML = '<i class="fas fa-check"></i> Mensaje Enviado a Ventas';
                btn.style.backgroundColor = '#2ecc71';
                contactForm.reset();

                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.style.backgroundColor = '';
                    btn.disabled = false;
                }, 3000);
            }, 1500);
        });
    }

    /* ==========================================================================
       8. Login & SPA Dashboard Logic
       ========================================================================== */
    const navLoginBtn = document.getElementById('nav-login-btn');
    const loginModal = document.getElementById('login-modal');
    const closeLoginBtn = document.getElementById('close-login-modal');
    const loginForm = document.getElementById('login-form');
    
    // Elements to toggle
    const landingView = document.getElementById('landing-view');
    const clientDash = document.getElementById('client-dashboard');
    const adminDash = document.getElementById('admin-dashboard');

    if (navLoginBtn) navLoginBtn.addEventListener('click', () => {
        loginModal.classList.add('open');
        // Reset login form and error display when opening modal
        if (loginForm) loginForm.reset();
        const errorMsg = document.getElementById('login-error');
        if (errorMsg) errorMsg.style.display = 'none';
    });
    if (closeLoginBtn) closeLoginBtn.addEventListener('click', () => {
        loginModal.classList.remove('open');
        document.getElementById('login-error').style.display = 'none';
    });

    // Login Tabs Validation Visuals (Opcional, unifica la acción en el formulario)
    const tabCliente = document.getElementById('tab-login-cliente');
    const tabAdmin = document.getElementById('tab-login-admin');
    
    if(tabCliente && tabAdmin) {
        tabCliente.addEventListener('click', () => {
            tabCliente.classList.add('active');
            tabAdmin.classList.remove('active');
        });
        tabAdmin.addEventListener('click', () => {
            tabAdmin.classList.add('active');
            tabCliente.classList.remove('active');
        });
    }

    let authToken = localStorage.getItem('token');
    
    // Global fetch wrapper or just attach headers
    const getHeaders = () => {
        return {
            'Content-Type': 'application/json',
            'x-access-token': authToken || ''
        };
    };
    const getHeadersFormData = () => {
        return {
            'x-access-token': authToken || ''
        };
    };

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value.trim();
            const pass = document.getElementById('login-pass').value;
            const errorMsg = document.getElementById('login-error');
            const submitBtn = document.getElementById('submit-login-btn');
            
            // Clear previous error
            errorMsg.style.display = 'none';
            errorMsg.textContent = '';
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Validando...';

            // Real API Authentication
            try {
                const res = await fetch(API_BASE + '/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password: pass })
                });
                const data = await res.json();
                
                submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar';
                
                if (res.ok && data.user) {
                    authToken = data.token;
                    localStorage.setItem('token', authToken);
                    localStorage.setItem('user', JSON.stringify(data.user));

                    loginModal.classList.remove('open');
                    landingView.classList.add('hidden');
                    
                    const role = data.user.rol;
                    const nombre = data.user.nombre;
                    if (role === 'cliente') {
                        document.getElementById('client-dashboard').classList.remove('hidden');
                        document.getElementById('client-name-display').textContent = nombre;
                        if (typeof fetchClientOrders === 'function') fetchClientOrders();
                    } else if (role === 'administrador' || role === 'superadmin') {
                        document.getElementById('admin-dashboard').classList.remove('hidden');
                        document.getElementById('admin-name-display').textContent = nombre;
                        if (typeof renderAdminTable === 'function') renderAdminTable();
                        if (typeof renderAdminProducts === 'function') renderAdminProducts();
                        if (role === 'superadmin') {
                            const superadminExtras = document.getElementById('superadmin-extras');
                            if (superadminExtras) superadminExtras.classList.remove('hidden');
                            if (typeof renderSuperadminUsers === 'function') renderSuperadminUsers();
                            if (typeof renderSuperadminDisenos === 'function') renderSuperadminDisenos();
                            if (typeof renderSuperadminProduccion === 'function') renderSuperadminProduccion();
                        }
                    } else if (role === 'diseñador') {
                        document.getElementById('diseno-dashboard').classList.remove('hidden');
                        document.getElementById('diseno-name-display').textContent = nombre;
                        if (typeof renderDisenoTable === 'function') renderDisenoTable();
                    } else if (role === 'producción') {
                        document.getElementById('produccion-dashboard').classList.remove('hidden');
                        document.getElementById('produccion-name-display').textContent = nombre;
                        if (typeof renderProduccionTable === 'function') renderProduccionTable();
                    }
                    window.scrollTo(0,0);
                } else {
                    // Show server-provided error or generic message
                    errorMsg.style.display = 'block';
                    errorMsg.textContent = data.error || 'Credenciales inválidas';
                }
            } catch (err) {
                // Network or unexpected error handling
                submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar';
                errorMsg.style.display = 'block';
                errorMsg.textContent = err.message || 'Error de conexión';
            }
        });
    }

    // Login/Register Tab logic
    const tabLoginView = document.getElementById('tab-login-view');
    const tabRegisterView = document.getElementById('tab-register-view');
    const loginViewContainer = document.getElementById('login-view-container');
    const registerViewContainer = document.getElementById('register-view-container');

    if(tabLoginView && tabRegisterView) {
        tabLoginView.addEventListener('click', () => {
            tabLoginView.classList.add('active');
            tabRegisterView.classList.remove('active');
            loginViewContainer.classList.remove('hidden');
            registerViewContainer.classList.add('hidden');
        });
        tabRegisterView.addEventListener('click', () => {
            tabRegisterView.classList.add('active');
            tabLoginView.classList.remove('active');
            registerViewContainer.classList.remove('hidden');
            loginViewContainer.classList.add('hidden');
        });
    }

    // Register Form Logic
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombre = document.getElementById('reg-name').value;
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-pass').value;
            const rolElement = document.getElementById('reg-rol');
            const rol = rolElement ? rolElement.value : 'cliente';
            
            const errorMsg = document.getElementById('register-error');
            const successMsg = document.getElementById('register-success');
            const submitBtn = document.getElementById('submit-register-btn');
            
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';
            submitBtn.disabled = true;
            errorMsg.style.display = 'none';
            successMsg.style.display = 'none';

            try {
                const res = await fetch(API_BASE + '/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre, email, password, rol })
                });
                const data = await res.json();
                
                submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Registrarse';
                submitBtn.disabled = false;
                
                if (res.ok) {
                    successMsg.style.display = 'block';
                    registerForm.reset();
                    // Switch to login tab after 2 seconds
                    setTimeout(() => {
                        successMsg.style.display = 'none';
                        tabLoginView.click();
                        document.getElementById('login-email').value = email;
                        document.getElementById('login-pass').focus();
                    }, 2000);
                } else {
                    errorMsg.style.display = 'block';
                    errorMsg.textContent = data.error || 'Error al registrarse';
                }
            } catch (err) {
                submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Registrarse';
                submitBtn.disabled = false;
                errorMsg.style.display = 'block';
                errorMsg.textContent = 'Error de conexión';
            }
        });
    }

    // Logout
    const processLogout = () => {
        document.getElementById('client-dashboard').classList.add('hidden');
        document.getElementById('admin-dashboard').classList.add('hidden');
        document.getElementById('diseno-dashboard').classList.add('hidden');
        document.getElementById('produccion-dashboard').classList.add('hidden');
        landingView.classList.remove('hidden');
        document.getElementById('login-form').reset();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        authToken = null;
        window.scrollTo(0,0);
    };
    ['logout-cliente-btn', 'logout-admin-btn', 'logout-diseno-btn', 'logout-produccion-btn'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', processLogout);
    });

    /* ==========================================================================
       9. Upload System (Client)
       ========================================================================== */
    const uploadZone = document.getElementById('upload-zone');
    const realInput = document.getElementById('real-file-input');
    const simBtn = document.getElementById('simulate-select-file');
    const progressCard = document.getElementById('upload-progress-card');
    const progressBar = document.getElementById('upload-progress-bar');
    const statusText = document.getElementById('upload-status-text');
    const fileNameDisplay = document.getElementById('file-name-display');

    if(uploadZone && realInput && simBtn) {
        simBtn.addEventListener('click', () => realInput.click());

        // Drag and drop Visuals
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('dragover');
        });
        uploadZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
        });

        const fetchClientOrders = async () => {
            const tbody = document.getElementById('client-orders-body');
            if(!tbody) return;
            try {
                const res = await fetch(API_BASE + '/api/pedidos', { headers: getHeaders() });
                const data = await res.json();
                tbody.innerHTML = '';
                if(data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 1rem;">Aún no tienes diseños activos.</td></tr>';
                } else {
                    data.forEach(row => {
                        tbody.innerHTML += `
                            <tr>
                                <td><i class="fas fa-file" style="color:var(--primary); margin-right:5px;"></i> ${row.detalles}</td>
                                <td>${row.fecha}</td>
                                <td><span class="status-badge progress">${row.estado}</span></td>
                            </tr>
                        `;
                    });
                }
            } catch(e) {
                console.error(e);
            }
        };

        const processFile = async (file) => {
            if(!file) return;
            
            uploadZone.style.display = 'none';
            progressCard.classList.remove('hidden');
            fileNameDisplay.textContent = file.name;
            
            // Simulación de progreso visual mientras se sube
            let progress = 0;
            const interval = setInterval(() => {
                progress += Math.floor(Math.random() * 10) + 2;
                if(progress > 90) progress = 90;
                progressBar.style.width = progress + '%';
                statusText.textContent = progress + '%';
            }, 300);

            const formData = new FormData();
            formData.append('archivoDiseno', file);

            try {
                const res = await fetch(API_BASE + '/api/disenos', {
                    method: 'POST',
                    headers: getHeadersFormData(),
                    body: formData
                });
                
                clearInterval(interval);
                progressBar.style.width = '100%';
                
                if(res.ok) {
                    const json = await res.json();
                    progressBar.style.backgroundColor = '#2ecc71';
                    statusText.innerHTML = `<i class="fas fa-check-circle" style="color:#2ecc71"></i> ${json.message}`;
                    statusText.style.fontSize = '1rem';
                    statusText.style.marginTop = '1rem';
                    statusText.style.color = 'var(--text-dark)';
                    statusText.style.textAlign = 'left';

                    fetchClientOrders();

                    setTimeout(() => {
                        uploadZone.style.display = 'block';
                        progressCard.classList.add('hidden');
                        progressBar.style.width = '0%';
                        progressBar.style.backgroundColor = 'var(--primary)';
                        statusText.innerHTML = '0%';
                        statusText.style = "font-size: 0.85rem; margin-top: 0.5rem; text-align: right; color: var(--text-light);";
                    }, 5000);
                } else {
                    throw new Error("Failed");
                }
            } catch(e) {
                clearInterval(interval);
                statusText.textContent = "Error al subir el archivo";
                statusText.style.color = "red";
                setTimeout(() => {
                    uploadZone.style.display = 'block';
                    progressCard.classList.add('hidden');
                }, 3000);
            }
        };

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if(files.length > 0) processFile(files[0]);
        });

        realInput.addEventListener('change', (e) => {
            if(e.target.files.length > 0) processFile(e.target.files[0]);
        });
    }

    /* ==========================================================================
       10. Admin Table & Forms Logic
       ========================================================================== */
    const adminProductForm = document.getElementById('admin-product-form');
    if(adminProductForm) {
        adminProductForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('add-prod-btn');
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subiendo...';
            btn.disabled = true;

            const formData = new FormData();
            formData.append('nombre', document.getElementById('add-prod-nombre').value);
            formData.append('precio', document.getElementById('add-prod-precio').value);
            formData.append('categoria', document.getElementById('add-prod-categoria').value);
            formData.append('descripcion', document.getElementById('add-prod-desc').value);
            formData.append('badge', document.getElementById('add-prod-badge').value);
            formData.append('fabric', document.getElementById('add-prod-fabric').value);
            formData.append('features', document.getElementById('add-prod-features').value);
            formData.append('imagenProducto', document.getElementById('add-prod-imagen').files[0]);

            try {
                const res = await fetch(API_BASE + '/api/productos', {
                    method: 'POST',
                    headers: getHeadersFormData(),
                    body: formData
                });
                if(res.ok) {
                    btn.innerHTML = 'Publicar en Página Principal';
                    btn.disabled = false;
                    adminProductForm.reset();
                    fetchProducts(); // Refresh products
                    if (typeof renderAdminProducts === 'function') renderAdminProducts(); // update admin table too
                    alert("Producto agregado exitosamente.");
                } else {
                    throw new Error("Error en servidor");
                }
            } catch (err) {
                btn.innerHTML = 'Publicar en Página Principal';
                btn.disabled = false;
                alert("Hubo un error al subir el producto.");
            }
        });
    }

    window.renderAdminProducts = async () => {
        const tbody = document.getElementById('admin-products-body');
        if(!tbody) return;
        try {
            const res = await fetch(API_BASE + '/api/productos');
            const data = await res.json();
            tbody.innerHTML = '';
            if(data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2rem;">No hay productos en catálogo.</td></tr>';
                return;
            }
            data.forEach(p => {
                const imgUrl = p.imagen.startsWith('/uploads/') ? API_BASE + p.imagen : p.imagen;
                tbody.innerHTML += `
                    <tr>
                        <td>#${p.id}</td>
                        <td><img src="${imgUrl}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;"></td>
                        <td>${p.nombre}</td>
                        <td>${p.categoria}</td>
                        <td>${p.precio_texto || '$'+p.precio}</td>
                        <td>
                            <button class="icon-btn btn-action" onclick="openEditProduct(${p.id})" style="color: var(--primary);" title="Editar"><i class="fas fa-edit"></i></button>
                            <button class="icon-btn btn-action" onclick="deleteProduct(${p.id})" style="color: #ff4757;" title="Eliminar"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                `;
            });
        } catch(e) {
            console.error(e);
        }
    };

    window.deleteProduct = async (id) => {
        if(!confirm('¿Estás seguro de eliminar este producto?')) return;
        try {
            const res = await fetch(API_BASE + '/api/productos/' + id, {
                method: 'DELETE',
                headers: getHeaders()
            });
            if(res.ok) {
                renderAdminProducts();
                fetchProducts();
                alert('Producto eliminado');
            } else {
                alert('Error al eliminar producto');
            }
        } catch(e) {
            console.error(e);
        }
    };

    const editProductModal = document.getElementById('edit-product-modal');
    const closeEditModalBtn = document.getElementById('close-edit-modal');
    if (closeEditModalBtn) {
        closeEditModalBtn.addEventListener('click', () => editProductModal.classList.remove('open'));
    }

    window.openEditProduct = async (id) => {
        try {
            const res = await fetch(API_BASE + '/api/productos');
            const prods = await res.json();
            const p = prods.find(x => x.id === id);
            if(!p) return;
            
            document.getElementById('edit-prod-id').value = p.id;
            document.getElementById('edit-prod-nombre').value = p.nombre;
            document.getElementById('edit-prod-precio').value = p.precio;
            document.getElementById('edit-prod-categoria').value = p.categoria;
            document.getElementById('edit-prod-badge').value = p.badge || '';
            document.getElementById('edit-prod-fabric').value = p.fabric || '';
            
            let featuresStr = '';
            try {
                const fArr = JSON.parse(p.features);
                featuresStr = fArr.join(', ');
            } catch(e) {
                featuresStr = p.features;
            }
            document.getElementById('edit-prod-features').value = featuresStr;
            document.getElementById('edit-prod-desc').value = p.descripcion || '';
            document.getElementById('edit-prod-imagen').value = ''; // clear file input
            
            editProductModal.classList.add('open');
        } catch(e) {
            console.error(e);
        }
    };

    const editProductForm = document.getElementById('edit-product-form');
    if (editProductForm) {
        editProductForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('save-edit-btn');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
            btn.disabled = true;

            const id = document.getElementById('edit-prod-id').value;
            const formData = new FormData();
            formData.append('nombre', document.getElementById('edit-prod-nombre').value);
            formData.append('precio', document.getElementById('edit-prod-precio').value);
            formData.append('categoria', document.getElementById('edit-prod-categoria').value);
            formData.append('descripcion', document.getElementById('edit-prod-desc').value);
            formData.append('badge', document.getElementById('edit-prod-badge').value);
            formData.append('fabric', document.getElementById('edit-prod-fabric').value);
            formData.append('features', document.getElementById('edit-prod-features').value);
            
            const fileInput = document.getElementById('edit-prod-imagen');
            if (fileInput.files.length > 0) {
                formData.append('imagenProducto', fileInput.files[0]);
            }

            try {
                const res = await fetch(API_BASE + '/api/productos/' + id, {
                    method: 'PUT',
                    headers: getHeadersFormData(),
                    body: formData
                });
                if(res.ok) {
                    editProductModal.classList.remove('open');
                    fetchProducts();
                    if(typeof renderAdminProducts === 'function') renderAdminProducts();
                    alert("Producto actualizado exitosamente.");
                } else {
                    alert("Error al actualizar producto.");
                }
            } catch(err) {
                console.error(err);
                alert("Error de conexión.");
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }

    const renderAdminTable = async () => {
        const tbody = document.getElementById('admin-table-body');
        if(!tbody) return;
        
        try {
            const res = await fetch(API_BASE + '/api/pedidos', { headers: getHeaders() });
            const data = await res.json();
            
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2rem;">No hay pedidos de rediseño entrantes.</td></tr>';
                return;
            }

            tbody.innerHTML = '';
            data.forEach(row => {
                tbody.innerHTML += `
                    <tr>
                        <td>#${row.id.toString().substring(row.id.toString().length - 5)}</td>
                        <td style="font-weight: 500;">${row.cliente_nombre}</td>
                        <td><i class="fas fa-file-alt" style="color:var(--primary); margin-right:5px;"></i> ${row.detalles}</td>
                        <td>${row.fecha}</td>
                        <td><span class="status-badge progress">${row.estado}</span></td>
                        <td>
                            <button class="icon-btn btn-action" onclick="updatePedido(${row.id}, 'aprobado')" title="Aprobar"><i class="fas fa-check"></i></button>
                        </td>
                    </tr>
                `;
            });
        } catch (err) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2rem; color:red;">Error al cargar datos.</td></tr>';
        }
    };

    window.updatePedido = async (id, estado) => {
        if(!confirm(`¿Cambiar estado a ${estado}?`)) return;
        try {
            const res = await fetch(API_BASE + `/api/pedidos/${id}/estado`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({ estado })
            });
            if(res.ok) {
                // Refresh all tables
                if (typeof renderAdminTable === 'function') renderAdminTable();
                if (typeof renderDisenoTable === 'function') renderDisenoTable();
                if (typeof renderProduccionTable === 'function') renderProduccionTable();
            } else {
                alert("Error al actualizar");
            }
        } catch(e) { console.error(e); }
    };

    window.renderDisenoTable = async () => {
        const tbody = document.getElementById('diseno-table-body');
        const dbody = document.getElementById('disenos-files-body');
        if(!tbody) return;
        
        try {
            const res = await fetch(API_BASE + '/api/pedidos', { headers: getHeaders() });
            const data = await res.json();
            tbody.innerHTML = '';
            data.forEach(row => {
                tbody.innerHTML += `
                    <tr>
                        <td>#${row.id}</td>
                        <td style="font-weight: 500;">${row.cliente_nombre}</td>
                        <td>${row.detalles}</td>
                        <td><span class="status-badge progress">${row.estado}</span></td>
                        <td>
                            <button class="icon-btn btn-action" onclick="updatePedido(${row.id}, 'en diseño')" title="Marcar En Diseño"><i class="fas fa-pencil-alt"></i></button>
                            <button class="icon-btn btn-action" onclick="updatePedido(${row.id}, 'aprobado')" title="Marcar Aprobado"><i class="fas fa-check-double"></i></button>
                        </td>
                    </tr>
                `;
            });

            // Disenos
            const resD = await fetch(API_BASE + '/api/disenos', { headers: getHeaders() });
            const disenos = await resD.json();
            if(dbody) {
                dbody.innerHTML = '';
                disenos.forEach(d => {
                    const ext = d.ruta_archivo.split('.').pop().toLowerCase();
                    const isImg = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
                    const preview = isImg ? `<img src="${API_BASE}/uploads/${d.ruta_archivo}" style="max-height: 80px; border-radius:4px; display:block; margin-top:5px;">` : '';
                    dbody.innerHTML += `
                        <tr>
                            <td>#${d.id}</td>
                            <td><a href="${API_BASE}/api/download/${d.id}" target="_blank" style="color:var(--primary); font-weight:bold;"><i class="fas fa-download"></i> ${d.ruta_archivo}</a>${preview}</td>
                            <td>
                                <select onchange="updateDisenoStatus(${d.id}, this.value)" style="padding:0.3rem; border-radius:4px; border:1px solid var(--border);">
                                    <option value="pendiente" ${d.estado_aprobacion==='pendiente'?'selected':''}>Pendiente</option>
                                    <option value="aprobado" ${d.estado_aprobacion==='aprobado'?'selected':''}>Aprobado</option>
                                    <option value="rechazado" ${d.estado_aprobacion==='rechazado'?'selected':''}>Rechazado</option>
                                    <option value="requiere cambios" ${d.estado_aprobacion==='requiere cambios'?'selected':''}>Requiere Cambios</option>
                                </select>
                            </td>
                            <td>
                                <button class="icon-btn btn-action" title="No aplica"><i class="fas fa-eye"></i></button>
                            </td>
                        </tr>
                    `;
                });
            }
        } catch (err) {}
    };

    window.renderProduccionTable = async () => {
        const tbody = document.getElementById('produccion-table-body');
        if(!tbody) return;
        
        try {
            const res = await fetch(API_BASE + '/api/pedidos', { headers: getHeaders() });
            const data = await res.json();
            tbody.innerHTML = '';
            data.forEach(row => {
                tbody.innerHTML += `
                    <tr>
                        <td>#${row.id}</td>
                        <td style="font-weight: 500;">${row.cliente_nombre}</td>
                        <td>${row.detalles}</td>
                        <td><span class="status-badge progress">${row.estado}</span></td>
                        <td>
                            <button class="icon-btn btn-action" onclick="updatePedido(${row.id}, 'en producción')" title="Iniciar Prod"><i class="fas fa-cogs"></i></button>
                            <button class="icon-btn btn-action" onclick="updatePedido(${row.id}, 'terminado')" title="Terminar"><i class="fas fa-check"></i></button>
                        </td>
                    </tr>
                `;
            });
        } catch (err) {}
    };

    // Auto-login if token exists
    if(authToken) {
        const user = JSON.parse(localStorage.getItem('user'));
        if(user) {
            document.getElementById('login-modal').classList.remove('open');
            landingView.classList.add('hidden');
            const role = user.rol;
            const nombre = user.nombre;
            if (role === 'cliente') {
                document.getElementById('client-dashboard').classList.remove('hidden');
                document.getElementById('client-name-display').textContent = nombre;
                if (typeof fetchClientOrders === 'function') fetchClientOrders();
            } else if (role === 'administrador' || role === 'superadmin') {
                document.getElementById('admin-dashboard').classList.remove('hidden');
                document.getElementById('admin-name-display').textContent = nombre;
                if (typeof renderAdminTable === 'function') renderAdminTable();
                if (typeof renderAdminProducts === 'function') renderAdminProducts();
                if (role === 'superadmin') {
                    const superadminExtras = document.getElementById('superadmin-extras');
                    if (superadminExtras) superadminExtras.classList.remove('hidden');
                    if (typeof renderSuperadminUsers === 'function') renderSuperadminUsers();
                    if (typeof renderSuperadminDisenos === 'function') renderSuperadminDisenos();
                    if (typeof renderSuperadminProduccion === 'function') renderSuperadminProduccion();
                }
            } else if (role === 'diseñador') {
                document.getElementById('diseno-dashboard').classList.remove('hidden');
                document.getElementById('diseno-name-display').textContent = nombre;
                if (typeof renderDisenoTable === 'function') renderDisenoTable();
            } else if (role === 'producción') {
                document.getElementById('produccion-dashboard').classList.remove('hidden');
                document.getElementById('produccion-name-display').textContent = nombre;
                if (typeof renderProduccionTable === 'function') renderProduccionTable();
            }
        }
    }

    // Fix Dark Mode in Dashboard
    const dashMoon = document.getElementById('dash-moon');
    if (dashMoon) {
        dashMoon.parentElement.addEventListener('click', () => {
            document.getElementById('theme-toggle').click();
            let theme = document.documentElement.getAttribute('data-theme');
            dashMoon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        });
    }

    /* ==========================================================================
       11. Profile, Chat, and Superadmin Logic
       ========================================================================== */
    window.previewImage = (event, targetId) => {
        const file = event.target.files[0];
        const img = document.getElementById(targetId);
        if (file && img) {
            const reader = new FileReader();
            reader.onload = function(e) {
                img.src = e.target.result;
                img.style.display = 'block';
            }
            reader.readAsDataURL(file);
        } else if (img) {
            img.style.display = 'none';
        }
    };

    const profileModal = document.getElementById('profile-modal');
    document.querySelectorAll('.btn-perfil').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const user = JSON.parse(localStorage.getItem('user'));
            if(user) {
                document.getElementById('perfil-nombre').value = user.nombre;
                const pEmail = document.getElementById('perfil-email'); if(pEmail) pEmail.value = user.email || '';
                const pRol = document.getElementById('perfil-rol'); if(pRol) pRol.value = user.rol || '';
                const pTel = document.getElementById('perfil-telefono'); if(pTel) pTel.value = user.telefono || '';
                const pFecha = document.getElementById('perfil-fecha-nacimiento'); if(pFecha) pFecha.value = user.fecha_nacimiento || '';
                const pFoto = document.getElementById('perfil-foto-preview'); if(pFoto && user.foto_perfil) pFoto.src = API_BASE + user.foto_perfil;
                document.getElementById('perfil-password').value = '';
                if(profileModal) profileModal.classList.add('open');
            }
        });
    });
    const closeProfileModalBtn = document.getElementById('close-profile-modal');
    if (closeProfileModalBtn && profileModal) {
        closeProfileModalBtn.addEventListener('click', () => profileModal.classList.remove('open'));
    }

    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('save-profile-btn');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando cambios...';
            btn.disabled = true;
            
            const formData = new FormData();
            formData.append('nombre', document.getElementById('perfil-nombre').value);
            const pTel = document.getElementById('perfil-telefono'); if(pTel) formData.append('telefono', pTel.value);
            const pFecha = document.getElementById('perfil-fecha-nacimiento'); if(pFecha) formData.append('fecha_nacimiento', pFecha.value);
            const pass = document.getElementById('perfil-password').value;
            if (pass) formData.append('password', pass);
            const fileInput = document.getElementById('perfil-foto');
            if (fileInput && fileInput.files.length > 0) formData.append('foto_perfil', fileInput.files[0]);

            try {
                const res = await fetch(API_BASE + '/api/perfil', {
                    method: 'PUT',
                    headers: getHeadersFormData(),
                    body: formData
                });
                if(res.ok) {
                    const data = await res.json();
                    localStorage.setItem('user', JSON.stringify(data.user));
                    alert("¡Cambios guardados exitosamente!");
                    document.querySelectorAll('[id$="-name-display"]').forEach(el => el.textContent = data.user.nombre);
                    if(profileModal) profileModal.classList.remove('open');
                } else {
                    alert("Error al guardar los cambios");
                }
            } catch(e) { console.error(e); }
            btn.innerHTML = originalText;
            btn.disabled = false;
        });
    }

    const chatModal = document.getElementById('chat-modal');
    let chatInterval = null;
    let activeChatId = null;
    let isInitialChatLoad = true;
    let allEmployees = [];

    const loadEmployees = async () => {
        try {
            const res = await fetch(API_BASE + '/api/empleados', { headers: getHeaders() });
            allEmployees = await res.json();
            renderContacts();
        } catch(e) {}
    };

    let searchUserTerm = '';

    const renderContacts = () => {
        const list = document.getElementById('chat-contacts-list');
        if(!list) return;
        
        let html = '';
        if ('chat grupal'.includes(searchUserTerm)) {
            html += `
                <div class="chat-contact" onclick="window.switchChat(null, 'Chat Grupal')" style="padding:15px; border-bottom:1px solid var(--border); cursor:pointer; display:flex; align-items:center; gap:10px; background:${activeChatId === null ? 'var(--bg-light)' : 'transparent'}; transition:background 0.2s;">
                    <div style="width:40px; height:40px; border-radius:50%; background:var(--primary); color:white; display:flex; align-items:center; justify-content:center; flex-shrink:0;"><i class="fas fa-users"></i></div>
                    <div style="overflow:hidden;">
                        <strong style="color:var(--text); display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Chat Grupal</strong>
                        <small style="color:var(--text-light);">Todos los empleados</small>
                    </div>
                </div>
            `;
        }
        
        allEmployees.filter(e => 
            (e.nombre||'').toLowerCase().includes(searchUserTerm) || 
            (e.rol||'').toLowerCase().includes(searchUserTerm) ||
            (e.telefono||'').includes(searchUserTerm) ||
            (e.id||'').toString() === searchUserTerm
        ).forEach(emp => {
            const currentUser = JSON.parse(localStorage.getItem('user')) || {};
            if(emp.id === currentUser.id) return;
            const isActive = activeChatId === emp.id;
            html += `
            <div class="chat-contact" onclick="window.switchChat(${emp.id}, '${emp.nombre.replace(/'/g, "\\'")}')" style="padding:15px; border-bottom:1px solid var(--border); cursor:pointer; display:flex; align-items:center; gap:10px; background:${isActive ? 'var(--bg-light)' : 'transparent'}; transition:background 0.2s;">
                <img src="${emp.foto_perfil ? API_BASE+emp.foto_perfil : 'https://placehold.co/40x40/ccc/fff'}" style="width:40px; height:40px; border-radius:50%; object-fit:cover; flex-shrink:0;">
                <div style="overflow:hidden;">
                    <strong style="color:var(--text); display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${emp.nombre}</strong>
                    <small style="color:var(--text-light);">${emp.rol}</small>
                </div>
            </div>
            `;
        });
        list.innerHTML = html;
        
        const searchForm = document.getElementById('chat-search-form');
        if (searchForm && !searchForm.dataset.bound) {
            searchForm.dataset.bound = 'true';
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const searchInput = document.getElementById('chat-search-users');
                if (searchInput) {
                    searchUserTerm = searchInput.value.toLowerCase().trim();
                    renderContacts();
                }
            });
            
            // Allow clearing filter if they empty the input and click away or hit enter
            const searchInput = document.getElementById('chat-search-users');
            if(searchInput) {
                searchInput.addEventListener('input', (e) => {
                    if (e.target.value.trim() === '') {
                        searchUserTerm = '';
                        renderContacts();
                    }
                });
            }
        }
    };

    window.switchChat = (id, name) => {
        activeChatId = id;
        document.getElementById('chat-active-name').textContent = name;
        isInitialChatLoad = true;
        renderContacts();
        loadChat();
    };

    window.closeActiveChat = () => {
        activeChatId = -1;
        document.getElementById('chat-active-name').textContent = '';
        const container = document.getElementById('chat-messages');
        if(container) {
            container.innerHTML = '<div style="margin:auto; padding-top:50px; text-align:center; color:rgba(0,0,0,0.4);"><i class="fas fa-comments fa-3x" style="margin-bottom:10px;"></i><p>Selecciona un chat para iniciar</p></div>';
        }
        renderContacts();
    };

    const setChatBadge = (show) => {
        document.querySelectorAll('.btn-chat').forEach(btn => {
            let badge = btn.querySelector('.chat-global-badge');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'chat-global-badge';
                badge.style.cssText = 'position:absolute; top:-5px; right:-5px; background:#ff4757; color:white; border-radius:50%; width:15px; height:15px; box-shadow:0 0 5px rgba(0,0,0,0.3); animation: pulse 2s infinite;';
                btn.style.position = 'relative';
                btn.appendChild(badge);
            }
            badge.style.display = show ? 'block' : 'none';
        });
    };

    document.querySelectorAll('.btn-chat').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if(chatModal) {
                setChatBadge(false);
                chatModal.classList.add('open');
                isInitialChatLoad = true;
                if(activeChatId === -1) activeChatId = null; // default to group
                if(activeChatId === null) document.getElementById('chat-active-name').textContent = 'Chat Grupal';
                loadEmployees();
                loadChat();
                if(chatInterval) clearInterval(chatInterval);
                chatInterval = setInterval(loadChat, 3000);
            }
        });
    });
    const closeChatModalBtn = document.getElementById('close-chat-modal');
    if (closeChatModalBtn && chatModal) {
        closeChatModalBtn.addEventListener('click', () => {
            chatModal.classList.remove('open');
            if(chatInterval) clearInterval(chatInterval);
        });
    }

    const loadChat = async () => {
        if (activeChatId === -1) return;
        try {
            const res = await fetch(API_BASE + '/api/chat?destinatario_id=' + (activeChatId || 'null'), { headers: getHeaders() });
            const msgs = await res.json();
            const container = document.getElementById('chat-messages');
            if(container) {
                const wasAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50;
                
                container.innerHTML = '';
                msgs.forEach(m => {
                    const currentUser = JSON.parse(localStorage.getItem('user')) || {};
                    const isOwn = m.usuario_id === currentUser.id;
                    const canEdit = isOwn || currentUser.rol === 'superadmin';
                    let attachment = '';
                    if (m.archivo) {
                        const ext = m.archivo.split('.').pop().toLowerCase();
                        if(['jpg','jpeg','png','gif','webp'].includes(ext)) {
                            attachment = `<br><img src="${API_BASE}${m.archivo}" style="max-width:200px; border-radius:4px; margin-top:5px; cursor:pointer;" onclick="window.open('${API_BASE}${m.archivo}','_blank')">`;
                        } else if (['mp3','ogg','wav','webm'].includes(ext)) {
                            attachment = `<br><audio controls src="${API_BASE}${m.archivo}" style="max-width:200px; height:35px; margin-top:5px; outline:none;"></audio>`;
                        } else {
                            attachment = `<br><a href="${API_BASE}${m.archivo}" target="_blank" style="color:${isOwn ? '#000' : 'var(--primary)'}; font-size:0.8rem; font-weight:bold;"><i class="fas fa-file-download"></i> Descargar Documento</a>`;
                        }
                    }
                    const alignSelf = isOwn ? 'align-self: flex-end;' : 'align-self: flex-start;';
                    const bgColor = isOwn ? 'background-color: #dcf8c6;' : 'background-color: #ffffff;';
                    const radius = isOwn ? 'border-radius: 12px 0 12px 12px;' : 'border-radius: 0 12px 12px 12px;';

                    container.innerHTML += `
                        <div style="${alignSelf} ${bgColor} ${radius} padding:8px 12px; box-shadow:0 1px 1px rgba(0,0,0,0.1); max-width: 80%; position:relative;">
                            ${!isOwn ? `<strong style="color:var(--primary); font-size:0.8rem; display:block; margin-bottom:2px;">${m.nombre} <span style="font-size:0.8em; color:rgba(0,0,0,0.5)">(${m.rol})</span></strong>` : ''}
                            <p id="chat-msg-text-${m.id}" style="margin:0; font-size:0.95rem; color:#303030; word-wrap: break-word;">${m.mensaje || ''}</p>
                            ${attachment}
                            <div style="text-align: right; margin-top: 4px; display:flex; justify-content: flex-end; align-items: center; gap: 5px;">
                                <span style="font-size:0.7rem; color:rgba(0,0,0,0.45);">${m.fecha.includes(', ') ? m.fecha.split(', ')[1] : m.fecha}</span>
                                ${canEdit ? `
                                    <button onclick="editChat(${m.id})" style="background:none; border:none; color:rgba(0,0,0,0.45); cursor:pointer; font-size:0.7rem; padding:0;" title="Editar"><i class="fas fa-edit"></i></button>
                                    <button onclick="deleteChat(${m.id})" style="background:none; border:none; color:#ff4757; cursor:pointer; font-size:0.7rem; padding:0;" title="Eliminar"><i class="fas fa-trash"></i></button>
                                ` : ''}
                            </div>
                        </div>
                    `;
                });
                
                if (isInitialChatLoad || wasAtBottom) {
                    container.scrollTop = container.scrollHeight;
                }
                isInitialChatLoad = false;
            }
        } catch(e) {}
    };

    const chatForm = document.getElementById('chat-form');
    if(chatForm) {
        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('chat-input');
            const fileInput = document.getElementById('chat-file');
            const msg = input.value.trim();
            
            if (!msg && (!fileInput || fileInput.files.length === 0)) return;
            
            input.value = '';
            
            const formData = new FormData();
            formData.append('mensaje', msg);
            formData.append('destinatario_id', activeChatId || 'null');
            if (fileInput && fileInput.files.length > 0) {
                formData.append('archivo', fileInput.files[0]);
            }
            if(fileInput) fileInput.value = '';
            const preview = document.getElementById('chat-file-preview');
            if(preview) preview.style.display = 'none';

            try {
                await fetch(API_BASE + '/api/chat', {
                    method: 'POST',
                    headers: getHeadersFormData(),
                    body: formData
                });
                isInitialChatLoad = true;
                loadChat();
            } catch(e) {}
        });
    }

    window.renderSuperadminUsers = async () => {
        try {
            const res = await fetch(API_BASE + '/api/usuarios', { headers: getHeaders() });
            const users = await res.json();
            const tbody = document.getElementById('superadmin-users-body');
            if(tbody) {
                tbody.innerHTML = '';
                users.forEach(u => {
                    tbody.innerHTML += `
                        <tr>
                            <td>#${u.id}</td>
                            <td>${u.nombre}</td>
                            <td>${u.email}</td>
                            <td>
                                <select onchange="changeUserRole(${u.id}, this.value, '${u.nombre}')" style="padding:0.3rem; border-radius:4px;">
                                    <option value="cliente" ${u.rol==='cliente'?'selected':''}>Cliente</option>
                                    <option value="administrador" ${u.rol==='administrador'?'selected':''}>Administrador</option>
                                    <option value="diseñador" ${u.rol==='diseñador'?'selected':''}>Diseñador</option>
                                    <option value="producción" ${u.rol==='producción'?'selected':''}>Producción</option>
                                    <option value="superadmin" ${u.rol==='superadmin'?'selected':''}>Superadmin</option>
                                </select>
                            </td>
                            <td>-</td>
                        </tr>
                    `;
                });
            }
        } catch(e){}
    };

    window.changeUserRole = async (id, newRole, name) => {
        if(!confirm(`¿Cambiar rol a ${newRole}?`)) return;
        try {
            await fetch(API_BASE + '/api/usuarios/' + id, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({ rol: newRole, nombre: name })
            });
            renderSuperadminUsers();
        } catch(e){}
    };

    window.renderSuperadminDisenos = async () => {
        try {
            const res = await fetch(API_BASE + '/api/disenos', { headers: getHeaders() });
            const disenos = await res.json();
            const tbody = document.getElementById('superadmin-diseno-body');
            if(tbody) {
                tbody.innerHTML = '';
                disenos.forEach(d => {
                    const ext = d.ruta_archivo.split('.').pop().toLowerCase();
                    const isImg = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
                    const preview = isImg ? `<img src="${API_BASE}/uploads/${d.ruta_archivo}" style="max-height: 50px; border-radius:4px; display:block; margin-top:5px;">` : '';
                    tbody.innerHTML += `
                        <tr>
                            <td>#${d.id}</td>
                            <td><a href="${API_BASE}/api/download/${d.id}" target="_blank" style="color:var(--primary); font-weight:bold;"><i class="fas fa-download"></i> ${d.ruta_archivo}</a>${preview}</td>
                            <td>
                                <select onchange="updateDisenoStatus(${d.id}, this.value)" style="padding:0.3rem; border-radius:4px; border:1px solid var(--border);">
                                    <option value="pendiente" ${d.estado_aprobacion==='pendiente'?'selected':''}>Pendiente</option>
                                    <option value="aprobado" ${d.estado_aprobacion==='aprobado'?'selected':''}>Aprobado</option>
                                    <option value="rechazado" ${d.estado_aprobacion==='rechazado'?'selected':''}>Rechazado</option>
                                    <option value="requiere cambios" ${d.estado_aprobacion==='requiere cambios'?'selected':''}>Requiere Cambios</option>
                                </select>
                            </td>
                        </tr>
                    `;
                });
            }
        } catch(e){}
    };

    window.renderSuperadminProduccion = async () => {
        try {
            const res = await fetch(API_BASE + '/api/pedidos', { headers: getHeaders() });
            const data = await res.json();
            const tbody = document.getElementById('superadmin-produccion-body');
            if(tbody) {
                tbody.innerHTML = '';
                data.forEach(row => {
                    if (row.estado !== 'pendiente') {
                        tbody.innerHTML += `
                            <tr>
                                <td>#${row.id}</td>
                                <td>${row.cliente_nombre}</td>
                                <td>${row.detalles}</td>
                                <td><span class="status-badge progress">${row.estado}</span></td>
                            </tr>
                        `;
                    }
                });
            }
        } catch(e){}
    };

    window.updateDisenoStatus = async (id, estado) => {
        try {
            const res = await fetch(API_BASE + `/api/disenos/${id}/estado`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({ estado_aprobacion: estado })
            });
            if (!res.ok) alert("Error al actualizar estado");
        } catch(e) { console.error(e); }
    };

    window.editChat = async (id) => {
        const p = document.getElementById('chat-msg-text-' + id);
        const newMsg = prompt("Editar mensaje:", p.textContent);
        if (newMsg !== null) {
            try {
                await fetch(API_BASE + '/api/chat/' + id, {
                    method: 'PUT',
                    headers: getHeaders(),
                    body: JSON.stringify({ mensaje: newMsg })
                });
                loadChat();
            } catch(e){}
        }
    };

    window.deleteChat = async (id) => {
        if(confirm("¿Eliminar este mensaje?")) {
            try {
                await fetch(API_BASE + '/api/chat/' + id, {
                    method: 'DELETE',
                    headers: getHeaders()
                });
                loadChat();
            } catch(e){}
        }
    };

    const chatFileInput = document.getElementById('chat-file');
    if (chatFileInput) {
        chatFileInput.addEventListener('change', () => {
            const preview = document.getElementById('chat-file-preview');
            if(chatFileInput.files.length > 0) {
                preview.textContent = 'Archivo adjunto: ' + chatFileInput.files[0].name;
                preview.style.display = 'block';
            } else {
                preview.style.display = 'none';
            }
        });
    }

    const recordBtn = document.getElementById('chat-record-btn');
    let mediaRecorder;
    let audioChunks = [];
    let isRecording = false;

    if (recordBtn) {
        recordBtn.addEventListener('click', async () => {
            if (!isRecording) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    mediaRecorder = new MediaRecorder(stream);
                    mediaRecorder.start();
                    isRecording = true;
                    recordBtn.style.color = 'red';
                    
                    const icon = recordBtn.querySelector('i');
                    let on = false;
                    const blink = setInterval(() => {
                        icon.style.opacity = on ? '1' : '0.5';
                        on = !on;
                    }, 500);

                    mediaRecorder.addEventListener('dataavailable', event => {
                        audioChunks.push(event.data);
                    });

                    mediaRecorder.addEventListener('stop', async () => {
                        clearInterval(blink);
                        icon.style.opacity = '1';
                        
                        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                        audioChunks = [];
                        
                        const formData = new FormData();
                        formData.append('mensaje', '🎤 Mensaje de voz');
                        formData.append('archivo', audioBlob, 'voice_message.webm');
                        formData.append('destinatario_id', activeChatId || 'null');
                        try {
                            await fetch(API_BASE + '/api/chat', {
                                method: 'POST',
                                headers: getHeadersFormData(),
                                body: formData
                            });
                            isInitialChatLoad = true;
                            loadChat();
                        } catch(e) {}
                    });
                } catch(e) {
                    alert("No se pudo acceder al micrófono.");
                }
            } else {
                mediaRecorder.stop();
                mediaRecorder.stream.getTracks().forEach(track => track.stop());
                isRecording = false;
                recordBtn.style.color = 'var(--text-light)';
            }
        });
    }

    // Notificaciones Polling
    let lastNotifCheck = Date.now();
    const checkNotificaciones = async () => {
        if (!authToken) return;
        try {
            const res = await fetch(API_BASE + '/api/notificaciones', { headers: getHeaders() });
            if (!res.ok) return;
            const notifs = await res.json();
            const newNotifs = notifs.filter(n => new Date(n.fecha).getTime() > lastNotifCheck);
            if (newNotifs.length > 0) {
                const bar = document.getElementById('notification-bar');
                const text = document.getElementById('notification-text');
                if (bar && text) {
                    text.innerHTML = '<strong>' + (newNotifs[0].para_rol === 'todos' ? 'Aviso General: ' : '') + '</strong>' + newNotifs[0].mensaje;
                    bar.style.display = 'block';
                    setTimeout(() => bar.style.display = 'none', 10000);
                }
                lastNotifCheck = Date.now();
            }
        } catch(e) {}
    };
    setInterval(checkNotificaciones, 10000);

    let lastGlobalMsgId = 0;
    const checkNewMessages = async () => {
        const currentToken = localStorage.getItem('token');
        if (!currentToken) return;
        try {
            const res = await fetch(API_BASE + '/api/chat/check', { 
                headers: { 'Authorization': `Bearer ${currentToken}` } 
            });
            if (!res.ok) return;
            const data = await res.json();
            if (data.id && data.id > lastGlobalMsgId) {
                if (lastGlobalMsgId !== 0) {
                    const bar = document.getElementById('notification-bar');
                    const text = document.getElementById('notification-text');
                    if (bar && text) {
                        const isGroup = data.destinatario_id === null;
                        text.innerHTML = `<strong>${isGroup ? 'Chat Grupal' : 'Chat Privado'} - ${data.nombre}:</strong> ${data.mensaje || 'Adjunto'}`;
                        bar.style.display = 'block';
                        setTimeout(() => bar.style.display = 'none', 6000);
                        setChatBadge(true); // Activa el punto rojo
                    }
                }
                lastGlobalMsgId = data.id;
            }
        } catch(e) {}
    };
    setInterval(checkNewMessages, 3000);
});
