// Lataa komponentit (Navbar/Footer) - ladataan vain kerran sivuston alussa
async function loadComponent(id, file, callback) {
    const resp = await fetch(file);
    const html = await resp.text();
    document.getElementById(id).innerHTML = html;
    if (callback) callback();
}

// --- SPA NAVIGAATIO ---

// Navigointifunktio, joka vaihtaa vain content-wrapperin sisällön
async function navigate(page, id = null) {
    const wrapper = document.querySelector('.content-wrapper');
    if (!wrapper) return;

    // Muodostetaan URL
    let url = `${page}.html`;
    if (id) url += `?id=${id}`;
    
    // Päivitetään selaimen osoiterivi ilman sivun latausta
    window.history.pushState({ page, id }, "", url);

    try {
        const resp = await fetch(`${page}.html`);
        const html = await resp.text();
        
        // Poimitaan ladatusta sivusta vain content-wrapperin sisältö
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const newContent = doc.querySelector('.content-wrapper').innerHTML;
        
        wrapper.innerHTML = newContent;

        // Suoritetaan sivukohtainen renderöinti
        if (page === 'index') {
            document.title = "Israel-katsaus";
            renderFrontPage();
        } else if (page === 'archive') {
            document.title = "Arkisto | Israel-katsaus";
            renderArchive();
        } else if (page === 'uutinen') {
            renderSingleArticle(); // Otsikko päivittyy funktion sisällä
        }

        // Suljetaan mobiilivalikko ja skrollataan ylös
        const menu = document.getElementById('nav-menu');
        if (menu) menu.classList.remove('active');
        window.scrollTo(0, 0);

    } catch (err) {
        console.error("Sivun lataus epäonnistui:", err);
    }
}

// Kuunnellaan selaimen takaisin-painiketta
window.onpopstate = function(event) {
    if (event.state) {
        navigate(event.state.page, event.state.id);
    } else {
        location.reload();
    }
};

// --- TOIMINNALLISUUDET ---

function initNavbar() {
    const btn = document.getElementById('hamburger-btn');
    const menu = document.getElementById('nav-menu');
    if (btn && menu) {
        btn.onclick = () => menu.classList.toggle('active');
    }
    
    const params = new URLSearchParams(window.location.search);
    const searchQuery = params.get('search');
    if (searchQuery && document.getElementById('search-grid')) {
        executeSearch(searchQuery);
    }
}

async function getArticles() {
    const resp = await fetch('news.json');
    const data = await resp.json();
    return data.articles.sort((a, b) => new Date(b.date) - new Date(a.date));
}

async function handleSearch(event) {
    if (event.key === 'Enter') {
        const query = event.target.value.trim().toLowerCase();
        if (!query) return;

        const grid = document.getElementById('search-grid');
        
        if (!grid) {
            // Jos ei olla etusivulla, navigoidaan sinne hakuparametrin kanssa
            window.location.href = `index.html?search=${encodeURIComponent(query)}`;
        } else {
            executeSearch(query);
        }
    }
}

async function executeSearch(query) {
    const articles = await getArticles();
    const results = articles.map(art => {
        let score = 0;
        if (art.title.toLowerCase().includes(query)) score += 3;
        if (art.excerpt.toLowerCase().includes(query)) score += 2;
        if (art.content.toLowerCase().includes(query)) score += 1;
        return { ...art, score };
    })
    .filter(art => art.score > 0)
    .sort((a, b) => b.score - a.score);

    const grid = document.getElementById('search-grid');
    const container = document.getElementById('search-results-container');
    const layout = document.getElementById('front-page-layout');
    
    if (grid && container) {
        if (layout) layout.style.display = 'none';
        container.style.display = 'block';
        
        if (results.length === 0) {
            grid.innerHTML = "<p>Ei hakutuloksia.</p>";
        } else {
            grid.innerHTML = results.map(art => `
                <div class="news-card" onclick="navigate('uutinen', ${art.id})">
                    <img src="${art.image}">
                    <h3>${art.title}</h3>
                </div>
            `).join('');
        }
        window.scrollTo(0, 0);
    }
}

async function renderFrontPage() {
    const articles = await getArticles();
    if (articles.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('search')) return;

    const main = articles[0];
    const side = articles.slice(1, 7);

    const mainArea = document.getElementById('main-article-area');
    if (mainArea) {
        mainArea.innerHTML = `
            <div class="main-article-card" onclick="navigate('uutinen', ${main.id})">
                <div class="img-container-32"><img src="${main.image}"></div>
                <h2>${main.title}</h2>
                <p>${main.excerpt}</p>
            </div>
        `;
    }

    const sideArea = document.getElementById('side-articles-area');
    if (sideArea) {
        sideArea.innerHTML = side.map(art => `
            <div class="side-card" onclick="navigate('uutinen', ${art.id})">
                <img src="${art.image}">
                <h4>${art.title}</h4>
            </div>
        `).join('');
    }
}

async function renderArchive() {
    const articles = await getArticles();
    const grid = document.getElementById('archive-grid');
    if (grid) {
        grid.innerHTML = articles.map(art => `
            <div class="news-card" onclick="navigate('uutinen', ${art.id})">
                <img src="${art.image}">
                <h3>${art.title}</h3>
            </div>
        `).join('');
    }
}

async function renderSingleArticle() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const articles = await getArticles();
    const article = articles.find(a => a.id == id);

    if (article) {
        document.title = article.title;
        const shareUrl = encodeURIComponent(window.location.href);
        const shareTitle = encodeURIComponent(article.title);

        const contentArea = document.getElementById('article-content');
        if (contentArea) {
            contentArea.innerHTML = `
                <img src="${article.image}" class="article-hero-img">
                <h1>${article.title}</h1>
                <div class="article-ingress">${article.excerpt}</div>
                <div class="article-body">${article.content}</div>
                <div class="article-author">Israel-katsaus/toimitus</div>
                <div class="share-box">
                    <p>JAA UUTINEN</p>
                    <div class="share-links">
                        <a href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}" target="_blank"><img src="images/facebook.png"></a>
                        <a href="https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareTitle}" target="_blank"><img src="images/x.png"></a>
                        <a href="https://api.whatsapp.com/send?text=${shareTitle}%20${shareUrl}" target="_blank"><img src="images/whatsapp.png"></a>
                    </div>
                    <div class="divider"></div>
                </div>
            `;
        }
    }

    const sidebarList = document.getElementById('latest-sidebar-list');
    if (sidebarList) {
        sidebarList.innerHTML = articles.slice(0, 8).map(art => `
            <div class="sidebar-item" onclick="navigate('uutinen', ${art.id})">
                <p>${art.title}</p>
            </div>
        `).join('');
    }
}
