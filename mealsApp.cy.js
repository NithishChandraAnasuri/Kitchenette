describe("template spec", () => {
  it("passes", () => {
    cy.visit("https://nithishchandraanasuri.github.io/MealsApp/");

    // cy.get("#search").type("Soup");
    cy.get("#search").type("Chicken");
    cy.get("button").click();
    cy.get(":nth-child(1) > a").click();
    cy.get(":nth-child(1) > .like-btn").click();
  });
});
