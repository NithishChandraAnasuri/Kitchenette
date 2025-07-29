const mealsContainer = document.getElementById("meals-container");
const searchBtn = document.getElementById("search-btn");
const searchInput = document.getElementById("search-input");
const randomBtn = document.getElementById("random-btn");
const favoritesBtn = document.getElementById("favorites-btn");
const favoritesModal = document.getElementById("favorites-modal");
const closeFavoritesModal = document.getElementById("close-favorites-modal");
const favoritesList = document.getElementById("favorites-list");
const noFavoritesMessage = document.getElementById("no-favorites-message");
const categoryBtns = document.querySelectorAll(".category-btn");

const recipeModal = document.getElementById("recipe-modal");
const recipeModalContent = document.getElementById("recipe-modal-content");
const messageArea = document.getElementById("message-area");

let currentMeals = [];
let currentIndex = 0;

// Fetch meals by search
async function fetchMeals(search) {
  const res = await fetch(
    `https://www.themealdb.com/api/json/v1/1/search.php?s=${search}`
  );
  const data = await res.json();
  return data.meals || [];
}

// Fetch random meal
async function fetchRandomMeal() {
  const res = await fetch(`https://www.themealdb.com/api/json/v1/1/random.php`);
  const data = await res.json();
  return data.meals ? data.meals[0] : null;
}

// Render meals
function renderMeals(meals) {
  mealsContainer.innerHTML = "";
  if (meals.length === 0) {
    messageArea.textContent = "No meals found.";
    return;
  }
  messageArea.textContent = "";
  currentMeals = meals;
  currentIndex = 0;
  meals.forEach((meal, index) => {
    const card = document.createElement("div");
    card.className =
      "bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden cursor-pointer relative";
    card.innerHTML = `
      <img src="${meal.strMealThumb}" alt="${
      meal.strMeal
    }" class="w-full h-48 object-cover" />
      <div class="p-4">
        <h3 class="text-lg font-semibold text-gray-800">${meal.strMeal}</h3>
        <p class="text-sm text-gray-600">${meal.strCategory || ""}</p>
      </div>
      <button class="absolute top-2 right-2 text-xl text-gray-300 hover:text-red-500 favorite-toggle" data-id="${
        meal.idMeal
      }">
        <i class="fa-regular fa-heart"></i>
      </button>
    `;
    card.addEventListener("click", () => openRecipeModal(meal));
    mealsContainer.appendChild(card);
  });

  updateFavoriteIcons();
}

// Search
searchBtn.addEventListener("click", async () => {
  const val = searchInput.value.trim();
  if (val) {
    const meals = await fetchMeals(val);
    renderMeals(meals);
  }
});

// Add this new event listener for the 'Enter' key
searchInput.addEventListener("keyup", async (event) => {
  if (event.key === "Enter") {
    const val = searchInput.value.trim();
    if (val) {
      const meals = await fetchMeals(val);
      renderMeals(meals);
    }
  }
});

// Random
randomBtn.addEventListener("click", async () => {
  const meal = await fetchRandomMeal();
  if (meal) renderMeals([meal]);
});

// Category click with special case handling
categoryBtns.forEach((btn) => {
  btn.addEventListener("click", async () => {
    const cat = btn.dataset.category.toLowerCase();
    let meals = [];

    if (["breakfast", "dessert", "vegetarian", "vegan"].includes(cat)) {
      // Use filter by category endpoint
      const res = await fetch(
        `https://www.themealdb.com/api/json/v1/1/filter.php?c=${
          cat[0].toUpperCase() + cat.slice(1)
        }`
      );
      const data = await res.json();
      if (data.meals) {
        // Lookup full meal details
        meals = await Promise.all(
          data.meals.slice(0, 10).map(async (meal) => {
            const res = await fetch(
              `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${meal.idMeal}`
            );
            const detail = await res.json();
            return detail.meals[0];
          })
        );
      }
    } else if (cat === "gluten-free") {
      // Search for common gluten-free keywords or ingredients
      const keywords = ["chicken", "salad", "rice", "fish", "vegetable"]; // Example keywords
      for (const keyword of keywords) {
        const fetchedMeals = await fetchMeals(keyword);
        meals = meals.concat(
          fetchedMeals.filter(
            (m) =>
              !(
                m.strCategory && m.strCategory.toLowerCase().includes("pasta")
              ) && // Exclude common gluten-containing categories
              !(
                m.strInstructions &&
                m.strInstructions.toLowerCase().includes("flour")
              ) // Exclude recipes explicitly using flour
          )
        );
        if (meals.length >= 10) break; // Limit the number of results
      }
      meals = [
        ...new Map(meals.map((item) => [item["idMeal"], item])).values(),
      ]; // Remove duplicates
      meals = meals.slice(0, 10); // Take top 10 unique meals
    } else if (cat === "quick & easy") {
      // Search for meals that often imply quick preparation or common "easy" ingredients
      const keywords = ["chicken", "salad", "omelette", "soup", "stir fry"]; // Example keywords
      for (const keyword of keywords) {
        const fetchedMeals = await fetchMeals(keyword);
        meals = meals.concat(fetchedMeals);
        if (meals.length >= 10) break;
      }
      meals = [
        ...new Map(meals.map((item) => [item["idMeal"], item])).values(),
      ];
      meals = meals.slice(0, 10);
    } else if (["lunch", "dinner"].includes(cat)) {
      // For Lunch/Dinner, search broad categories or popular meals
      // Note: TheMealDB doesn't have explicit "lunch" or "dinner" categories
      const searchCategories = ["beef", "chicken", "pork", "seafood"]; // Broad meal categories for lunch/dinner
      for (const searchCat of searchCategories) {
        const res = await fetch(
          `https://www.themealdb.com/api/json/v1/1/filter.php?c=${searchCat}`
        );
        const data = await res.json();
        if (data.meals) {
          // Lookup full meal details for the first few results
          const detailedMeals = await Promise.all(
            data.meals.slice(0, 3).map(async (meal) => {
              // Get a few from each category
              const detailRes = await fetch(
                `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${meal.idMeal}`
              );
              const detailData = await detailRes.json();
              return detailData.meals[0];
            })
          );
          meals = meals.concat(detailedMeals);
        }
        if (meals.length >= 10) break;
      }
      meals = [
        ...new Map(meals.map((item) => [item["idMeal"], item])).values(),
      ];
      meals = meals.slice(0, 10);
    }

    renderMeals(meals);
  });
});

// Open recipe modal
function openRecipeModal(meal) {
  recipeModal.classList.remove("hidden");
  recipeModalContent.innerHTML = `
    <div class="p-6">
      <h2 class="text-2xl font-bold mb-2">${meal.strMeal}</h2>
      <img src="${meal.strMealThumb}" class="w-full rounded mb-4" />
      <p class="text-gray-700 mb-4"><strong>Category:</strong> ${
        meal.strCategory
      } | <strong>Area:</strong> ${meal.strArea}</p>
      <p class="text-gray-800 whitespace-pre-wrap mb-4">${
        meal.strInstructions
      }</p>
      ${
        meal.strYoutube
          ? `<a href="${meal.strYoutube}" target="_blank" class="text-blue-500 underline">Watch on YouTube</a>`
          : ""
      }
    </div>
  `;
}

// Close modal on background click or swipe down
recipeModal.addEventListener("click", (e) => {
  if (e.target === recipeModal) {
    recipeModal.classList.add("hidden");
  }
});

// Swipe left/right for meals
let touchStartX = 0;
let touchEndX = 0;
mealsContainer.addEventListener("touchstart", (e) => {
  touchStartX = e.changedTouches[0].screenX;
});
mealsContainer.addEventListener("touchend", (e) => {
  touchEndX = e.changedTouches[0].screenX;
  handleSwipe();
});

function handleSwipe() {
  if (currentMeals.length === 0) return;
  if (touchEndX < touchStartX - 50) {
    // swipe left
    currentIndex = (currentIndex + 1) % currentMeals.length;
  } else if (touchEndX > touchStartX + 50) {
    // swipe right
    currentIndex =
      (currentIndex - 1 + currentMeals.length) % currentMeals.length;
  } else return;

  renderMeals([currentMeals[currentIndex]]);
}

// Swipe down to close modal
let touchStartY = 0;
recipeModal.addEventListener("touchstart", (e) => {
  touchStartY = e.touches[0].clientY;
});
recipeModal.addEventListener("touchend", (e) => {
  const touchEndY = e.changedTouches[0].clientY;
  if (touchEndY - touchStartY > 100) {
    recipeModal.classList.add("hidden");
  }
});

// Favorites
function getFavorites() {
  return JSON.parse(localStorage.getItem("favorites") || "[]");
}
function saveFavorite(idMeal) {
  const favs = getFavorites();
  if (!favs.includes(idMeal)) {
    favs.push(idMeal);
    localStorage.setItem("favorites", JSON.stringify(favs));
  }
}
function removeFavorite(idMeal) {
  const favs = getFavorites().filter((id) => id !== idMeal);
  localStorage.setItem("favorites", JSON.stringify(favs));
}
function isFavorite(idMeal) {
  return getFavorites().includes(idMeal);
}
function updateFavoriteIcons() {
  document.querySelectorAll(".favorite-toggle").forEach((btn) => {
    const id = btn.dataset.id;
    const icon = btn.querySelector("i");
    if (isFavorite(id)) {
      icon.classList.remove("fa-regular");
      icon.classList.add("fa-solid", "text-red-500");
    } else {
      icon.classList.add("fa-regular");
      icon.classList.remove("fa-solid", "text-red-500");
    }
    btn.onclick = (e) => {
      e.stopPropagation();
      if (isFavorite(id)) {
        removeFavorite(id);
      } else {
        saveFavorite(id);
      }
      updateFavoriteIcons();
    };
  });
}

// Show favorites modal
favoritesBtn.addEventListener("click", async () => {
  const favIds = getFavorites();
  if (favIds.length === 0) {
    noFavoritesMessage.classList.remove("hidden");
    favoritesList.innerHTML = "";
  } else {
    noFavoritesMessage.classList.add("hidden");
    favoritesList.innerHTML = "";

    for (const id of favIds) {
      const res = await fetch(
        `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`
      );
      const data = await res.json();
      const meal = data.meals[0];
      const div = document.createElement("div");
      div.className =
        "bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden";
      div.innerHTML = `
        <img src="${meal.strMealThumb}" class="w-full h-40 object-cover" />
        <div class="p-4">
          <h3 class="text-lg font-bold">${meal.strMeal}</h3>
          <p class="text-sm text-gray-600">${meal.strCategory}</p>
        </div>
      `;
      div.addEventListener("click", () => openRecipeModal(meal));
      favoritesList.appendChild(div);
    }
  }
  favoritesModal.classList.remove("hidden");
});

closeFavoritesModal.addEventListener("click", () => {
  favoritesModal.classList.add("hidden");
});

randomBtn.addEventListener("click", async () => {
  // Animate the button (rotate + scale)
  gsap.fromTo(
    randomBtn,
    { rotate: 0, scale: 1 },
    { rotate: 360, scale: 1.2, duration: 0.5, ease: "back.out(2)" }
  );

  const meal = await fetchRandomMeal();
  if (meal) {
    renderMeals([meal]);

    // Animate the new card appearance
    const card = mealsContainer.querySelector("div");
    gsap.fromTo(
      card,
      { y: 50, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, ease: "power2.out" }
    );
  }
});
const floatContainer = document.getElementById("float-icons");

const icons = ["🥦", "🍕", "🍅", "🍳", "🍇", "🍔", "🥕", "🍗"];

for (let i = 0; i < 10; i++) {
  const el = document.createElement("div");
  el.className = "absolute text-3xl opacity-30";
  el.innerText = icons[Math.floor(Math.random() * icons.length)];
  el.style.left = Math.random() * 100 + "vw";
  el.style.top = Math.random() * 100 + "vh";
  floatContainer.appendChild(el);

  gsap.to(el, {
    y: -100,
    x: "+=" + (Math.random() * 100 - 50),
    duration: 15 + Math.random() * 5,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
  });
}

randomBtn.addEventListener("mouseenter", () => {
  gsap.to(randomBtn, { scale: 1.05, duration: 0.2 });
});
randomBtn.addEventListener("mouseleave", () => {
  gsap.to(randomBtn, { scale: 1, duration: 0.2 });
});
