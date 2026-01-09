/**
 * Inspiration -> https://hello.cuberto.com
 */

// console.clear();

import { vec2 } from "https://esm.sh/vecteur";

class Cursor {
	constructor(targetEl) {
		this.el = targetEl;

		this.position = {
			previous: vec2(-100, -100),
			current: vec2(-100, -100),
			target: vec2(-100, -100),
			lerpAmount: 0.1
		};
		this.scale = {
			previous: 1,
			current: 1,
			target: 1,
			lerpAmount: 0.1
		};

		this.isHovered = false;
		this.hoverEl = null;

		this.addListeners();
	}

	update() {
		this.position.current.lerp(this.position.target, this.position.lerpAmount);
		this.scale.current = gsap.utils.interpolate(
			this.scale.current,
			this.scale.target,
			this.scale.lerpAmount
		);

		const delta = this.position.current.clone().sub(this.position.previous);

		this.position.previous.copy(this.position.current);
		this.scale.previous = this.scale.current;

		gsap.set(this.el, {
			x: this.position.current.x,
			y: this.position.current.y
		});

		if (!this.isHovered) {
			const angle = Math.atan2(delta.y, delta.x) * (180 / Math.PI);
			const distance = Math.sqrt(delta.x * delta.x + delta.y * delta.y) * 0.04;

			gsap.set(this.el, {
				rotate: angle,
				scaleX: this.scale.current + Math.min(distance, 1),
				scaleY: this.scale.current - Math.min(distance, 0.3)
			});
		}
	}

	updateTargetPosition(x, y) {
		if (this.isHovered) {
			const bounds = this.hoverEl.getBoundingClientRect();

			const cx = bounds.x + bounds.width / 2;
			const cy = bounds.y + bounds.height / 2;

			const dx = x - cx;
			const dy = y - cy;

			this.position.target.x = cx + dx * 0.15;
			this.position.target.y = cy + dy * 0.15;
			this.scale.target = 2;

			const angle = Math.atan2(dy, dx) * (180 / Math.PI);
			const distance = Math.sqrt(dx * dx + dy * dy) * 0.01;

			gsap.set(this.el, { rotate: angle });
			gsap.to(this.el, {
				scaleX: this.scale.target + Math.pow(Math.min(distance, 0.6), 3) * 3,
				scaleY: this.scale.target - Math.pow(Math.min(distance, 0.3), 3) * 3,
				duration: 0.5,
				ease: "power4.out",
				overwrite: true
			});
		} else {
			this.position.target.x = x;
			this.position.target.y = y;
			this.scale.target = 1;
		}
	}

	addListeners() {
		gsap.utils.toArray("[data-hover]").forEach((hoverEl) => {
			// set hover states
			{
				const hoverBoundsEl = hoverEl.querySelector("[data-hover-bounds]");
				hoverBoundsEl.addEventListener("pointerover", () => {
					this.isHovered = true;
					this.hoverEl = hoverBoundsEl;
				});
				hoverBoundsEl.addEventListener("pointerout", () => {
					this.isHovered = false;
					this.hoverEl = null;
				});
			}

			// magnetic effect
			{
				const xTo = gsap.quickTo(hoverEl, "x", {
					duration: 1,
					ease: "elastic.out(1, 0.3)"
				});
				const yTo = gsap.quickTo(hoverEl, "y", {
					duration: 1,
					ease: "elastic.out(1, 0.3)"
				});

				hoverEl.addEventListener("pointermove", (event) => {
					const { clientX: cx, clientY: cy } = event;
					const { height, width, left, top } = hoverEl.getBoundingClientRect();
					const x = cx - (left + width / 2);
					const y = cy - (top + height / 2);
					xTo(x * 0.2);
					yTo(y * 0.2);
				});

				hoverEl.addEventListener("pointerout", () => {
					xTo(0);
					yTo(0);
				});
			}
		});
	}
}

const cursor = new Cursor(document.querySelector(".cursor"));

const menuBtn = document.querySelector(".menu-btn");

onResize();

function update() {
	cursor.update();
}

function onMouseMove(event) {
	const x = event.clientX;
	const y = event.clientY;

	cursor.updateTargetPosition(x, y);
}

function onResize() {
	const { x, y, width, height } = menuBtn.getBoundingClientRect();
}

gsap.ticker.add(update);
window.addEventListener("pointermove", onMouseMove);
window.addEventListener("resize", onResize);




// particle JS

particlesJS("particles-js", {
  "particles": {
    "number": {
      "value": 100,
      "density": {
        "enable": true,
        "value_area":1000
      }
    },
    "color": {
      "value": ["#aa73ff", "#f8c210", "#83d238", "#33b1f8"]
    },
    
    "shape": {
      "type": "circle",
      "stroke": {
        "width": 0,
        "color": "#fff"
      },
      "polygon": {
        "nb_sides": 5
      },
      "image": {
        "src": "img/github.svg",
        "width": 100,
        "height": 100
      }
    },
    "opacity": {
      "value": 0.6,
      "random": false,
      "anim": {
        "enable": false,
        "speed": 1,
        "opacity_min": 0.1,
        "sync": false
      }
    },
    "size": {
      "value": 2,
      "random": true,
      "anim": {
        "enable": false,
        "speed": 40,
        "size_min": 0.1,
        "sync": false
      }
    },
    "line_linked": {
      "enable": true,
      "distance": 120,
      "color": "#ffffff",
      "opacity": 0.4,
      "width": 1
    },
  },
  "interactivity": {
    "detect_on": "canvas",
    "events": {
      "onhover": {
        "enable": true,
        "mode": "grab"
      },
      "onclick": {
        "enable": false
      },
      "resize": true
    },
    "modes": {
      "grab": {
        "distance": 140,
        "line_linked": {
          "opacity": 1
        }
      },
      "bubble": {
        "distance": 400,
        "size": 40,
        "duration": 2,
        "opacity": 8,
        "speed": 3
      },
      "repulse": {
        "distance": 200,
        "duration": 0.4
      },
      "push": {
        "particles_nb": 4
      },
      "remove": {
        "particles_nb": 2
      }
    }
  },
  "retina_detect": true
});