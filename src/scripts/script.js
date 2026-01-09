// DOM Elements
darkToggle = document.querySelector('#dark-toggle')

// global vars
isDark = false;

// events
darkToggle.addEventListener('click', () => {
    document.querySelector('html').classList.toggle('dark');
})