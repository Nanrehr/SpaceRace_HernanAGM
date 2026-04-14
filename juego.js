//VARIABLES GLOBALES
// ------------------------------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer();
const scene = new THREE.Scene();

const reloj = new THREE.Clock();
const stats = new Stats();

const raycaster = new THREE.Raycaster();
const vectorAbajo = new THREE.Vector3(0, -1, 0);  

// Parámetros de movimiento del coche
const velocidadBase = 25; 
let velocidadActual = velocidadBase; 
const velocidadGiro = Math.PI; 
let tiempoBoost = 0; // Temporizador para el acelerador

const teclas = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};

let camera;
let cameraControls;
let pista;  
let coche;
let ruedas = []; 
let juegoIniciado = false;  // Controla si estamos en el menú
let estadoCaida = false;   // Controla la animación de caída

let tiempoJugado = 0;
let contadorCaidas = 0;
let camaraLibre = false;  // Estado inicial: la cámara sigue al coche  

const particulas = []; 
let luzTurbo;

let puntoReaparicion = new THREE.Vector3(0, 0.5, 0); // Empieza en la salida
let rotacionReaparicion = 90 * Math.PI / 180;        // Empieza mirando hacia el eje Z
let timerCaida = null; // Guardará el temporizador de respawn

const checkpoints = [];
const aceleradores = [];
const vallas = [];
const puntos = [];

let curvaPista; // Declárala global (quita el 'curvaPista =' implícito de crearPista)
let meta = null;
let contadorVueltas = 0;
let checkpointsPasadosEstaVuelta = [false, false, false];
const coloresOriginalesCP = [0xffff00, 0xff8800, 0xff00ff];
let indiceSiguienteCheckpoint = 0;
let vueltaActual = 1;
const TOTAL_VUELTAS = 3;

// --- OPTIMIZACIÓN DE PARTÍCULAS ---
const geoParticulaBase = new THREE.SphereGeometry(0.15, 5, 5);
const matHumo = new THREE.MeshPhongMaterial({ color: 0xcccccc, transparent: true, opacity: 0.9, emissive: 0x222222 });
const matFuego = new THREE.MeshPhongMaterial({ color: 0xff6600, transparent: true, opacity: 0.9, emissive: 0xff4400 });

// --- MINIMAPA ---
let cameraTop;                     // Cámara ortográfica para el minimapa
let minimapCameraHeight = 120;      // Altura a la que sobrevuela la pista
let minimapCameraSize = 25;        // Tamaño del área visible (ajústalo según el tamaño de tu pista)
let rendererMinimap;
// ---------------

// Fin variables globales
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
    cameraControls.enabled = false; 

    // --- CÁMARA DEL MINIMAPA (OrthographicCamera) ---
    cameraTop = new THREE.OrthographicCamera(
        -minimapCameraSize,  // left
        minimapCameraSize,   // right
        minimapCameraSize,   // top
        -minimapCameraSize,  // bottom
        1,                   // near
        200                  // far
    );
    cameraTop.position.set(0, minimapCameraHeight, 0);
    cameraTop.lookAt(0, 0, 0);
    cameraTop.up.set(0, 0, -1); // ¡IMPORTANTE! Para que el Norte sea el eje Z positivo (típico en mapas top-down)
    cameraTop.updateProjectionMatrix();
    
    // Segundo renderer para el minimapa circular
    rendererMinimap = new THREE.WebGLRenderer({ 
        canvas: document.getElementById('minimap-canvas'),
        alpha: true 
    });
    rendererMinimap.setSize(280, 280);
    rendererMinimap.setClearColor(0x111122, 1);
    
    // Monitor de estadísticas
    stats.showPanel(0);
    document.getElementById('container').appendChild(stats.domElement);
    stats.dom.style.position = 'absolute';
    stats.dom.style.bottom = '10px';
    stats.dom.style.right = '10px';
    stats.dom.style.top = 'auto';
    stats.dom.style.left = 'auto';

    window.addEventListener('resize', updateAspectRatio);

    crearLuces();
    crearFondoEspacial();
    crearPista();
    crearInteractuables();
    crearCoche();

    document.getElementById('btnJugar').addEventListener('click', () => {
        document.getElementById('menuInicio').style.display = 'none'; 
        document.getElementById('hud').style.display = 'block';       
        juegoIniciado = true;
        reloj.start(); 
    });

    reloj.start();
    render();
}

//Funciones para la funcionalidad del juego
// ------------------------------------------------------------------------------------------------
function crearMeta() {
    const punto   = curvaPista.getPointAt(0);
    const tangente = curvaPista.getTangentAt(0);

    const texMeta = crearTexturaAjedrez();
    const geoMeta = new THREE.TorusGeometry(7, 0.5, 16, 100);
    const matMeta = new THREE.MeshPhongMaterial({ map: texMeta });
    meta = new THREE.Mesh(geoMeta, matMeta);

    meta.position.set(punto.x, 1, punto.z);

    const tangente2D = new THREE.Vector3(tangente.x, 0, tangente.z).normalize();
    meta.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangente2D);

    meta.tocada = false;
    scene.add(meta);
}

function crearTexturaAjedrez() {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const tam = 32;
    for (let x = 0; x < 8; x++) {
        for (let y = 0; y < 8; y++) {
            ctx.fillStyle = (x + y) % 2 === 0 ? '#ffffff' : '#000000';
            ctx.fillRect(x * tam, y * tam, tam, tam);
        }
    }
    return new THREE.CanvasTexture(canvas);
}

function crearLuces() {
    const luzAmbiental = new THREE.AmbientLight(0xffffff, 0.3); 
    scene.add(luzAmbiental);

    const luzDireccional = new THREE.DirectionalLight(0xffffff, 0.6);
    luzDireccional.position.set(20, 50, -20);
    luzDireccional.castShadow = true;

    // Configurar la calidad de la sombra (opcional pero recomendado)
    luzDireccional.shadow.mapSize.width = 2048;
    luzDireccional.shadow.mapSize.height = 2048;

    luzDireccional.shadow.camera.near = 0.5;
    luzDireccional.shadow.camera.far = 200;
    luzDireccional.shadow.camera.left = -200;
    luzDireccional.shadow.camera.right = 200;
    luzDireccional.shadow.camera.top = 200;
    luzDireccional.shadow.camera.bottom = -200;

    scene.add(luzDireccional);
}

function crearFondoEspacial() {
    // Una esfera enorme
    const geometriaFondo = new THREE.SphereGeometry(500, 64, 64);
    const materialFondo = new THREE.MeshBasicMaterial({ color: 0x050510, side: THREE.BackSide }); // Para ver el interior de la esfera
    const fondoEspacial = new THREE.Mesh(geometriaFondo, materialFondo);
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
        const r = 100 + Math.random() * 200;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        
        posiciones[i] = Math.sin(phi) * Math.cos(theta) * r;
        posiciones[i+1] = Math.sin(phi) * Math.sin(theta) * r * 0.6;
        posiciones[i+2] = Math.cos(phi) * r;

        const colorTipo = Math.random();
        if (colorTipo < 0.33) {
            coloresEstrellas[i] = 1.0; coloresEstrellas[i+1] = 0.6; coloresEstrellas[i+2] = 0.6; 
        } else if (colorTipo < 0.66) {
            coloresEstrellas[i] = 0.6; coloresEstrellas[i+1] = 0.8; coloresEstrellas[i+2] = 1.0; 
        } else {
            coloresEstrellas[i] = 1.0; coloresEstrellas[i+1] = 1.0; coloresEstrellas[i+2] = 0.7; 
        }
    }

    geometriaEstrellas.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
    geometriaEstrellas.setAttribute('color', new THREE.BufferAttribute(coloresEstrellas, 3));

    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
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
        blending: THREE.NormalBlending,
        depthWrite: true
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
    // Curva que une todos los puntos, el true conecta el último con el primero
    curvaPista = new THREE.CatmullRomCurve3(puntos, true);

    // Un tubo que envuelve la curva  y luego lo aplastamos
    // Parámetros: curva, detalle, radio de la pista, segmentos radiales, cerrado
    const geometriaPista = new THREE.TubeGeometry(curvaPista, 300, 6, 8, true);


    const texturaPista = crearTexturaArcoiris();
    texturaPista.wrapS = THREE.RepeatWrapping;
    texturaPista.repeat.set(30, 1); 

    const materialPista = new THREE.MeshLambertMaterial({
        map: texturaPista,
        side: THREE.DoubleSide
    });

    pista = new THREE.Mesh(geometriaPista, materialPista);
    pista.receiveShadow = true;
    pista.castShadow = false;

    // Aplastar el tubo en el eje Y (vertical) 
    // para que deje de ser una tubería y pase a ser una pista de carreras plana.
    pista.scale.set(1, 0.01, 1); 
    
    scene.add(pista);
}

function crearInteractuables() {
    // --- CHECKPOINTS en 25%, 50%, 75% de la curva ---
    const porcentajes = [0.25, 0.5, 0.75];

    porcentajes.forEach((t, i) => {
        const punto    = curvaPista.getPointAt(t);
        const tangente = curvaPista.getTangentAt(t);

        const geoCP = new THREE.TorusGeometry(7, 0.5, 16, 100);
        const matCP = new THREE.MeshPhongMaterial({
            color: coloresOriginalesCP[i],
            emissive: coloresOriginalesCP[i],
            emissiveIntensity: 0.3
        });
        const checkpoint = new THREE.Mesh(geoCP, matCP);

        // Posición exacta sobre la pista
        checkpoint.position.set(punto.x, 1, punto.z);

        // Orientar el aro para que el coche pase por el hueco
        // El torus por defecto tiene el hueco en Z → lo rotamos a la tangente
        const tangente2D = new THREE.Vector3(tangente.x, 0, tangente.z).normalize();
        checkpoint.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangente2D);

        checkpoint.tocado = false;
        scene.add(checkpoint);
        checkpoints.push(checkpoint);
    });

    // --- META en t=0 ---
    crearMeta();

    // --- ACELERADOR (sin cambios) ---
    const geoAcc = new THREE.PlaneGeometry(6, 6);
    const matAcc = new THREE.MeshBasicMaterial({ map: crearTexturaFlechas(), side: THREE.DoubleSide });
    const acelerador = new THREE.Mesh(geoAcc, matAcc);
    acelerador.position.set(30, 0.2, -20);
    acelerador.rotation.x = Math.PI / 2;
    acelerador.rotation.z = -90;
    scene.add(acelerador);
    aceleradores.push(acelerador);

    // --- VALLA (sin cambios) ---
    const geoValla = new THREE.BoxGeometry(6, 2, 1);
    const matValla = new THREE.MeshPhongMaterial({ color: 0x888888 });
    const valla = new THREE.Mesh(geoValla, matValla);
    valla.position.set(-30, 1, 20);
    valla.rotation.y = Math.PI / -4;
    scene.add(valla);
    vallas.push(valla);
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
    chasis.castShadow = true; 
    coche.add(chasis);

    // La cabina
    const geoCabina = new THREE.BoxGeometry(0.8, 0.4, 0.8);
    const matCabina = new THREE.MeshPhongMaterial({ color: 0x222222 });
    const cabina = new THREE.Mesh(geoCabina, matCabina);
    cabina.position.set(0, 0.4, 0.2);
    cabina.castShadow = true;
    coche.add(cabina);

    // Luces
    const posicionesLucesAlante = [[0.45, 0.1, 1], [-0.45, 0.1, 1]];
    const posicionesLucesDetras = [[0.45, 0.1, -1], [-0.45, 0.1, -1]];
    const geoPiloto = new THREE.SphereGeometry(0.08, 8, 8);
    
    const matPilotoAlant = new THREE.MeshBasicMaterial({ color: 0xffff00 }); 
    posicionesLucesAlante.forEach(pos => {
        const piloto = new THREE.Mesh(geoPiloto, matPilotoAlant);
        piloto.position.set(pos[0], pos[1], pos[2]);
        coche.add(piloto);

        // La luz  que emite
        const luzEsquina = new THREE.PointLight(0x00ffff, 1, 10); 
        luzEsquina.position.set(pos[0], pos[1], pos[2]);
        coche.add(luzEsquina);
    });

    const matPilotoDetra = new THREE.MeshBasicMaterial({ color: 0xff0000 }); 
    posicionesLucesDetras.forEach(pos => {
        const piloto = new THREE.Mesh(geoPiloto, matPilotoDetra);
        piloto.position.set(pos[0], pos[1], pos[2]);
        coche.add(piloto);
    });

    // La luz del turbo (solo se enciende al acelerar)
    luzTurbo = new THREE.PointLight(0xff4400, 0, 8);
    luzTurbo.position.set(0, 0.2, -1.2);
    coche.add(luzTurbo);

    // DOble tubo de escape
    const geoEscape = new THREE.CylinderGeometry(0.1, 0.08, 0.7, 8);
    geoEscape.rotateX(Math.PI / 2);
    const matEscape = new THREE.MeshPhongMaterial({ color: 0x333333, emissive: 0x111111 });
    
    // Tubo Izquierdo
    const escapeIzq = new THREE.Mesh(geoEscape, matEscape);
    escapeIzq.position.set(-0.3, -0.1, -1.0);
    escapeIzq.castShadow = true;
    coche.add(escapeIzq);
    
    // Tubo Derecho
    const escapeDer = new THREE.Mesh(geoEscape, matEscape);
    escapeDer.position.set(0.3, -0.1, -1.0);
    escapeDer.castShadow = true;
    coche.add(escapeDer);

    // Llantas y Ruedas
    const geoRueda = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16);
    geoRueda.rotateZ(Math.PI / 2); 
    const matRueda = new THREE.MeshPhongMaterial({ color: 0x334333 });
    const geoLlanta = new THREE.BoxGeometry(0.05, 0.4, 0.1); 
    const matLlanta = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const posicionesRuedas = [[0.6, -0.2, 0.8], [-0.6, -0.2, 0.8], [0.6, -0.2, -0.8], [-0.6, -0.2, -0.8]];

    ruedas = []; 
    posicionesRuedas.forEach(pos => {
        const rueda = new THREE.Group(); 
        const neumatico = new THREE.Mesh(geoRueda, matRueda);
        neumatico.castShadow = true; // Las ruedas proyectan sombra
        rueda.add(neumatico);
        const llanta = new THREE.Mesh(geoLlanta, matLlanta);
        llanta.position.x = pos[0] > 0 ? 0.11 : -0.11; 
        rueda.add(llanta);
        rueda.castShadow = true;
        rueda.position.set(pos[0], pos[1], pos[2]);
        coche.add(rueda);
        ruedas.push(rueda); 
    });

    const geoAleron = new THREE.BoxGeometry(1.2, 0.1, 0.4);
    const aleron = new THREE.Mesh(geoAleron, matChasis);
    aleron.position.set(0, 0.4, -0.9); // Arriba y atrás
    aleron.castShadow = true;
    coche.add(aleron);
    
    const geoSoporte = new THREE.BoxGeometry(0.6, 0.2, 0.1);
    const soporte = new THREE.Mesh(geoSoporte, matCabina);
    soporte.position.set(0, 0.25, -0.8);
    soporte.castShadow = true;
    coche.add(soporte);

    coche.position.set(puntoReaparicion.x, puntoReaparicion.y, puntoReaparicion.z); 
    coche.rotation.set(0, rotacionReaparicion, 0);

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
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        // Añadir brillo central (efecto neón)        
        gradient.addColorStop(0.4, color);
        gradient.addColorStop(0.6, color);
        ctx.fillStyle = gradient;
        ctx.fillRect(i * anchoLinea, 0, anchoLinea, canvas.height);
    });
    return new THREE.CanvasTexture(canvas);
}

function crearTexturaFlechas() {
    const canvas = document.createElement('canvas');
    canvas.width = 256; 
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // Fondo oscuro transparente
    ctx.fillStyle = '#111133'; 
    ctx.fillRect(0, 0, 256, 256);
    
    // Dibujar flecha verde neón
    ctx.fillStyle = '#00ff00';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00ff00';
    ctx.beginPath();
    ctx.moveTo(30, 200); ctx.lineTo(128, 50); ctx.lineTo(226, 200);
    ctx.lineTo(180, 200); ctx.lineTo(128, 120); ctx.lineTo(76, 200);
    ctx.fill();
    
    const textura = new THREE.CanvasTexture(canvas);
    textura.wrapS = THREE.RepeatWrapping; 
    textura.wrapT = THREE.RepeatWrapping;
    textura.repeat.set(1, 5); // Repite las flechas a lo largo del panel
    return textura;
}

function crearTexturaMeta() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // Pintamos fondo blanco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 256, 256);
    
    // Pintamos los cuadros negros
    ctx.fillStyle = '#000000';
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            if ((i + j) % 2 === 0) {
                ctx.fillRect(i * 64, j * 64, 64, 64);
            }
        }
    }
    
    const textura = new THREE.CanvasTexture(canvas);
    textura.wrapS = THREE.RepeatWrapping;
    textura.wrapT = THREE.RepeatWrapping;
    textura.repeat.set(4, 1); // Repetimos los cuadros a lo ancho de la pista
    return textura;
}

function updateMinimapCamera() {
    if (!coche || !cameraTop) return;
    
    // La cámara del minimapa sigue al coche en X y Z, pero se mantiene a altura fija
    cameraTop.position.x = coche.position.x;
    cameraTop.position.z = coche.position.z;
    
    // El punto al que mira es exactamente la posición del coche
    cameraTop.lookAt(coche.position.x, 0, coche.position.z);
}

// Fin funciones de creación de elementos
// ------------------------------------------------------------------------------------------------

//Funciones básicas del juego
// ------------------------------------------------------------------------------------------------
function update() {
    // Si estamos en el menú, no hacemos NADA, nos salimos de la función.
    if (!juegoIniciado) return;

    const delta = reloj.getDelta();
    stats.update();

    tiempoJugado += delta;
    if(document.getElementById('tiempoHUD')) {
        document.getElementById('tiempoHUD').innerText = tiempoJugado.toFixed(1);
    }

    if (coche) {
        if (estadoCaida) {
            // Si nos estamos cayendo, el coche da vueltas sin control y baja en Y
            coche.rotation.x += 5 * delta;
            coche.rotation.z += 8 * delta;
            coche.position.y -= 15 * delta;
        } 
        else {
            // Velocidad actual y boost
            if (tiempoBoost > 0) {
                tiempoBoost -= delta;
                velocidadActual = velocidadBase * 2; // Doble de rápido
            } else {
                velocidadActual = velocidadBase;
            }

            // Movimiento hacia adelante/atrás con DETECCIÓN DE CHOQUE
            let moviendose = false;
            let puedeAvanzar = true;
            
            if (teclas.ArrowUp || teclas.ArrowDown) {
                const direccion = teclas.ArrowUp ? 1 : -1;
                const distanciaMov = velocidadActual * delta * direccion;
                
                // Raycaster para detectar vallas (Solo si vamos hacia adelante)
                if (direccion > 0) {
                    const rayoValla = new THREE.Raycaster();
                    const origen = coche.position.clone();
                    origen.y += 0.5;
                    const direccionRayo = new THREE.Vector3(0, 0, 1);
                    direccionRayo.applyQuaternion(coche.quaternion);
                    
                    rayoValla.set(origen, direccionRayo);
                    const cols = rayoValla.intersectObjects(vallas);
                    
                    if (cols.length > 0 && cols[0].distance < 1.5) {
                        puedeAvanzar = false; // ¡Choque! No avanzamos
                    }
                }
                
                if (puedeAvanzar || direccion < 0) {
                    coche.translateZ(distanciaMov);
                    ruedas.forEach(r => r.rotation.x -= distanciaMov * 2);
                    moviendose = true;
                }
            }
            

            // Giro solo si nos movemos
            if (moviendose) {
                if (teclas.ArrowLeft) coche.rotation.y += velocidadGiro * delta; 
                if (teclas.ArrowRight) coche.rotation.y -= velocidadGiro * delta; 
            }

            // --- LÓGICA DE VUELTAS SECUENCIAL ---
            if (indiceSiguienteCheckpoint < 3) {
                const cpObjetivo = checkpoints[indiceSiguienteCheckpoint];
                if (coche.position.distanceTo(cpObjetivo.position) < 5) {
                    cpObjetivo.material.color.setHex(0x00ff00);
                    cpObjetivo.material.emissive.setHex(0x005500);
                    puntoReaparicion.copy(coche.position);
                    rotacionReaparicion = coche.rotation.y;
                    indiceSiguienteCheckpoint++;
                }
            } else if (indiceSiguienteCheckpoint === 3 && meta) {
                if (coche.position.distanceTo(meta.position) < 6 && !meta.tocada) {
                    meta.tocada = true;
                    contadorVueltas++;
                    if (document.getElementById('vueltasHUD'))
                        document.getElementById('vueltasHUD').innerText = contadorVueltas;

                    // Meta se pone verde brevemente
                    meta.material.color.setHex(0x00ff00);
                    setTimeout(() => { if (meta) meta.material.color.setHex(0xffffff); }, 600);

                    // Reset checkpoints para la siguiente vuelta
                    indiceSiguienteCheckpoint = 0;
                    checkpoints.forEach((cp, i) => {
                        cp.tocado = false;
                        cp.material.color.setHex(coloresOriginalesCP[i]);
                        cp.material.emissive.setHex(0x000000);
                    });

                    puntoReaparicion.copy(coche.position);
                    rotacionReaparicion = coche.rotation.y;

                    if (contadorVueltas >= TOTAL_VUELTAS) {
                        setTimeout(() => alert(`¡CARRERA TERMINADA! Tiempo: ${tiempoJugado.toFixed(1)}s`), 100);
                        contadorVueltas = 0;
                        vueltaActual = 1;
                        tiempoJugado = 0;
                    }
                }
                if (coche.position.distanceTo(meta.position) >= 6) meta.tocada = false;
            }
            
            // Aceleradores
            aceleradores.forEach(acc => {
                if (coche.position.distanceTo(acc.position) < 4) {
                    tiempoBoost = 1.5; // 1.5 segundos de turbo
                }
            });

            //DEJO ESTA PARTE DE VALLAS POR SI QUIERO HACER LUEGO QUE REBOTEN
            //  Vallas, como no me puedo chocar contra un muro, lo que hago es rebotar hacia atrás si me acerco demasiado
            /*vallas.forEach(valla => {
                if (coche.position.distanceTo(valla.position) < 3) {
                    coche.translateZ(-3); // Rebota hacia atrás
                }
               if (coche.position.distanceTo(valla.position) < 3) {
                    // Invertimos la velocidad y la reducimos a la mitad para simular el golpe
                    velocidadActual = -velocidadActual * 0.6; 
                    // Lo empujamos mínimamente para que no se quede pegado detectando colisión infinita
                    coche.translateZ(-0.5); 
                }
            });
*/
            // Sistema de caída
            const origenRayo = coche.position.clone();
            origenRayo.y += 1; 
            raycaster.set(origenRayo, vectorAbajo);
            const intersecciones = raycaster.intersectObject(pista);

            if (intersecciones.length === 0) {
                //iniciar caida
                if (timerCaida) clearTimeout(timerCaida);

                estadoCaida = true;
                contadorCaidas++;
                if(document.getElementById('caidasHUD')) document.getElementById('caidasHUD').innerText = contadorCaidas;
                
                // CAÍDA MÁS CORTA: Solo 0.5 segundos
                timerCaida = setTimeout(() => {
                    coche.position.copy(puntoReaparicion);
                    coche.rotation.set(0, rotacionReaparicion, 0);  
                    estadoCaida = false;           
                    
                    // La camara mira al coche reaperecer
                    if (!camaraLibre) {
                        const offset = new THREE.Vector3(0, 4, -7); 
                        offset.applyQuaternion(coche.quaternion); 
                        offset.add(coche.position); 
                        camera.position.copy(offset);
                        camera.lookAt(coche.position);
                    }
                }, 1000); 
            }
        }
        
        // Sistema de partículas Doble Tubo
        if (teclas.ArrowUp && !estadoCaida) {
            const cantidadParticulas = 2;
            
            for (let pIdx = 0; pIdx < cantidadParticulas; pIdx++) {
                // Usamos esferas en lugar de cubos para que parezca más orgánico (humo/fuego)

                const materialAUsar = tiempoBoost > 0 ? matFuego : matHumo;
                const particula = new THREE.Mesh(geoParticulaBase, materialAUsar);
                
                // Variamos un pelín el tamaño para que parezca orgánico
                const escalaAleatoria = 0.8 + Math.random() * 0.4;
                particula.scale.set(escalaAleatoria, escalaAleatoria, escalaAleatoria);
            

                // Guardamos las posiciones para las partículas
                const offsets = [
                    new THREE.Vector3(-0.3, -0.1, -1.5),
                    new THREE.Vector3(0.3, -0.1, -1.5)
                ];
                // Elegir aleatoriamente uno de los dos tubos
                const posTubo = offsets[pIdx % 2];
                const offsetEscape = posTubo.clone();
                
                // Pequeña variación aleatoria para que no salga un chorro perfecto
                offsetEscape.x += (Math.random() - 0.5) * 0.15;
                offsetEscape.y += (Math.random() - 0.5) * 0.15;
                
                offsetEscape.applyQuaternion(coche.quaternion);
                particula.position.copy(coche.position).add(offsetEscape);
                
                scene.add(particula);
                particulas.push({ mesh: particula, life: 0.8 });
            }

            // Luz del turbo (parpadeo)
            if (luzTurbo) luzTurbo.intensity = 1.5 + Math.random() * 2.5;
            } else {
                if (luzTurbo) luzTurbo.intensity = 0;
        }
    } 

    // Limpieza de partículas (Las hacemos subir y desaparecer)
    for (let i = particulas.length - 1; i >= 0; i--) {
        let p = particulas[i];
        p.life -= delta ; 
        p.mesh.position.y += delta; 
        p.mesh.scale.setScalar(p.life); 

        // Si muere, la borramos
        if (p.life <= 0) {
            scene.remove(p.mesh);
            particulas.splice(i, 1);
        }
    }

    // Logica de camara
    if (camaraLibre) {
        if (cameraControls) cameraControls.update();
    } else {
        if (coche && !estadoCaida) { // Solo seguimos al coche si NO está cayendo
            const offset = new THREE.Vector3(0, 4, -7); 
            offset.applyQuaternion(coche.quaternion); 
            offset.add(coche.position); 
            camera.position.lerp(offset, 0.1); 
            camera.lookAt(coche.position);
        }
    }
    updateMinimapCamera();
}

function render() {
    requestAnimationFrame(render);
    update();
    
    // 1. Configurar Viewport para la VISTA PRINCIPAL (Pantalla completa)
    renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.setScissorTest(false);
    renderer.setClearColor(new THREE.Color(0x050510));
    renderer.clear();
    renderer.render(scene, camera);
    
    // Minimapa en segundo renderer
    if (cameraTop && rendererMinimap) {
        rendererMinimap.clear();
        rendererMinimap.render(scene, cameraTop);
    }
}
// Fin funciones básicas del juego
// ------------------------------------------------------------------------------------------------

//Audio y controles de usuario
// ------------------------------------------------------------------------------------------------
window.addEventListener('keydown', (event) => {
    if (teclas.hasOwnProperty(event.code)) {
        teclas[event.code] = true;
    }
    if (event.code === 'KeyV') {
        camaraLibre = !camaraLibre; 
        cameraControls.enabled = camaraLibre;
        if(camaraLibre && coche) cameraControls.target.copy(coche.position);
    }
});

window.addEventListener('keyup', (event) => {
    if (teclas.hasOwnProperty(event.code)) {
        teclas[event.code] = false;
    }
});

init();
// Fin audio y controles de usuario
// ------------------------------------------------------------------------------------------------

