const screens = new Map();

export function registerScreens(selector = '.screen') {
  document.querySelectorAll(selector).forEach((el) => {
    screens.set(el.id, el);
  });
}

export function showScreen(id) {
  screens.forEach((el, key) => {
    el.classList.toggle('on', key === id);
  });
}
