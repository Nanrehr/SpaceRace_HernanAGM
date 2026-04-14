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
let cameraTop;                  
let minimapCameraHeight = 120;
let minimapCameraSize = 20;        // Tamaño del área visible
let rendererMinimap;
// ---------------

let modoJuego = 'carrera';       // 'carrera' | 'contrareloj' | 'fantasma'
let pistaActual = 'normal';      // 'facil' | 'normal' | 'dificil'
let tiempoContrareloj = 120;     // segundos disponibles en modo contrareloj
let tiempoRestante = 120;
let modoElegido = 'carrera';

// --- MODO FANTASMA ---
let cocheFantasma = null;
let grabandoFantasma = false;
let reproduciendo = false;
let grabacionActual = [];      // Frames de la vuelta que estás haciendo ahora
let mejorGrabacion = [];       // Frames de tu mejor vuelta
let frameFantasma = 0;         // Frame actual del fantasma reproduciéndose
let mejorTiempoFantasma = Infinity;
let tiempoVueltaActual = 0;    // Cronómetro de la vuelta actual
let tiempoFrameFantasma = 0;   // Tiempo acumulado del frame fantasma

// --- AUDIO ---
let audioCtx = null;
let musicaFondo = null;

// --- FX VISUALES ---
const fuentesLuz = [];
const fuegosArtificiales = [];

const PISTAS = {
    facil: {
        nombre: 'FÁCIL',
        waypoints: [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(15, 0, -15),
            new THREE.Vector3(30, 0, -10),
            new THREE.Vector3(38, 0, 5),
            new THREE.Vector3(30, 0, 20),
            new THREE.Vector3(15, 0, 28),
            new THREE.Vector3(0, 0, 25),
            new THREE.Vector3(-15, 0, 15),
            new THREE.Vector3(-20, 0, 0),
            new THREE.Vector3(-12, 0, -12)
        ],
        aceleradores: [
            { x: 30, z: -10 },
            { x: -15, z: 15 }
        ],
        vallas: [
            { x: 35, z: 5,   ry: Math.PI / 6 },
            { x: -5, z: 26,  ry: Math.PI / -5 }
        ]
    },
    normal: {
        nombre: 'NORMAL',
        waypoints: [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(20, 0, -25),
            new THREE.Vector3(45, 4, -20),
            new THREE.Vector3(55, 6, 0),
            new THREE.Vector3(50, 4, 20),
            new THREE.Vector3(35, 0, 35),
            new THREE.Vector3(10, -4, 42),
            new THREE.Vector3(-15, 0, 35),
            new THREE.Vector3(-30, 3, 18),
            new THREE.Vector3(-28, 0, -5),
            new THREE.Vector3(-12, 0, -18)
        ],
        aceleradores: [
            { x: 45, z: -20 },
            { x: -15, z: 35 }
        ],
        vallas: [
            { x: 53, z: 10,  ry: Math.PI / 4 },
            { x: -28, z: 8,  ry: Math.PI / -5 },
            { x: 20, z: 40,  ry: 0 }
        ]
    },
    dificil: {
        nombre: 'DIFÍCIL',
        waypoints: [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(15, 2, -25),
            new THREE.Vector3(40, 6, -35),
            new THREE.Vector3(62, 10, -20),
            new THREE.Vector3(68, 8, 5),
            new THREE.Vector3(60, 4, 28),
            new THREE.Vector3(40, 0, 42),
            new THREE.Vector3(18, -5, 50),
            new THREE.Vector3(-5, -8, 45),
            new THREE.Vector3(-25, -4, 32),
            new THREE.Vector3(-40, 2, 15),
            new THREE.Vector3(-42, 5, -8),
            new THREE.Vector3(-30, 2, -25),
            new THREE.Vector3(-12, 0, -30)
        ],
        aceleradores: [
            { x: 40, z: -35 },
            { x: 60, z: 28 },
            { x: -25, z: 32 }
        ],
        vallas: [
            { x: 65, z: -8,  ry: Math.PI / 5 },
            { x: 18, z: 48,  ry: Math.PI / -4 },
            { x: -40, z: 5,  ry: Math.PI / 3 },
            { x: -15, z: -28, ry: Math.PI / 6 },
            { x: 42, z: 20,  ry: Math.PI / -6 }
        ]
    }
};
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
    camera.position.set(60, 15, 5);    
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    camera.layers.enable(1); // La cámara principal ve la capa 0 (por defecto) y la 1

    cameraControls = new THREE.OrbitControls(camera, renderer.domElement);
    cameraControls.enabled = false; 

    // Cámara del minimapa
    //PROBAR A VER QUE PREFIERE LA GENTE
    //const minimapCameraSize = 80;
    cameraTop = new THREE.OrthographicCamera(
        -minimapCameraSize, minimapCameraSize,
        minimapCameraSize, -minimapCameraSize,
        1, 200
    );
    cameraTop.position.set(0, minimapCameraHeight, 0);
    cameraTop.lookAt(0, 0, 0);
    cameraTop.up.set(0, 0, -1);
    cameraTop.updateProjectionMatrix();
    cameraTop.layers.set(0); // El minimapa SOLO ve la capa 0

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

    // --- NAVEGACIÓN ---
    document.getElementById('btnModos').addEventListener('click', () => {
        document.getElementById('pantallaMenu').style.display = 'none';
        document.getElementById('pantallaModos').style.display = 'flex';
    });

    document.getElementById('btnVolverMenu').addEventListener('click', () => {
        document.getElementById('pantallaModos').style.display = 'none';
        document.getElementById('pantallaMenu').style.display = 'flex';
    });

    document.getElementById('btnVolverPistas').addEventListener('click', () => {
        document.getElementById('pantallaPistas').style.display = 'none';
        document.getElementById('pantallaModos').style.display = 'flex';
    });

    function irAElegirPista(modo) {
        modoElegido = modo;
        const nombres = { carrera: 'CARRERA', contrareloj: 'CONTRARRELOJ', fantasma: 'MODO FANTASMA' };
        document.getElementById('modoElegidoSpan').innerText = nombres[modo];
        document.getElementById('pantallaModos').style.display = 'none';
        document.getElementById('pantallaPistas').style.display = 'flex';
    }

    document.getElementById('cardNormal').querySelector('button').addEventListener('click', () => irAElegirPista('carrera'));
    document.getElementById('cardContrareloj').querySelector('button').addEventListener('click', () => irAElegirPista('contrareloj'));
    document.getElementById('cardFantasma').querySelector('button').addEventListener('click', () => irAElegirPista('fantasma'));

    function seleccionarPistaYArrancar(nombrePista) {
        pistaActual = nombrePista;
        arrancarJuego(modoElegido);
    }

    document.getElementById('pistaFacil').querySelector('button').addEventListener('click', () => seleccionarPistaYArrancar('facil'));
    document.getElementById('pistaNormal').querySelector('button').addEventListener('click', () => seleccionarPistaYArrancar('normal'));
    document.getElementById('pistaDificil').querySelector('button').addEventListener('click', () => seleccionarPistaYArrancar('dificil'));

    function arrancarJuego(modo) {
        iniciarAudio();
        modoJuego = modo;
        tiempoRestante = tiempoContrareloj;

        // Limpiar escena completamente
        if (pista) { scene.remove(pista); pista = null; }
        checkpoints.forEach(cp => scene.remove(cp));
        checkpoints.length = 0;
        aceleradores.forEach(a => scene.remove(a));
        aceleradores.length = 0;
        vallas.forEach(v => scene.remove(v));
        vallas.length = 0;
        if (meta) { scene.remove(meta); meta = null; }

        // Limpiar bordes (todos los objetos que no sean pista/checkpoints/vallas/aceleradores/meta/coche/luces/estrellas)
        const objetosAEliminar = [];
        scene.traverse(obj => {
            if (obj.isMesh && obj !== pista && obj !== coche &&
                !checkpoints.includes(obj) && !aceleradores.includes(obj) &&
                !vallas.includes(obj) && obj !== meta) {
                // Solo los bordecitos (BoxGeometry pequeños)
                if (obj.geometry && obj.geometry.parameters && 
                    obj.geometry.parameters.width === 0.4) {
                    objetosAEliminar.push(obj);
                }
            }
        });
        objetosAEliminar.forEach(o => scene.remove(o));


        // Reconstruir pista e interactuables
        crearPista();
        crearInteractuables();
        document.getElementById('hudFantasmaPanel').style.display = 'none';

        // Reposicionar coche en el punto 0 de la nueva pista
        const puntoInicio = curvaPista.getPointAt(0);
        const tangenteInicio = curvaPista.getTangentAt(0);
        puntoReaparicion.set(puntoInicio.x, 0.5, puntoInicio.z);
        rotacionReaparicion = Math.atan2(tangenteInicio.x, tangenteInicio.z);
        coche.position.copy(puntoReaparicion);
        coche.rotation.set(0, rotacionReaparicion, 0);

        // Reset contadores
        contadorVueltas = 0;
        contadorCaidas = 0;
        tiempoJugado = 0;
        indiceSiguienteCheckpoint = 0;
        estadoCaida = false;
        if (timerCaida) { clearTimeout(timerCaida); timerCaida = null; }

        // Reset HUD
        if (document.getElementById('vueltasHUD')) document.getElementById('vueltasHUD').innerText = 0;
        if (document.getElementById('caidasHUD')) document.getElementById('caidasHUD').innerText = 0;
        if (document.getElementById('tiempoHUD')) document.getElementById('tiempoHUD').innerText = '0.0';

        // Reset fantasma
        grabacionActual = [];
        mejorGrabacion = [];
        frameFantasma = 0;
        tiempoVueltaActual = 0;
        mejorTiempoFantasma = Infinity;
        reproduciendo = false;

        if (modo === 'fantasma') {
            crearCocheFantasma();
            grabandoFantasma = true;
        } else {
            if (cocheFantasma) { scene.remove(cocheFantasma); cocheFantasma = null; }
            grabandoFantasma = false;
            reproduciendo = false;
        }


        document.getElementById('menuInicio').style.display = 'none';
        document.getElementById('hud').style.display = 'block';
        document.getElementById('hudContrareloj').style.display = modo === 'contrareloj' ? 'block' : 'none';

        juegoIniciado = true;
        reloj.start();
    }

    document.getElementById('btnVolver').addEventListener('click', () => {
        document.getElementById('pantallaFin').style.display = 'none';
        document.getElementById('pantallaMenu').style.display = 'flex';
        document.getElementById('pantallaModos').style.display = 'none';
        document.getElementById('pantallaPistas').style.display = 'none';
        document.getElementById('menuInicio').style.display = 'flex';
        document.getElementById('hud').style.display = 'none';
        document.getElementById('hudContrareloj').style.display = 'none';
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

    meta.position.set(punto.x, -1.5, punto.z);

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
    
    // Asegúrate de poner la ruta correcta donde hayas guardado tu .glb
    const rutaModelo = './models/sol.glb'; 

    const loader = new THREE.GLTFLoader();

    loader.load(rutaModelo, function (gltf) {
        const sol = gltf.scene;
        
        // Lo posicionamos donde tienes tu luz direccional para que tenga sentido visual
        sol.position.set(20, 50, -20);
        
        // Ajusta estos valores según lo grande que sea el modelo que te has descargado:
        sol.scale.set(10, 10, 10); 
        
        // Hacemos que brille para que parezca un sol (material emisivo)
        sol.traverse((hijo) => {
            if (hijo.isMesh) {
                hijo.material.emissive = new THREE.Color(0xffaa00);
                hijo.material.emissiveIntensity = 1; // Ajusta este valor si brilla mucho o poco
                hijo.layers.set(1); // <-- AÑADIR ESTO
            }
        });
        
        scene.add(sol);
    }, undefined, function (error) {
        console.error(error); // [cite: 58]
    });

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
    const waypointsDatos = PISTAS[pistaActual].waypoints;
    curvaPista = new THREE.CatmullRomCurve3(waypointsDatos, true);

    const numSegmentos = 300;
    const anchoPista = 12;
    const posiciones = [];
    const uvs = [];
    const indices = [];

    for (let i = 0; i <= numSegmentos; i++) {
        const t = i / numSegmentos;
        const punto = curvaPista.getPointAt(t);
        const tangente = curvaPista.getTangentAt(t);

        // Vector "arriba" del mundo
        const arriba = new THREE.Vector3(0, 1, 0);
        // Perpendicular a la tangente en el plano local
        const perp = new THREE.Vector3()
            .crossVectors(tangente, arriba)
            .normalize();

        // Vértice izquierdo y derecho
        posiciones.push(
            punto.x + perp.x * anchoPista / 2,
            punto.y,
            punto.z + perp.z * anchoPista / 2
        );
        posiciones.push(
            punto.x - perp.x * anchoPista / 2,
            punto.y,
            punto.z - perp.z * anchoPista / 2
        );

        // UVs para la textura
        uvs.push(0, t * 30);
        uvs.push(1, t * 30);
    }

    // Triángulos conectando segmentos
    for (let i = 0; i < numSegmentos; i++) {
        const a = i * 2;
        const b = i * 2 + 1;
        const c = i * 2 + 2;
        const d = i * 2 + 3;
        indices.push(a, b, c);
        indices.push(b, d, c);
    }

    const geometriaPista = new THREE.BufferGeometry();
    geometriaPista.setAttribute('position',
        new THREE.Float32BufferAttribute(posiciones, 3));
    geometriaPista.setAttribute('uv',
        new THREE.Float32BufferAttribute(uvs, 2));
    geometriaPista.setIndex(indices);
    geometriaPista.computeVertexNormals();

    const texturaPista = crearTexturaArcoiris();
    texturaPista.wrapS = THREE.RepeatWrapping;
    texturaPista.wrapT = THREE.RepeatWrapping;
    texturaPista.repeat.set(1, 1);

    const materialPista = new THREE.MeshLambertMaterial({
        map: texturaPista,
        side: THREE.DoubleSide
    });

    pista = new THREE.Mesh(geometriaPista, materialPista);
    // Ya NO necesitas scale.set(1, 0.01, 1)
    pista.receiveShadow = true;
    scene.add(pista);
}

function crearInteractuables() {
    const datos = PISTAS[pistaActual];

    // --- CHECKPOINTS en 25%, 50%, 75% ---

    const porcentajes = [0.25, 0.5, 0.75];
    porcentajes.forEach((t, i) => {
        const punto    = curvaPista.getPointAt(t);
        const tangente = curvaPista.getTangentAt(t); // tangente COMPLETA con Y

        const geoCP = new THREE.TorusGeometry(8, 0.5, 16, 100);
        const texCP = crearTexturaCheckpoint();
        const matCP = new THREE.MeshPhongMaterial({
            map: texCP,
            color: coloresOriginalesCP[i],
            emissive: coloresOriginalesCP[i],
            emissiveIntensity: 0.4
        });
        const checkpoint = new THREE.Mesh(geoCP, matCP);
        checkpoint.position.copy(punto);

        // Orientar con la tangente COMPLETA (incluye inclinación Y)
        const tangenteNorm = tangente.clone().normalize();
        checkpoint.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangenteNorm);

        checkpoint.tocado = false;
        scene.add(checkpoint);
        checkpoints.push(checkpoint);
    });

    // --- META ---
    crearMeta();

    
    // --- ACELERADORES de esta pista ---
    datos.aceleradores.forEach(a => {
        const infoPista = obtenerDatosPistaCercana(a.x, a.z);
        
        const geoAcc = new THREE.PlaneGeometry(12, 6);
        const matAcc = new THREE.MeshBasicMaterial({ map: crearTexturaFlechas(), side: THREE.DoubleSide });
        const acelerador = new THREE.Mesh(geoAcc, matAcc);
        
        // Ponerlo a ras de la pista (infoPista.punto.y + 0.1 para que no se superponga visualmente)
        acelerador.position.set(infoPista.punto.x, infoPista.punto.y + 0.1, infoPista.punto.z);
        
        // Orientarlo siguiendo la pista y tumbarlo en el suelo
        acelerador.lookAt(infoPista.punto.x + infoPista.tangente.x, infoPista.punto.y + infoPista.tangente.y, infoPista.punto.z + infoPista.tangente.z);
        acelerador.rotateX(-Math.PI / 2); // Lo tumbamos
        
        scene.add(acelerador);
        aceleradores.push(acelerador);
    });
    

    // --- VALLAS de esta pista ---
    const texLadrillo = crearTexturaLadrillosNeon();
    datos.vallas.forEach(v => {
        const infoPista = obtenerDatosPistaCercana(v.x, v.z);
        
        const geoValla = new THREE.BoxGeometry(6, 2, 1);
        const matValla = new THREE.MeshPhongMaterial({ map: texLadrillo });
        const valla = new THREE.Mesh(geoValla, matValla);
        
        // Posición ajustada a la altura de la colina correspondiente
        valla.position.set(v.x, infoPista.punto.y + 1, v.z); 
        
        // Orientación automática siguiendo la curva de la pista
        valla.lookAt(v.x + infoPista.tangente.x, infoPista.punto.y + 1, v.z + infoPista.tangente.z);
        
        scene.add(valla);
        vallas.push(valla);
    });

   //crearBordesPista();
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

function crearCocheFantasma() {
    if (cocheFantasma) { scene.remove(cocheFantasma); cocheFantasma = null; }

    cocheFantasma = new THREE.Group();

    const matFantasma = new THREE.MeshPhongMaterial({ 
        color: 0xff00ff, 
        transparent: true, 
        opacity: 0.35,
        emissive: 0xff00ff,
        emissiveIntensity: 0.3
    });

    // Chasis
    const chasis = new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 2), matFantasma);
    cocheFantasma.add(chasis);

    // Cabina
    const cabina = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.8), matFantasma);
    cabina.position.set(0, 0.4, 0.2);
    cocheFantasma.add(cabina);

    // Alerón
    const aleron = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.4), matFantasma);
    aleron.position.set(0, 0.4, -0.9);
    cocheFantasma.add(aleron);

    cocheFantasma.visible = false;
    scene.add(cocheFantasma);
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

function crearBordesPista() {
    const numPuntos = 150;
    const separacion = 6.5; // Distancia del centro al borde (radio del tubo)

    for (let i = 0; i < numPuntos; i++) {
        const t = i / numPuntos;
        const punto    = curvaPista.getPointAt(t);
        const tangente = curvaPista.getTangentAt(t);

        // Vector perpendicular en el plano XZ
        const perp = new THREE.Vector3(-tangente.z, 0, tangente.x).normalize();

        const geoBorde = new THREE.BoxGeometry(0.4, 1.2, 0.4);
        const matBorde = new THREE.MeshPhongMaterial({ 
            color: i % 2 === 0 ? 0x00ffff : 0xff00ff,
            emissive: i % 2 === 0 ? 0x004444 : 0x440044
        });

        // Borde izquierdo
        const bordeIzq = new THREE.Mesh(geoBorde, matBorde);
        bordeIzq.position.set(
            punto.x + perp.x * separacion,
            punto.y + 0.6,
            punto.z + perp.z * separacion
        );
        scene.add(bordeIzq);

        // Borde derecho
        const bordeDer = new THREE.Mesh(geoBorde, matBorde.clone());
        bordeDer.position.set(
            punto.x - perp.x * separacion,
            punto.y + 0.6,
            punto.z - perp.z * separacion
        );
        scene.add(bordeDer);

        bordeIzq.position.set(
            punto.x + perp.x * separacion,
            punto.y + 0.6,   // ahora esto ES correcto
            punto.z + perp.z * separacion
        );
        bordeDer.position.set(
            punto.x - perp.x * separacion,
            punto.y + 0.6,
            punto.z - perp.z * separacion
);

    }
}
function crearTexturaCheckpoint() {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000011';
    ctx.fillRect(0, 0, 256, 64);
    // Franjas diagonales neón
    for (let x = -64; x < 280; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0); ctx.lineTo(x + 20, 0);
        ctx.lineTo(x + 20 + 64, 64); ctx.lineTo(x + 64, 64);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fill();
    }
    // Borde brillante
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ffffff';
    ctx.strokeRect(2, 2, 252, 60);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.repeat.set(6, 1);
    return tex;
}


function iniciarAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    reproducirMusicaFondo();
}

function reproducirMusicaFondo() {
    if (!audioCtx) return;

    function crearCapa(frecuencias, duracion, volumen, delay) {
        setTimeout(() => {
            if (!audioCtx) return;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(frecuencias[0], audioCtx.currentTime);
            gain.gain.setValueAtTime(volumen, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duracion);
            osc.start();
            osc.stop(audioCtx.currentTime + duracion);
        }, delay);
    }

    // Bucle de música tipo synthwave
    const notas = [130, 146, 164, 174, 195, 220, 246, 261];
    function bucleMusica() {
        if (!juegoIniciado) { setTimeout(bucleMusica, 500); return; }
        notas.forEach((nota, i) => {
            crearCapa([nota], 0.4, 0.04, i * 250);
            crearCapa([nota * 2], 0.2, 0.02, i * 250 + 125);
        });
        setTimeout(bucleMusica, notas.length * 250);
    }
    bucleMusica();
}

function sonidoCheckpoint() {
    if (!audioCtx) return;
    [880, 1100, 1320].forEach((freq, i) => {
        setTimeout(() => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.15);
        }, i * 80);
    });
}

function sonidoMeta() {
    if (!audioCtx) return;
    [523, 659, 784, 1046].forEach((freq, i) => {
        setTimeout(() => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.3);
        }, i * 100);
    });
}

function sonidoFinal() {
    if (!audioCtx) return;
    const melodia = [523, 659, 784, 659, 784, 1046, 784, 1046, 1318];
    melodia.forEach((freq, i) => {
        setTimeout(() => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.25);
        }, i * 120);
    });
}

function sonidoBoost() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
}

function flashCheckpoint(posicion) {
    const luz = new THREE.PointLight(0x00ff00, 8, 20);
    luz.position.copy(posicion);
    luz.position.y += 2;
    scene.add(luz);
    fuentesLuz.push({ luz, vida: 0.5 });
}

function lanzarFuegosArtificiales() {
    // Lanzamos 15 cohetes repartidos
    for (let f = 0; f < 15; f++) {
        setTimeout(() => {
            // Cogemos un punto aleatorio de la pista (de 0 a 1)
            const puntoAleatorio = curvaPista.getPointAt(Math.random());
            
            const origen = puntoAleatorio.clone();
            origen.x += (Math.random() - 0.5) * 40; // Mayor dispersión X
            origen.z += (Math.random() - 0.5) * 40; // Mayor dispersión Z
            origen.y += Math.random() * 10;         // Nacen un poco elevados
            
            const color = [0xff0000, 0x00ffff, 0xffff00, 0xff00ff, 0x00ff00][Math.floor(Math.random() * 5)];
            const matFA = new THREE.MeshBasicMaterial({ color });

            for (let i = 0; i < 30; i++) {
                const geo = new THREE.SphereGeometry(0.15, 4, 4);
                const p = new THREE.Mesh(geo, matFA);
                p.position.copy(origen);
                const vel = new THREE.Vector3(
                    (Math.random() - 0.5) * 15,
                    5 + Math.random() * 15,
                    (Math.random() - 0.5) * 15
                );
                scene.add(p);
                fuegosArtificiales.push({ mesh: p, vel, vida: 1.5 + Math.random() });
            }

            const luzFA = new THREE.PointLight(color, 10, 25);
            luzFA.position.copy(origen);
            luzFA.position.y = 8;
            scene.add(luzFA);
            fuentesLuz.push({ luz: luzFA, vida: 0.4 });

        }, f * 300); // 300ms entre cada cohete
    }
}

function mostrarAvisoVuelta(texto, color = '#00ffff') {
    const el = document.getElementById('avisoVuelta');
    if (!el) return;
    el.innerText = texto;
    el.style.color = color;
    el.style.textShadow = `0 0 20px ${color}`;
    el.style.display = 'block';
    el.style.opacity = '1';
    let fade = 2.0;
    const intervalo = setInterval(() => {
        fade -= 0.05;
        el.style.opacity = Math.max(0, fade).toString();
        if (fade <= 0) { el.style.display = 'none'; clearInterval(intervalo); }
    }, 50);
}

function obtenerDatosPistaCercana(x, z) {
    let mejorT = 0;
    let minDist = Infinity;
    // Escaneamos la pista para ver qué punto cae más cerca de x,z
    for(let i = 0; i <= 100; i++) {
        let t = i / 100;
        let pt = curvaPista.getPointAt(t);
        let dist = Math.hypot(pt.x - x, pt.z - z);
        if(dist < minDist) { minDist = dist; mejorT = t; }
    }
    return {
        punto: curvaPista.getPointAt(mejorT),
        tangente: curvaPista.getTangentAt(mejorT)
    };
}

function crearTexturaLadrillosNeon() {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // Fondo oscuro
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, 256, 256);
    
    // Líneas de los ladrillos
    ctx.strokeStyle = '#ff00ff'; // Rosa neón
    ctx.lineWidth = 4;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ff00ff';
    
    // Dibujar patrón de pared
    for(let i = 0; i < 256; i += 64) {
        ctx.strokeRect(i, 0, 64, 128);
        ctx.strokeRect(i - 32, 128, 64, 128);
    }
    
    const textura = new THREE.CanvasTexture(canvas);
    textura.wrapS = THREE.RepeatWrapping;
    textura.wrapT = THREE.RepeatWrapping;
    textura.repeat.set(2, 1);
    return textura;
}

function sonidoCaidaResbalon() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.type = 'triangle'; // Suena tipo consola retro
    // Empieza agudo y cae en picado hacia grave (efecto caída)
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.8);
    
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.8);
}
// Fin funciones de creación de elementos
// ------------------------------------------------------------------------------------------------

//Funciones básicas del juego
// ------------------------------------------------------------------------------------------------
function update() {
    // Si estamos en el menú, no hacemos NADA, nos salimos de la función.
    if (!juegoIniciado) return;

    const delta = reloj.getDelta();

    // --- LÓGICA MODO FANTASMA ---
    //----------------------------------------------------------------------------------
    if (modoJuego === 'fantasma') {
        tiempoVueltaActual += delta;

       if (grabandoFantasma) {
            // Guardar solo 1 de cada 3 frames (~20 fps)
            if (grabacionActual.length % 3 === 0) {
                grabacionActual.push({
                    x: coche.position.x,
                    y: coche.position.y,
                    z: coche.position.z,
                    rotY: coche.rotation.y
                });
            }
        }

        // Reproducir fantasma
        if (reproduciendo && mejorGrabacion.length > 0 && cocheFantasma) {
            // Interpolación simple para suavizar el movimiento
            cocheFantasma.visible = true;
            const frame = mejorGrabacion[frameFantasma];
            const nextFrame = mejorGrabacion[(frameFantasma + 1) % mejorGrabacion.length];
            const factor = 0.5; // Interpolación lineal al 50%
            
            cocheFantasma.position.x = frame.x * (1 - factor) + nextFrame.x * factor;
            cocheFantasma.position.z = frame.z * (1 - factor) + nextFrame.z * factor;
            cocheFantasma.position.y = frame.y;

            // Calcular si el fantasma va por delante o por detrás
            // El fantasma va "ganando" si su frame índice es mayor que el nuestro
            const ratioFantasma = frameFantasma / mejorGrabacion.length;
            const ratioNuestro  = grabacionActual.length / mejorGrabacion.length;
            const delta_t = (ratioNuestro - ratioFantasma) * mejorTiempoFantasma;

            // HUD delta
            const elDelta = document.getElementById('deltaTiempoHUD');
            if (elDelta) {
                if (delta_t > 0.05) {
                    elDelta.innerText = `+${delta_t.toFixed(2)}s`;
                    elDelta.style.color = '#00ff00'; // verde = vamos ganando
                    elDelta.style.textShadow = '0 0 10px #00ff00';
                    // Fantasma normal
                    cocheFantasma.traverse(m => { if (m.isMesh) { m.material.opacity = 0.35; m.material.emissiveIntensity = 0.3; }});
                } else if (delta_t < -0.05) {
                    elDelta.innerText = `${delta_t.toFixed(2)}s`;
                    elDelta.style.color = '#ff4444'; // rojo = fantasma gana
                    elDelta.style.textShadow = '0 0 10px #ff4444';
                    // Fantasma pulsa más intenso para intimidar
                    const pulso = 0.5 + 0.4 * Math.sin(Date.now() * 0.008);
                    cocheFantasma.traverse(m => { if (m.isMesh) { m.material.opacity = pulso; m.material.emissiveIntensity = pulso * 1.5; }});
                } else {
                    elDelta.innerText = `±0.00s`;
                    elDelta.style.color = '#ffff00';
                    elDelta.style.textShadow = '0 0 10px #ffff00';
                }
            }

            frameFantasma++;
            if (frameFantasma >= mejorGrabacion.length) frameFantasma = 0;
        }

        // Mostrar mejor tiempo
        const hudF = document.getElementById('hudFantasmaPanel');
        if (hudF) hudF.style.display = 'block';
        if (mejorTiempoFantasma < Infinity)
            document.getElementById('mejorTiempoHUD').innerText = mejorTiempoFantasma.toFixed(2);
    } else {
        const hudF = document.getElementById('hudFantasmaPanel');
        if (hudF) hudF.style.display = 'none';
    }

    stats.update();

    tiempoJugado += delta;

    // Lógica modo contrarreloj
    //----------------------------------------------------------------------------------
    if (modoJuego === 'contrareloj') {
        tiempoRestante -= delta;
        const mins = Math.floor(tiempoRestante / 60);
        const segs = Math.max(0, tiempoRestante % 60).toFixed(0).padStart(2, '0');
        const el = document.getElementById('timerContrareloj');
        if (el) {
            el.innerText = `${mins}:${segs}`;
            el.style.color = tiempoRestante < 20 ? '#ff0000' : '#ff4444';
        }
        if (tiempoRestante <= 0) {
            juegoIniciado = false;
            document.getElementById('finTiempo').innerText = '¡TIEMPO!';
            document.getElementById('finCaidas').innerText = contadorCaidas;
            document.getElementById('finVueltas').innerText = contadorVueltas;
            document.getElementById('hud').style.display = 'none';
            document.getElementById('hudContrareloj').style.display = 'none';
            document.getElementById('pantallaFin').style.display = 'flex';
        }
    }
    
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
                    sonidoCheckpoint();
                    flashCheckpoint(cpObjetivo.position);
                }
            } else if (indiceSiguienteCheckpoint === 3 && meta) {
                if (coche.position.distanceTo(meta.position) < 6 && !meta.tocada) {
                    meta.tocada = true;

                    // Lógica fantasma al cruzar meta
                    if (modoJuego === 'fantasma') {
                        // ¿Es mejor vuelta?
                        if (tiempoVueltaActual < mejorTiempoFantasma) {
                            mejorTiempoFantasma = tiempoVueltaActual;
                            mejorGrabacion = [...grabacionActual];
                        }
                        // Reiniciar grabación para la siguiente vuelta
                        grabacionActual = [];
                        tiempoVueltaActual = 0;
                        frameFantasma = 0;
                        reproduciendo = true;
                        grabandoFantasma = true;
                    }

                    contadorVueltas++;
                    sonidoMeta();
                    lanzarFuegosArtificiales(); // ← AQUÍ, en cada vuelta

                    const restantes = TOTAL_VUELTAS - contadorVueltas;
                    if (restantes > 0) {
                        mostrarAvisoVuelta(`¡${restantes} VUELTA${restantes > 1 ? 'S' : ''} RESTANTE${restantes > 1 ? 'S' : ''}!`, '#00ffff');
                    }

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
                        //lanzarFuegosArtificiales();
                        juegoIniciado = false;
                        document.getElementById('finTiempo').innerText = tiempoJugado.toFixed(1);
                        document.getElementById('finCaidas').innerText = contadorCaidas;
                        document.getElementById('finVueltas').innerText = TOTAL_VUELTAS;
                        document.getElementById('hud').style.display = 'none';
                        document.getElementById('pantallaFin').style.display = 'flex';
                        sonidoFinal();

                    }
                }
                if (coche.position.distanceTo(meta.position) >= 6) meta.tocada = false;
            }
            
            // Aceleradores
            aceleradores.forEach(acc => {
                if (coche.position.distanceTo(acc.position) < 4) {
                    if (tiempoBoost <= 0) sonidoBoost();
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
            // 1. AUMENTAMOS LA ALTURA DEL RAYO: Lo lanzamos desde más arriba (+10) 
            // para asegurar que siempre detecte la pista, incluso en subidas muy empinadas.
            origenRayo.y += 10; 
            raycaster.set(origenRayo, vectorAbajo);
            const intersecciones = raycaster.intersectObject(pista);

            if (intersecciones.length === 0) {
                // Iniciar caida
                if (timerCaida) clearTimeout(timerCaida);

                estadoCaida = true;
                sonidoCaidaResbalon();
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
            } else {
                // 2. ¡EL COCHE ESTÁ SOBRE LA PISTA!
                // Ajustamos la altura del coche al punto exacto donde el rayo toca la pista.
                // Sumamos 0.5 porque es la distancia desde el centro del coche (su punto de anclaje) hasta las ruedas.
                coche.position.y = intersecciones[0].point.y + 0.5; 
            }

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
    // Animar checkpoints y meta para que giren
    const t = Date.now() * 0.001;
    checkpoints.forEach((cp, i) => {
        cp.rotation.z = t * (0.8 + i * 0.2);
    });
    if (meta) meta.rotation.z = t * 1.2;

    // Actualizar flashes de luz
    for (let i = fuentesLuz.length - 1; i >= 0; i--) {
        fuentesLuz[i].vida -= delta;
        fuentesLuz[i].luz.intensity *= 0.85;
        if (fuentesLuz[i].vida <= 0) {
            scene.remove(fuentesLuz[i].luz);
            fuentesLuz.splice(i, 1);
        }
    }

    // Actualizar fuegos artificiales
    for (let i = fuegosArtificiales.length - 1; i >= 0; i--) {
        const fa = fuegosArtificiales[i];
        fa.vel.y -= 9.8 * delta;
        fa.mesh.position.addScaledVector(fa.vel, delta);
        fa.vida -= delta;
        fa.mesh.material.opacity = fa.vida;
        fa.mesh.material.transparent = true;
        if (fa.vida <= 0) {
            scene.remove(fa.mesh);
            fuegosArtificiales.splice(i, 1);
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

