document
  .getElementById("search")
  .addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
      searchMeals();
    }
  });

async function searchMeals() {
  const query = document.getElementById("search").value.trim();
  const mealsContainer = document.getElementById("meals");

  mealsContainer.innerHTML = "<p>Loading...</p>";

  try {
    const response = await fetch(
      `https://www.themealdb.com/api/json/v1/1/search.php?s=${query}`
    );
    const data = await response.json();

    if (data.meals) {
      mealsContainer.innerHTML = "";
      data.meals.forEach((meal) => {
        const mealDiv = document.createElement("div");
        mealDiv.className = "meal";
        mealDiv.innerHTML = `
                                <img src="${meal.strMealThumb}" alt="${meal.strMeal}">
                                <h2>${meal.strMeal}</h2>
                                <p><strong>Category:</strong> ${meal.strCategory}</p>
                                <p><strong>Area:</strong> ${meal.strArea}</p>
                                <a href="${meal.strYoutube}" target="_blank">Watch Recipe Video</a>
                                <button class="like-btn" onclick="toggleLike(this)">&hearts;</button>
                            `;
        mealsContainer.appendChild(mealDiv);
      });
    } else {
      mealsContainer.innerHTML =
        "<p>No meals found. Try a different search!</p>";
    }
  } catch (error) {
    console.error("Error fetching meals:", error);
    mealsContainer.innerHTML =
      "<p>Error fetching meals. Please try again later.</p>";
  }
}

function toggleLike(button) {
  button.classList.toggle("liked");
}
