//VARIABLES GLOBALES
// ------------------------------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer();
const scene = new THREE.Scene();

// Monitor de recursos y tiempo
const reloj = new THREE.Clock();
const stats = new Stats();

// VARIABLES PARA DETECCIÓN DE CAÍDAS
const raycaster = new THREE.Raycaster();
const vectorAbajo = new THREE.Vector3(0, -1, 0);  // Apunto hacia abajo para saber si me he caido

// Parámetros de movimiento del coche
const velocidadMax = 25; // Velocidad del coche
const velocidadGiro = Math.PI; 

// Teclas
const teclas = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};

let camera;
let cameraControls;
let pista;  // Elementos de la escena que vamos a animar o mover
let coche;
let ruedas = []; 

// Variables del HUD
let tiempoJugado = 0;
let contadorCaidas = 0;

let camaraLibre = false;  // Estado inicial: la cámara sigue al coche

// Fin variables globales
// ------------------------------------------------------------------------------------------------

//INIT()
// ------------------------------------------------------------------------------------------------
function init() {
    // Configurar el motor de render
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(new THREE.Color(0x000000)); 
    renderer.shadowMap.enabled = true; 
    document.getElementById('container').appendChild(renderer.domElement);

    // Crear y situar la cámara
    const aspectRatio = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000); 
    camera.position.set(0, 5, 10);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    cameraControls = new THREE.OrbitControls(camera, renderer.domElement);
    cameraControls.target.set(0, 0, 0);
    // LIMPIEZA: Inicialmente lo desactivamos para que siga al coche
    cameraControls.enabled = false; 

    // Monitor de estadísticas
    stats.showPanel(0);
    document.getElementById('container').appendChild(stats.domElement);

    window.addEventListener('resize', updateAspectRatio);

    crearLuces();
    crearFondoEspacial();
    crearPista();
    crearCoche();

    reloj.start();
    render();
}
// ------------------------------------------------------------------------------------------------

//Funciones para la funcionalidad del juego
// ------------------------------------------------------------------------------------------------
function crearLuces() {
    const luzAmbiental = new THREE.AmbientLight(0xffffff, 0.8); 
    scene.add(luzAmbiental);

    const luzDireccional = new THREE.DirectionalLight(0xffffff, 0.8);
    luzDireccional.position.set(50, 100, 50);
    scene.add(luzDireccional);
}

let fondoEspacial;
function crearFondoEspacial() {
    // Una esfera enorme
    const geometriaFondo = new THREE.SphereGeometry(500, 64, 64);
    const materialFondo = new THREE.MeshBasicMaterial({
        color: 0x050510,
        side: THREE.BackSide,  // Para ver el interior de la esfera
        wireframe: false
    });
    fondoEspacial = new THREE.Mesh(geometriaFondo, materialFondo);
    scene.add(fondoEspacial);
    crearEstrellas();
}

// Función extra para crear partículas simulando estrellas
function crearEstrellas() {
    const cantidadEstrellas = 10000;
    const geometriaEstrellas = new THREE.BufferGeometry();
    const posiciones = new Float32Array(cantidadEstrellas * 3);
    const coloresEstrellas = new Float32Array(cantidadEstrellas * 3);

    for(let i = 0; i < cantidadEstrellas * 3; i+=3) {
        const r = 300 + Math.random() * 200;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        
        posiciones[i] = Math.sin(phi) * Math.cos(theta) * r;
        posiciones[i+1] = Math.sin(phi) * Math.sin(theta) * r;
        posiciones[i+2] = Math.cos(phi) * r;
        
        coloresEstrellas[i] = 0.8 + Math.random() * 0.5;   
        coloresEstrellas[i+1] = 0.8 + Math.random() * 0.5; 
        coloresEstrellas[i+2] = 1.0;                      
    }

    geometriaEstrellas.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
    geometriaEstrellas.setAttribute('color', new THREE.BufferAttribute(coloresEstrellas, 3));

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.arc(32, 32, 30, 0, 2 * Math.PI);
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.5, 'rgba(200,220,255,0.9)');
    gradient.addColorStop(1, 'rgba(160,180,255,0)');
    ctx.fillStyle = gradient;
    ctx.fill();
    
    const texturaEstrella = new THREE.CanvasTexture(canvas);

    const materialEstrellas = new THREE.PointsMaterial({
        size: 1.5,
        map: texturaEstrella,
        vertexColors: true, 
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const estrellas = new THREE.Points(geometriaEstrellas, materialEstrellas);
    scene.add(estrellas);
}

function crearPista() {
    // Definir los "waypoints" o puntos clave del circuito.
    const puntos = [
        new THREE.Vector3(0, 0, 0),         
        new THREE.Vector3(30, 0, -20),      
        new THREE.Vector3(50, 5, -10),      
        new THREE.Vector3(40, 0, 30),       
        new THREE.Vector3(0, -5, 40),       
        new THREE.Vector3(-30, 0, 20),      
        new THREE.Vector3(-20, 0, -10)      
    ];

    // Curva que une todos los puntos
    // El true conecta el último con el primero
    const curva = new THREE.CatmullRomCurve3(puntos, true);
    
    // Un tubo que envuelve la curva  y luego lo aplastamos
    // Parámetros: curva, detalle, radio de la pista, segmentos radiales, cerrado
    const geometriaPista = new THREE.TubeGeometry(curva, 300, 6, 8, true);

    const texturaPista = crearTexturaArcoiris();
    texturaPista.wrapS = THREE.RepeatWrapping;
    texturaPista.repeat.set(30, 1); 

    const materialPista = new THREE.MeshLambertMaterial({
        map: texturaPista,
        side: THREE.DoubleSide
    });

    pista = new THREE.Mesh(geometriaPista, materialPista);

    // EL TRUCO MAGICO: Aplastar el tubo en el eje Y (vertical) 
    // para que deje de ser una tubería y pase a ser una pista de carreras plana.
    pista.scale.set(1, 0.01, 1); 
    scene.add(pista);
}

function updateAspectRatio() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
}

function crearCoche() {
    coche = new THREE.Group();

    // El chasis
    const geoChasis = new THREE.BoxGeometry(1, 0.5, 2);
    const matChasis = new THREE.MeshPhongMaterial({ color: 0x00ffff }); 
    const chasis = new THREE.Mesh(geoChasis, matChasis);
    coche.add(chasis);

    // La cabina
    const geoCabina = new THREE.BoxGeometry(0.8, 0.4, 0.8);
    const matCabina = new THREE.MeshPhongMaterial({ color: 0x222222 });
    const cabina = new THREE.Mesh(geoCabina, matCabina);
    cabina.position.set(0, 0.4, 0.2);
    coche.add(cabina);

    // LLANTAS: Añadimos un pequeño detalle blanco a la rueda negra
    const geoRueda = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16);
    geoRueda.rotateZ(Math.PI / 2); 
    const matRueda = new THREE.MeshPhongMaterial({ color: 0x333333 });
    
    // El "tapacubos" blanco para ver el giro
    const geoLlanta = new THREE.BoxGeometry(0.05, 0.4, 0.1); 
    const matLlanta = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Posiciones relativas al centro del coche (X, Y, Z)
    const posicionesRuedas = [
        [0.6, -0.2, 0.8],  
        [-0.6, -0.2, 0.8], 
        [0.6, -0.2, -0.8], 
        [-0.6, -0.2, -0.8] 
    ];

    ruedas = []; 
    posicionesRuedas.forEach(pos => {
        const rueda = new THREE.Group(); // Ahora la rueda es un grupo que contiene el neumático y la llanta
        
        const neumatico = new THREE.Mesh(geoRueda, matRueda);
        rueda.add(neumatico);
        
        const llanta = new THREE.Mesh(geoLlanta, matLlanta);
        // Movemos la llanta un poco hacia afuera dependiendo de qué lado esté
        llanta.position.x = pos[0] > 0 ? 0.11 : -0.11; 
        rueda.add(llanta);

        rueda.position.set(pos[0], pos[1], pos[2]);
        coche.add(rueda);
        ruedas.push(rueda); 
    });

    //Luces
    const luzNeon = new THREE.PointLight(0x00ffff, 0.8, 8);
    luzNeon.position.set(0, -0.5, 0); 
    coche.add(luzNeon);

    const faro = new THREE.SpotLight(0xffeedd, 0.5, 30, Math.PI / 4, 0.3, 1);
    faro.position.set(0, 0.5, 1); 
    const objetivoFaro = new THREE.Object3D();
    objetivoFaro.position.set(0, 0.5, 10); 
    coche.add(objetivoFaro);
    faro.target = objetivoFaro;
    coche.add(faro);

    coche.position.set(0, 0.5, 0); 
    coche.rotation.set(0, 90, 0);

    scene.add(coche);
}

function crearTexturaArcoiris() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#111133';
    ctx.fillRect(0, 0, 512, 128);
    
    const colores = ['#ff0000', '#ff7700', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3'];
    const anchoLinea = canvas.width / colores.length;
    
    colores.forEach((color, i) => {
        ctx.fillStyle = color;
        ctx.fillRect(i * anchoLinea, 0, anchoLinea, canvas.height);

        // Añadir brillo central (efecto neón)
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, 'white');
        gradient.addColorStop(0.4, color);
        gradient.addColorStop(0.6, color);
        gradient.addColorStop(1, 'white');
        ctx.fillStyle = gradient;
        ctx.fillRect(i * anchoLinea, 0, anchoLinea, canvas.height);
    });
    
    return new THREE.CanvasTexture(canvas);
}
// Fin funciones de creación de elementos
// ------------------------------------------------------------------------------------------------

//Funciones básicas del juego
// ------------------------------------------------------------------------------------------------
function update() {
    const delta = reloj.getDelta();
    stats.update();

    tiempoJugado += delta;
    if(document.getElementById('tiempoHUD')) {
        document.getElementById('tiempoHUD').innerText = tiempoJugado.toFixed(1);
    }

    if (coche) {
        if (teclas.ArrowLeft) coche.rotation.y += velocidadGiro * delta; 
        if (teclas.ArrowRight) coche.rotation.y -= velocidadGiro * delta; 
        
        if (teclas.ArrowUp){ 
            coche.translateZ(velocidadMax * delta);  
            // Llantas
            ruedas.forEach(r => r.rotation.x -= velocidadMax * delta * 2); 
        }
        if (teclas.ArrowDown){ 
            coche.translateZ(-velocidadMax * delta); 
            ruedas.forEach(r => r.rotation.x += velocidadMax * delta * 2);
        }
        // Posicionamos el origen del láser un poquito por encima del centro del coche
        const origenRayo = coche.position.clone();
        origenRayo.y += 1; 
        raycaster.set(origenRayo, vectorAbajo);
        const intersecciones = raycaster.intersectObject(pista);

        // Si la lista de intersecciones está vacía (longitud 0), no hay suelo debajo
        if (intersecciones.length === 0) {
            coche.position.set(0, 0.5, 0);
            coche.rotation.set(0, 90, 0);
            
            contadorCaidas++;
            if(document.getElementById('caidasHUD')) {
                document.getElementById('caidasHUD').innerText = contadorCaidas;
            }
        }
    }

    // Lógica de cámara correcta
    if (camaraLibre) {
        if (cameraControls) cameraControls.update();
    } else {
        if (coche) {
            const offset = new THREE.Vector3(0, 4, -7); 
            offset.applyQuaternion(coche.quaternion); 
            offset.add(coche.position); 

            camera.position.lerp(offset, 0.1); 
            camera.lookAt(coche.position);
        }
    }
}

function render() {
    requestAnimationFrame(render);
    update();                      
    renderer.render(scene, camera);
}
// Fin funciones básicas del juego
// ------------------------------------------------------------------------------------------------

window.addEventListener('keydown', (event) => {
    if (teclas.hasOwnProperty(event.code)) {
        teclas[event.code] = true;
    }
    
    if (event.code === 'KeyV') {
        camaraLibre = !camaraLibre; 
        cameraControls.enabled = camaraLibre;
        
        // Si volvemos a la cámara libre, actualizamos el target al coche
        if(camaraLibre && coche) {
            cameraControls.target.copy(coche.position);
        }
    }
});

window.addEventListener('keyup', (event) => {
    if (teclas.hasOwnProperty(event.code)) {
        teclas[event.code] = false;
    }
});

init();