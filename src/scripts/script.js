// DOM Elements
darkToggle = document.querySelector('#dark-toggle')
title = document.querySelector('.title');
menubtn = document.querySelector('.menubutton')
closebutton = document.querySelector('.closebutton')

// global vars
isDark = false;

gsap.set('.showcontent-after', {opacity: 0})
// events
darkToggle?.addEventListener('click', () => {
    document.querySelector('html').classList.toggle('dark');
    document.querySelector('.theme-icon-light').classList.toggle('hidden')
    document.querySelector('.theme-icon-dark').classList.toggle('hidden')
})

titleText = title.innerHTML.split('')
title.innerHTML = '';
titleText?.forEach(letter => {
    title.innerHTML += `<div class="opacity-0">${letter}</div>`
});

gsap?.config({
    force3D: true,
    autoSleep: 60
});
gsap?.set('.title', {opacity: 1})
gsap?.set('.title div', {opacity: 1})
gsap?.from('.title div', {
    delay: 0.1,
    opacity: 0,
    y: -20, 
    // scale: 0.5,
    stagger: 0.05, 
    duration: 0.5,
    rotate: '-8'
})
gsap?.to('.title div', {
    opacity: 0,
    y: 20, 
    delay: 0.15,
    // scale: 0.5,
    stagger: 0.08, 
    duration: 0.5,
    rotate: '2'
})
gsap?.set('.title', {scale: '1'})
// gsap?.to('.title', {
//     display: 'none',
//     delay: 3.5,
// })
gsap?.to('.showcontent-after', {
    opacity: 1,
    delay: 0.7,
    stagger: 0.2
})

menubtn.addEventListener('click', ()=>{
    gsap.set('#menu', {display: 'flex'})
    gsap.from('#menu', {
        // opacity: 0,
        x: '-100%',
        duration: 0.5,
        ease: 'power4.in'
    })
})
closebutton.addEventListener('click', ()=>{
    gsap.to('#menu', {
        // opacity: 0,
        x: '-100%',
        duration: 0.5
    })
    // setTimeout(gsap.set('#menu', {display: 'none'}), 5000)
})
