class ECommerceApp {
  constructor() {
    this.product = null;
    this.products = [];
    this.selectedSize = null;
    this.cart = this.loadCart();
    this.init();
    this.currentImageIndex = 0;
  }

  async init() {
    try {
      await this.loadProduct();
      this.setupEventListeners();
      this.updateCartDisplay();
      this.displayBurgerMenu();
    } catch (error) {
      console.error("Erreur d'initialisation:", error);
      this.showError("Erreur de chargement du produit");
    }
  }

  async loadProduct() {
    try {
      const response = await fetch("data/product.json");
      const data = await response.json(); // on lit tout l'objet JSON
      this.products = data.products;
      this.product = this.products[0]; // on extrait le 1er produit du tableau
      console.log("Produit chargé :", this.product);
      this.displayAllProducts();
      // this.displayProduct();
    } catch (error) {
      throw new Error("Impossible de charger le produit");
    }
  }

  displayAllProducts() {
    const container = document.querySelector("#product-list");
    if (!container) return;

    container.innerHTML = ""; // vide le conteneur principal

    this.products.forEach((product) => {
      const card = document.createElement("div");
      card.className = "product-card";

      // Générer les options taille
      const optionsSizes = product.sizes
        .map((size) => {
          let text = size.name;
          if (size.priceModifier > 0) {
            text += ` (+${size.priceModifier}${product.currency})`;
          }
          if (size.stock === 0) {
            text += " - Rupture de stock";
          }
          return `<option value="${size.name}" ${
            size.stock === 0 ? "disabled" : ""
          }>${text}</option>`;
        })
        .join("");

      card.innerHTML = `
        <div class="product-images">
          <img class="product-image" src="${product.images[0]}" alt="${product.name}" />
        </div>
        <div class="product-info">
          <h1>${product.name}</h1>
          <p>${product.description}</p>
          <div class="price-display">
            <span id="price-${product.id}">${product.basePrice}${product.currency}</span>
          </div>
          <div class="size-selector">
            <label for="sizes-${product.id}">Taille :</label>
            <select id="sizes-${product.id}">
              <option value="">Choisir une taille</option>
              ${optionsSizes}
            </select>
          </div>
          <button id="add-to-cart-${product.id}" class="add-to-cart-btn" disabled>Ajouter au panier</button>

          <div id="cart-info-${product.id}" class="cart-info" style="display:none; margin-top: 10px;">
            <p>Panier : <span id="cart-count-${product.id}">0</span> article(s)</p>
            <button id="view-cart-${product.id}">Voir le panier</button>
          </div>
        </div>
      `;

      container.appendChild(card);

      // Setup listeners pour la taille + bouton "ajouter au panier"
      const selectSize = card.querySelector(`#sizes-${product.id}`);
      const addBtn = card.querySelector(`#add-to-cart-${product.id}`);
      const cartInfo = card.querySelector(`#cart-info-${product.id}`);
      const cartCountEl = card.querySelector(`#cart-count-${product.id}`);
      const viewCartBtn = card.querySelector(`#view-cart-${product.id}`);

      // Activer bouton Ajouter au panier si taille sélectionnée & en stock
      selectSize.addEventListener("change", (e) => {
        const selectedSize = e.target.value;
        if (!selectedSize) {
          addBtn.disabled = true;
          // Reset prix affiché au prix de base
          const priceEl = card.querySelector(`#price-${product.id}`);
          if (priceEl)
            priceEl.textContent = `${product.basePrice}${product.currency}`;
          return;
        }
        const sizeData = product.sizes.find((s) => s.name === selectedSize);
        if (sizeData && sizeData.stock > 0) {
          addBtn.disabled = false;
          // Mettre à jour prix affiché en fonction de la taille
          const totalPrice = product.basePrice + (sizeData.priceModifier || 0);
          const priceEl = card.querySelector(`#price-${product.id}`);
          if (priceEl) priceEl.textContent = `${totalPrice}${product.currency}`;
        } else {
          addBtn.disabled = true;
        }
      });

      // Ajouter au panier
      addBtn.addEventListener("click", () => {
        const selectedSize = selectSize.value;
        if (!selectedSize) {
          this.showError("Veuillez sélectionner une taille");
          return;
        }
        const sizeData = product.sizes.find((s) => s.name === selectedSize);
        if (!sizeData || sizeData.stock === 0) {
          this.showError("Cette taille n'est plus en stock");
          return;
        }

        // Créer l’item panier
        const cartItem = {
          productId: product.id,
          productName: product.name,
          size: selectedSize,
          price: product.basePrice + (sizeData.priceModifier || 0),
          quantity: 1,
          timestamp: Date.now(),
        };

        // Ajout ou mise à jour quantité dans this.cart
        const existingIndex = this.cart.findIndex(
          (item) =>
            item.productId === cartItem.productId && item.size === cartItem.size
        );

        if (existingIndex > -1) {
          this.cart[existingIndex].quantity += 1;
        } else {
          this.cart.push(cartItem);
        }

        this.saveCart();
        this.updateCartDisplay();

        // Afficher infos panier sous la carte (panier visible)
        if (cartInfo && cartCountEl) {
          const totalCount = this.cart.reduce(
            (total, item) => total + item.quantity,
            0
          );
          cartCountEl.textContent = totalCount;
          cartInfo.style.display = totalCount > 0 ? "block" : "none";
        }

        this.showSuccess("Produit ajouté au panier !");
        addBtn.disabled = true; // reset bouton (forcer re-choix taille)
        selectSize.value = ""; // reset sélection taille
        // reset prix affiché au prix de base
        const priceEl = card.querySelector(`#price-${product.id}`);
        if (priceEl)
          priceEl.textContent = `${product.basePrice}${product.currency}`;
      });

      // Voir le panier -> redirection globale vers cart.html
      if (viewCartBtn) {
        viewCartBtn.addEventListener("click", () => {
          window.location.href = "cart.html";
        });
      }

      // Initialiser affichage panier (masqué si vide)
      if (cartInfo && cartCountEl) {
        const totalCount = this.cart.reduce(
          (total, item) => total + item.quantity,
          0
        );
        cartCountEl.textContent = totalCount;
        cartInfo.style.display = totalCount > 0 ? "block" : "none";
      }
    });
  }

  changeImage(direction) {
    const total = this.product.images.length;
    this.currentImageIndex =
      (this.currentImageIndex + direction + total) % total;

    const imageEl = document.getElementById("product-image");
    if (imageEl instanceof HTMLImageElement) {
      imageEl.src = this.product.images[this.currentImageIndex];
      imageEl.alt = `${this.product.name} image ${this.currentImageIndex + 1}`;
    }
  }

  generateSizeOptions() {}

  addToCart() {}

  setupEventListeners() {}

  displayBurgerMenu() {
    const burger = document.querySelector(".burger");
    const navLeft = document.querySelector(".nav-left");
    const navRight = document.querySelector(".nav-right");
    const navContainer = document.querySelector(".nav-container");

    if (!burger || !navLeft || !navRight || !navContainer) return;

    burger.addEventListener("click", () => {
      const isActive = navLeft.classList.toggle("active");
      navRight.classList.toggle("active");
      burger.setAttribute("aria-expanded", isActive.toString());
      navContainer.classList.toggle("burger-active", isActive);
    });
  }
  // onSizeChange(sizeName) {
  //   this.selectedSize = sizeName;

  //   const priceEl = document.getElementById("product-price");
  //   const addToCartBtn = document.getElementById("add-to-cart");

  //   if (!priceEl || !(addToCartBtn instanceof HTMLButtonElement)) {
  //     console.error("Éléments requis manquants pour la mise à jour de taille"); // ✅
  //     return;
  //   }

  //   if (sizeName) {
  //     const sizeData = this.product.sizes.find((s) => s.name === sizeName);
  //     if (!sizeData) return;

  //     // Mettre à jour le prix affiché
  //     const totalPrice = this.product.basePrice + (sizeData.priceModifier || 0);
  //     priceEl.textContent = `${totalPrice}${this.product.currency}`;
  //     addToCartBtn.disabled = false;

  //     if (sizeData.stock === 0) {
  //       addToCartBtn.disabled = true;
  //       this.showError("Cette taille n'est plus en stock");
  //     }
  //   } else {
  //     priceEl.textContent = `${this.product.basePrice}${this.product.currency}`;
  //     addToCartBtn.disabled = true;
  //   }
  // }

  loadCart() {
    try {
      const cartData = localStorage.getItem("ecommerce_cart");
      return cartData ? JSON.parse(cartData) : [];
    } catch (error) {
      console.error("Erreur chargement panier:", error);
      return [];
    }
  }

  saveCart() {
    try {
      localStorage.setItem("ecommerce_cart", JSON.stringify(this.cart));
    } catch (error) {
      console.error("Erreur sauvegarde panier:", error);
    }
  }

  updateCartDisplay() {
    const cartCount = this.cart.reduce(
      (total, item) => total + item.quantity,
      0
    );

    const cartInfo = document.getElementById("cart-info");
    const cartCountEl = document.getElementById("cart-count");

    if (!cartInfo || !cartCountEl) {
      console.warn("Impossible de mettre à jour l'affichage du panier"); // ✅
      return;
    }

    if (cartCount > 0) {
      cartInfo.style.display = "block";
      cartCountEl.textContent = cartCount;
    } else {
      cartInfo.style.display = "none";
    }
  }

  showError(message) {
    this.showModal({
      title: "Erreur",
      message: message || "Oups, il y a un problème.",
    });
  }

  showSuccess(message) {
    this.showModal({
      title: "Dans le panier !",
      message: "Votre produit a bien été ajouté.",
    });
  }

  showModal({ title = "", message = "" }) {
    const modal = document.getElementById("custom-modal");
    const modalTitle = document.getElementById("modal-title");
    const modalMessage = document.getElementById("modal-message");
    if (modal && modalTitle && modalMessage) {
      modalTitle.textContent = title;
      modalMessage.textContent = message;
      modal.style.display = "flex";

      const closeBtn = modal.querySelector(".close-btn");
      if (closeBtn) {
        closeBtn.addEventListener("click", function () {
          modal.style.display = "none";
        });
      }
      window.onclick = function (event) {
        if (event.target === modal) {
          modal.style.display = "none";
        }
      };
    }
  }
}

// Démarrer l'application quand la page est chargée
// @ts-ignore
document.addEventListener("DOMContentLoaded", () => {
  /** @type {any} */ (window).ecommerceApp = new ECommerceApp();
});
