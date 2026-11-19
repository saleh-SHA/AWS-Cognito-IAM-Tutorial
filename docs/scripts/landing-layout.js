(() => {
  const placeHero = () => {
    const hero = document.querySelector(".home-hero");
    const main = document.querySelector(".md-main");
    if (hero && main && hero.parentElement !== main) {
      main.insertBefore(hero, main.firstElementChild);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", placeHero, { once: true });
  } else {
    placeHero();
  }
})();
