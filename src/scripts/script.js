// DOM Elements
darkToggle = document.querySelector('#dark-toggle');
title = document.querySelector('.title');
menubtn = document.querySelector('.menubutton');
closebutton = document.querySelector('.closebutton');
anchors = document.querySelectorAll('.anchors');
dropzone = document.querySelector('#drop-zone');
zone = document.querySelector("[data-dragdrop]");
generate = document.querySelector('#generate');

// global vars
isDark = false;
dragCounter = 0;

// events
darkToggle?.addEventListener('click', () => {
    document.querySelector('html').classList.toggle('dark');
    document.querySelector('.theme-icon-light').classList.toggle('hidden')
    document.querySelector('.theme-icon-dark').classList.toggle('hidden')
})


gsap.set('.showcontent-after', { opacity: 0 })

zone.addEventListener("dragenter", e => {
    if (e.dataTransfer?.types?.includes("Files")) {
        zone.classList.add("drag-active");
    }
});

zone.addEventListener("dragover", e => {
    e.preventDefault(); // mandatory
});

zone.addEventListener("drop", async e => {
    e.preventDefault();
    zone.classList.remove("drag-active");

    const files = [...e.dataTransfer.files];
    if (!files.length) return;

    // example: single-file handling
    const file = files[0];

    // metadata (free)
    const meta = {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
    };

    let content;

    // decision gate
    if (file.type.startsWith("text") || file.type === "application/json") {
        content = await file.text();           // TEXT MODE 📝
    } else {
        content = await file.arrayBuffer();    // BINARY MODE 🧬
    }

    // store wherever you want
    window.droppedFile = {
        meta,
        content
    };

    // console.log("File meta:", meta);
    console.log("File content:", content);
    document.querySelector('#textinput').value = content;
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
gsap.set('#menu', { display: 'none' })

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
function closemenu() {
    gsap.to('#menu', {
        opacity: 0,
        display: 'none'
    })
}
anchors.forEach(element => {
    element.addEventListener('mouseover', () => {
        element.classList.add('text-black')
    })
    element.addEventListener('mouseleave', () => {
        element.classList.remove('text-black')
    })
});


const codeEl = document.querySelector('code');
if (codeEl && !codeEl.textContent?.trim()) {
    codeEl.textContent = "Your generated SQL will appear here.";
}


document.querySelector('.credits').addEventListener('mouseover', () => {
    gsap.to('.credits-content ul li', {
        opacity: 1,
        y: -20,
        stagger: 0.08,
        delay: 0.1
    })
})
document.querySelector('.menucontent').addEventListener('mouseleave', () => {
    gsap.to('.credits-content ul li', {
        opacity: 0,
        y: 0,
        stagger: 0.08
    })
    gsap.to('.credits', {
        y: 0,
        duration: 0.1,
        ease: 'expo.out',
        delay: 0.5
    })
})

function copyContent() {
    navigator?.clipboard?.writeText(codeEl.textContent)
    console.log(codeEl.textContent)
    document.querySelector('.copytext span').textContent = 'Copied'
    setTimeout(() => {
        document.querySelector('.copytext span').textContent = 'Copy'
    }, 3000)
}