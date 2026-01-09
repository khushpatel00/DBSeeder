// DOM Elements
darkToggle = document.querySelector('#dark-toggle')
title = document.querySelector('.title');
menubtn = document.querySelector('.menubutton')
closebutton = document.querySelector('.closebutton')
anchors = document.querySelectorAll('.anchors');
dropzone = document.querySelector('#drop-zone');
zone = document.querySelector("[data-dragdrop]");


// global vars
isDark = false;

gsap.set('.showcontent-after', { opacity: 0 })
// events
darkToggle?.addEventListener('click', () => {
    document.querySelector('html').classList.toggle('dark');
    document.querySelector('.theme-icon-light').classList.toggle('hidden')
    document.querySelector('.theme-icon-dark').classList.toggle('hidden')
})


zone.addEventListener("dragenter", e => {
    if (e.dataTransfer?.types?.includes("Files")) {
        dragCounter++;
        zone.classList.add("drag-active");
    }
});

zone.addEventListener("dragover", e => {
    e.preventDefault();
});

zone.addEventListener("drop", e => {
    e.preventDefault();
    zone.classList.remove("drag-active");
    console.log(e.dataTransfer)
    const files = [...e.dataTransfer.files];
    console.log("Dropped files:", files);
});

titleText = title.innerHTML.split('')
title.innerHTML = '';
titleText?.forEach(letter => {
    title.innerHTML += `<div class="opacity-0">${letter}</div>`
});

gsap?.config({
    force3D: true,
    autoSleep: 60
});
gsap?.set('.title', { opacity: 1 })
gsap?.set('.title div', { opacity: 1 })
gsap?.from('.title div', {
    delay: 0.1,
    opacity: 0,
    y: -20,
    // scale: 0.5,
    stagger: 0.05,
    duration: 0.5,
    rotate: '-8'
})
gsap.to('.title', { scale: 1.2, duration: 1 })
// gsap?.to('.title div', {
//     opacity: 0,
//     y: 20,  
//     // delay: 0.15,
//     // scale: 0.5,
//     stagger: 0.08, 
//     duration: 0.5,
//     rotate: '2'
// })
gsap?.to('.title div', {
    delay: 1.5,
    duration: 0.5,
    y: -250,
    stagger: 0.01,
})
gsap.to('.title', {
    scale: 1,
    delay: 2.1,
})
gsap?.to('.showcontent-after', {
    opacity: 1,
    delay: 1.8,
    stagger: 0.2
})

menubtn.addEventListener('click', () => {
    gsap.set('#menu', { display: 'flex' })
    gsap.to('#menu', {
        opacity: 1
    })
})
closebutton.addEventListener('click', () => {
    gsap.to('#menu', {
        opacity: 0,
        display: 'none'
    })
})

anchors.forEach(element => {
    element.addEventListener('mouseover', () => {
        element.classList.add('text-black')
    })
    element.addEventListener('mouseleave', () => {
        element.classList.remove('text-black')
    })
});


text = `INSERT INTO users (id, name, email) VALUES
        (1, 'Alice Johnson', 'alice@gmail.com'),
        (2, 'Brian Smith', 'brian@yahoo.com'),
        (3, 'Carol White', 'carol@outlook.com');
        `

document.querySelector('code').innerHTML = text;