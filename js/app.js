class ECommerceApp {
  constructor() {
    this.product = null;
    this.selectedSize = null;
    this.cart = this.loadCart();
    this.init();
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
      console.log("Produit chargé :", this.product);
      this.product = await response.json();
      this.displayProduct();
    } catch (error) {
      throw new Error("Impossible de charger le produit");
    }
  }

  displayProduct() {
    // Afficher les informations de base
    const nameEl = document.getElementById("product-name");
    if (nameEl) nameEl.textContent = this.product.name;
    const descEl = document.getElementById("product-description");
    if (descEl) descEl.textContent = this.product.description;
    const priceEl = document.getElementById("product-price");
    if (priceEl)
      priceEl.textContent = `${this.product.basePrice}${this.product.currency}`;

    // Afficher la première image
    const imageEl = document.getElementById("product-image");
    if (imageEl instanceof HTMLImageElement && this.product.images.length > 0) {
      imageEl.src = this.product.images[0];
      imageEl.alt = this.product.name;
    }

    // Générer les options de taille
    this.generateSizeOptions();
  }

  generateSizeOptions() {
    const sizesSelect = document.getElementById("sizes");
    if (!sizesSelect) {
      console.error("Element #sizes introuvable"); // ✅ Log d'erreur utile
      return;
    }

    // Réinitialiser les options existantes
    sizesSelect.innerHTML = '<option value="">Choisir une taille</option>';

    // Insérer dynamiquement chaque taille du JSON
    this.product.sizes.forEach((size) => {
      const option = document.createElement("option");

      // Attribuer la valeur et le texte de base
      option.value = size.name;
      option.textContent = size.name;

      // Ajouter le supplément de prix si > 0
      if (size.priceModifier > 0) {
        option.textContent += ` (+${size.priceModifier}${this.product.currency})`;
      }

      // Désactiver l'option si la taille est en rupture de stock
      if (size.stock === 0) {
        option.disabled = true;
        option.textContent += " - Rupture de stock";
      }

      // Ajouter l'option générée au menu déroulant
      sizesSelect.appendChild(option);
    });
  }

  setupEventListeners() {
    // Sélection de taille
    const sizeSelect = document.getElementById("sizes");
    if (sizeSelect) {
      sizeSelect.addEventListener("change", (e) => {
        const target = e.target;
        if (target instanceof HTMLSelectElement)
          this.onSizeChange(target.value);
      });
    }

    // Ajouter au panier
    const addToCartBtn = document.getElementById("add-to-cart");
    if (addToCartBtn instanceof HTMLButtonElement) {
      addToCartBtn.addEventListener("click", () => {
        this.addToCart();
      });
    }
    // Voir le panier
    const viewCartBtn = document.getElementById("view-cart");
    if (viewCartBtn instanceof HTMLButtonElement) {
      viewCartBtn.addEventListener("click", () => {
        this.showCart();
      });
    }
  }
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
  onSizeChange(sizeName) {
    this.selectedSize = sizeName;

    const priceEl = document.getElementById("product-price");
    const addToCartBtn = document.getElementById("add-to-cart");

    if (!priceEl || !(addToCartBtn instanceof HTMLButtonElement)) {
      console.error("Éléments requis manquants pour la mise à jour de taille"); // ✅
      return;
    }

    if (sizeName) {
      const sizeData = this.product.sizes.find((s) => s.name === sizeName);
      if (!sizeData) return;

      // Mettre à jour le prix affiché
      const totalPrice = this.product.basePrice + (sizeData.priceModifier || 0);
      priceEl.textContent = `${totalPrice}${this.product.currency}`;
      addToCartBtn.disabled = false;

      if (sizeData.stock === 0) {
        addToCartBtn.disabled = true;
        this.showError("Cette taille n'est plus en stock");
      }
    } else {
      priceEl.textContent = `${this.product.basePrice}${this.product.currency}`;
      addToCartBtn.disabled = true;
    }
  }

  addToCart() {
    if (!this.selectedSize) {
      this.showError("Veuillez sélectionner une taille");
      return;
    }

    const sizeData = this.product.sizes.find(
      (s) => s.name === this.selectedSize
    );

    // Vérifier le stock
    if (sizeData.stock === 0) {
      this.showError("Cette taille n'est plus en stock");
      return;
    }

    // Créer l'item du panier
    const cartItem = {
      productId: this.product.id,
      productName: this.product.name,
      size: this.selectedSize,
      price: this.product.basePrice + (sizeData.priceModifier || 0),
      quantity: 1,
      timestamp: Date.now(),
    };

    // Vérifier si l'item existe déjà
    const existingItemIndex = this.cart.findIndex(
      (item) =>
        item.productId === cartItem.productId && item.size === cartItem.size
    );

    if (existingItemIndex > -1) {
      // Augmenter la quantité
      this.cart[existingItemIndex].quantity += 1;
    } else {
      // Ajouter nouvel item
      this.cart.push(cartItem);
    }

    this.saveCart();
    this.updateCartDisplay();
    this.showSuccess("Produit ajouté au panier !");
  }

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

  showCart() {
    if (this.cart.length === 0) {
      alert("Votre panier est vide");
      return;
    }

    let cartHTML = "VOTRE PANIER:\n\n";
    let total = 0;

    this.cart.forEach((item) => {
      const itemTotal = item.price * item.quantity;
      total += itemTotal;
      cartHTML += `${item.productName} - Taille ${item.size}\n`;
      cartHTML += `Quantité: ${item.quantity} x ${item.price}€ = ${itemTotal}€\n\n`;
    });

    cartHTML += `TOTAL: ${total}€`;
    alert(cartHTML);
  }

  showError(message) {
    // Simple alert pour commencer, vous pouvez améliorer plus tard
    alert("Erreur: " + message);
  }

  showSuccess(message) {
    // Simple alert pour commencer, vous pouvez améliorer plus tard
    alert(message);
  }
}

// Démarrer l'application quand la page est chargée
// @ts-ignore
document.addEventListener("DOMContentLoaded", () => {
  /** @type {any} */ (window).ecommerceApp = new ECommerceApp();
});
