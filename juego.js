//VARIABLES GLOBALES
// ------------------------------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer();
const scene = new THREE.Scene();

const reloj = new THREE.Clock();
const stats = new Stats();

const raycaster = new THREE.Raycaster();
const vectorAbajo = new THREE.Vector3(0, -1, 0);  

const velocidadBase = 25; 
let velocidadActual = velocidadBase; 
const velocidadGiro = Math.PI; 
let tiempoBoost = 0;

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
let juegoIniciado = false;
let estadoCaida = false;

let tiempoJugado = 0;
let contadorCaidas = 0;
let camaraLibre = false;

const particulas = []; 
let luzTurbo;

let puntoReaparicion = new THREE.Vector3(0, 0.5, 0);
let rotacionReaparicion = 90 * Math.PI / 180;
let timerCaida = null;

const checkpoints = [];
const aceleradores = [];
const vallas = [];

let curvaPista;
let meta = null;
let contadorVueltas = 0;
const coloresOriginalesCP = [0xffff00, 0xff8800, 0xff00ff];
let indiceSiguienteCheckpoint = 0;
const TOTAL_VUELTAS = 3;

const geoParticulaBase = new THREE.SphereGeometry(0.15, 5, 5);
const matHumo = new THREE.MeshPhongMaterial({ color: 0xcccccc, transparent: true, opacity: 0.9, emissive: 0x222222 });
const matFuego = new THREE.MeshPhongMaterial({ color: 0xff6600, transparent: true, opacity: 0.9, emissive: 0xff4400 });

let cameraTop;
let minimapCameraHeight = 150;
let minimapCameraSize = 30;
let rendererMinimap;

let modoJuego = 'carrera';
let pistaActual = 'normal';
let tiempoContrareloj = 119;
let tiempoRestante = 119;
let modoElegido = 'carrera';
let colorCoche = 0x00ffff; // Color por defecto

// --- MODO FANTASMA ---
let cocheFantasma = null;
let grabandoFantasma = false;
let reproduciendo = false;
let grabacionActual = [];
let mejorGrabacion = [];
let frameFantasma = 0;
let mejorTiempoFantasma = Infinity;
let tiempoVueltaActual = 0;
let tiempoFrameAcum = 0;

// --- AUDIO ---
let audioCtx = null;

// --- FX VISUALES ---
const fuentesLuz = [];
const fuegosArtificiales = [];

let velocidadReal = 0;        // Velocidad actual con inercia
const aceleracion = 40;       // Qué tan rápido gana velocidad
const frenado = 60;           // Qué tan rápido frena
const rozamiento = 25;        // Desaceleración natural al soltar

const PISTAS = {
    facil: {
        nombre: 'FÁCIL',
        waypoints: [
            new THREE.Vector3(  0,  0,   0),
            new THREE.Vector3( 18,  0, -12),
            new THREE.Vector3( 35,  2, -18),
            new THREE.Vector3( 48,  4, -10),
            new THREE.Vector3( 52,  5,   5),
            new THREE.Vector3( 45,  4,  20),
            new THREE.Vector3( 30,  3,  30),
            new THREE.Vector3( 12,  1,  35),
            new THREE.Vector3( -8,  0,  30),
            new THREE.Vector3(-22,  0,  15),
            new THREE.Vector3(-28,  1,   0),
            new THREE.Vector3(-20,  2, -14),
            new THREE.Vector3( -8,  1, -18)
        ],
        aceleradores: [
            { x: 35, z: -18 },
            { x: -22, z: 15 }
        ],
        vallas: [
            { x: 50, z:  5,  ry: Math.PI / 5  },
            { x: -5, z: 32,  ry: Math.PI / -6 }
        ]
    },
    normal: {
        nombre: 'NORMAL',
        waypoints: [
            new THREE.Vector3(  0,  0,   0),
            new THREE.Vector3( 22,  0, -20),
            new THREE.Vector3( 44,  4, -28),
            new THREE.Vector3( 60,  8, -14),
            new THREE.Vector3( 65,  9,   4),
            new THREE.Vector3( 58,  7,  22),
            new THREE.Vector3( 40,  3,  38),
            new THREE.Vector3( 16, -2,  48),
            new THREE.Vector3( -8, -4,  44),
            new THREE.Vector3(-28, -2,  30),
            new THREE.Vector3(-40,  1,  12),
            new THREE.Vector3(-38,  3,  -8),
            new THREE.Vector3(-24,  2, -22),
            new THREE.Vector3( -8,  0, -26)
        ],
        aceleradores: [
            { x: 44, z: -28 },
            { x: -28, z: 30 }
        ],
        vallas: [
            { x: 63, z:  4,  ry: Math.PI / 4  },
            { x: 16, z: 46,  ry: 0             },
            { x:-38, z:  2,  ry: Math.PI / -5  }
        ]
    },
    dificil: {
        nombre: 'DIFÍCIL',
        waypoints: [
            new THREE.Vector3(  0,  0,   0),
            new THREE.Vector3( 18,  2, -22),
            new THREE.Vector3( 38,  7, -38),
            new THREE.Vector3( 60, 12, -30),
            new THREE.Vector3( 72, 14,  -8),
            new THREE.Vector3( 68, 11,  16),
            new THREE.Vector3( 50,  6,  34),
            new THREE.Vector3( 28,  1,  48),
            new THREE.Vector3(  4, -4,  52),
            new THREE.Vector3(-20, -7,  44),
            new THREE.Vector3(-38, -4,  26),
            new THREE.Vector3(-48,  0,   6),
            new THREE.Vector3(-44,  4, -16),
            new THREE.Vector3(-28,  6, -32),
            new THREE.Vector3(-10,  3, -38)
        ],
        aceleradores: [
            { x: 38, z: -38 },
            { x: 68, z:  16 },
            { x:-38, z:  26 }
        ],
        vallas: [
            { x: 70, z:  -8, ry: Math.PI / 5  },
            { x: 28, z:  46, ry: Math.PI / -4 },
            { x:-46, z:   6, ry: Math.PI / 3  },
            { x:-28, z: -30, ry: Math.PI / 6  },
            { x: 50, z:  20, ry: Math.PI / -6 }
        ]
    }
};
// ------------------------------------------------------------------------------------------------

function init() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(new THREE.Color(0x000000)); 
    renderer.shadowMap.enabled = true; 
    document.getElementById('container').appendChild(renderer.domElement);

    const aspectRatio = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000); 
    camera.position.set(6, 3, 5);    
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    camera.layers.enable(1);

    cameraControls = new THREE.OrbitControls(camera, renderer.domElement);
    cameraControls.enabled = false; 

    cameraTop = new THREE.OrthographicCamera(
        -minimapCameraSize, minimapCameraSize,
        minimapCameraSize, -minimapCameraSize,
        1, 300
    );
    cameraTop.position.set(0, minimapCameraHeight, 0);
    cameraTop.lookAt(0, 0, 0);
    cameraTop.up.set(0, 0, -1);
    cameraTop.updateProjectionMatrix();
    cameraTop.layers.set(0);

    rendererMinimap = new THREE.WebGLRenderer({ 
        canvas: document.getElementById('minimap-canvas'),
        alpha: true 
    });
    rendererMinimap.setSize(280, 280);
    rendererMinimap.setClearColor(0x111122, 1);

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

        if (pista) { scene.remove(pista); pista = null; }
        checkpoints.forEach(cp => scene.remove(cp));
        checkpoints.length = 0;
        aceleradores.forEach(a => scene.remove(a));
        aceleradores.length = 0;
        vallas.forEach(v => scene.remove(v));
        vallas.length = 0;
        if (meta) { scene.remove(meta); meta = null; }

        crearPista();
        crearInteractuables();
        document.getElementById('hudFantasmaPanel').style.display = 'none';

        const puntoInicio = curvaPista.getPointAt(0);
        const tangenteInicio = curvaPista.getTangentAt(0);
        puntoReaparicion.set(puntoInicio.x, puntoInicio.y + 0.5, puntoInicio.z);
        rotacionReaparicion = Math.atan2(tangenteInicio.x, tangenteInicio.z);
        coche.position.copy(puntoReaparicion);
        coche.rotation.set(0, rotacionReaparicion, 0);

        contadorVueltas = 0;
        contadorCaidas = 0;
        tiempoJugado = 0;
        indiceSiguienteCheckpoint = 0;
        estadoCaida = false;
        if (timerCaida) { clearTimeout(timerCaida); timerCaida = null; }

        if (document.getElementById('vueltasHUD')) document.getElementById('vueltasHUD').innerText = 0;
        if (document.getElementById('caidasHUD')) document.getElementById('caidasHUD').innerText = 0;
        if (document.getElementById('tiempoHUD')) document.getElementById('tiempoHUD').innerText = '0.0';

        // Reset fantasma completo
        grabacionActual = [];
        mejorGrabacion = [];
        frameFantasma = 0;
        tiempoFrameAcum = 0;
        tiempoVueltaActual = 0;
        mejorTiempoFantasma = Infinity;
        reproduciendo = false;
        grabandoFantasma = false;

        if (modo === 'fantasma') {
            crearCocheFantasma();
            grabandoFantasma = true;
            if (document.getElementById('mejorTiempoHUD'))
                document.getElementById('mejorTiempoHUD').innerText = '--';
            if (document.getElementById('deltaTiempoHUD'))
                document.getElementById('deltaTiempoHUD').innerText = '--';
        } else {
            if (cocheFantasma) { scene.remove(cocheFantasma); cocheFantasma = null; }
        }

        document.getElementById('menuInicio').style.display = 'none';
        document.getElementById('hud').style.display = 'block';
        document.getElementById('hudControlesJuego').style.display = 'block'; // ← añadir
        document.getElementById('hudContrareloj').style.display = modo === 'contrareloj' ? 'block' : 'none';

        juegoIniciado = true;
        reloj.start();
    }

    // Botón volver inicial (se recrea dinámicamente en mostrarPantallaFin)
    const btnVolverInicial = document.getElementById('btnVolver');
    if (btnVolverInicial) {
        btnVolverInicial.addEventListener('click', () => {
            document.getElementById('pantallaFin').style.display = 'none';
            document.getElementById('pantallaMenu').style.display = 'flex';
            document.getElementById('pantallaModos').style.display = 'none';
            document.getElementById('pantallaPistas').style.display = 'none';
            document.getElementById('menuInicio').style.display = 'flex';
            document.getElementById('hud').style.display = 'none';
            document.getElementById('hudContrareloj').style.display = 'none';
        });
    }

    // Botón personalizar
    document.getElementById('btnPersonalizar').addEventListener('click', () => {
        document.getElementById('pantallaMenu').style.display = 'none';
        document.getElementById('pantallaPersonalizar').style.display = 'flex';
        // Enfocar cámara al coche lateralmente
        camera.position.set(3, 2, 4);
        camera.lookAt(coche.position);
    });

    document.getElementById('btnVolverPersonalizar').addEventListener('click', () => {
        document.getElementById('pantallaPersonalizar').style.display = 'none';
        document.getElementById('pantallaMenu').style.display = 'flex';
        // Restaurar cámara inicial
        camera.position.set(6, 3, 5);    
        camera.lookAt(new THREE.Vector3(0, 0, 0));
    });

    document.getElementById('btnJugarDesdePersonalizar').addEventListener('click', () => {
        document.getElementById('pantallaPersonalizar').style.display = 'none';
        document.getElementById('pantallaModos').style.display = 'flex';
        camera.position.set(6, 3, 5);    
        camera.lookAt(new THREE.Vector3(0, 0, 0));
    });

    // Selección de colores
    document.querySelectorAll('.colorOpcion').forEach(el => {
            el.addEventListener('click', () => {
                document.querySelectorAll('.colorOpcion').forEach(e => e.classList.remove('seleccionado'));
                el.classList.add('seleccionado');
                colorCoche = parseInt(el.dataset.color, 16);
                if (coche) {
                    coche.traverse(hijo => {
                        if (hijo.isMesh) {
                            const hex = hijo.material.color.getHex();
                            const esCarroceria = ![0x334333, 0x222222, 0x333333, 0xffff00, 0xff0000, 0xffffff].includes(hex);
                            if (esCarroceria) hijo.material.color.setHex(colorCoche);
                        }
                    });
                }
            });
        });


    reloj.start();
    render();
}

// ------------------------------------------------------------------------------------------------
function crearMeta() {
    const punto   = curvaPista.getPointAt(0);
    const tangente = curvaPista.getTangentAt(0);

    const texMeta = crearTexturaAjedrez();
    const geoMeta = new THREE.TorusGeometry(7, 0.5, 16, 100);
    const matMeta = new THREE.MeshPhongMaterial({ map: texMeta });
    meta = new THREE.Mesh(geoMeta, matMeta);
    meta.position.set(punto.x, punto.y - 1.5, punto.z);
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
    luzDireccional.shadow.mapSize.width = 2048;
    luzDireccional.shadow.mapSize.height = 2048;
    luzDireccional.shadow.camera.near = 0.5;
    luzDireccional.shadow.camera.far = 300;
    luzDireccional.shadow.camera.left = -300;
    luzDireccional.shadow.camera.right = 300;
    luzDireccional.shadow.camera.top = 300;
    luzDireccional.shadow.camera.bottom = -300;
    scene.add(luzDireccional);
}

function crearFondoEspacial() {
    const geometriaFondo = new THREE.SphereGeometry(500, 64, 64);
    const materialFondo = new THREE.MeshBasicMaterial({ color: 0x050510, side: THREE.BackSide });
    scene.add(new THREE.Mesh(geometriaFondo, materialFondo));
    
    const loader = new THREE.GLTFLoader();
    loader.load('./models/sol.glb', function (gltf) {
        const sol = gltf.scene;
        sol.position.set(20, 50, -20);
        sol.scale.set(10, 10, 10); 
        sol.traverse((hijo) => {
            if (hijo.isMesh) {
                hijo.material.emissive = new THREE.Color(0xffaa00);
                hijo.material.emissiveIntensity = 1;
                hijo.layers.set(1);
            }
        });
        scene.add(sol);
    }, undefined, function (error) { console.error(error); });

    crearEstrellas();
}

function crearEstrellas() {
    const cantidadEstrellas = 10000;
    const geometriaEstrellas = new THREE.BufferGeometry();
    const posiciones = new Float32Array(cantidadEstrellas * 3);
    const coloresEstrellas = new Float32Array(cantidadEstrellas * 3);

    for(let i = 0; i < cantidadEstrellas * 3; i+=3) {
        // Mínimo 200 para evitar que coincidan con las pistas
        const r = 200 + Math.random() * 250;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        posiciones[i]   = Math.sin(phi) * Math.cos(theta) * r;
        posiciones[i+1] = Math.sin(phi) * Math.sin(theta) * r * 0.6;
        posiciones[i+2] = Math.cos(phi) * r;

        const colorTipo = Math.random();
        if (colorTipo < 0.33) {
            coloresEstrellas[i]=1.0; coloresEstrellas[i+1]=0.6; coloresEstrellas[i+2]=0.6; 
        } else if (colorTipo < 0.66) {
            coloresEstrellas[i]=0.6; coloresEstrellas[i+1]=0.8; coloresEstrellas[i+2]=1.0; 
        } else {
            coloresEstrellas[i]=1.0; coloresEstrellas[i+1]=1.0; coloresEstrellas[i+2]=0.7; 
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
    
    const materialEstrellas = new THREE.PointsMaterial({
        size: 1.5,
        map: new THREE.CanvasTexture(canvas),
        vertexColors: true, 
        transparent: true,
        blending: THREE.NormalBlending,
        depthWrite: true
    });

    scene.add(new THREE.Points(geometriaEstrellas, materialEstrellas));
}

function crearPista() {
    const waypointsDatos = PISTAS[pistaActual].waypoints;
    curvaPista = new THREE.CatmullRomCurve3(waypointsDatos, true);

    const numSegmentos = 400;
    const anchoPista = 12;
    const posiciones = [];
    const uvs = [];
    const indices = [];

    for (let i = 0; i <= numSegmentos; i++) {
        const t = i / numSegmentos;
        const punto = curvaPista.getPointAt(t);
        const tangente = curvaPista.getTangentAt(t);
        const arriba = new THREE.Vector3(0, 1, 0);
        const perp = new THREE.Vector3().crossVectors(tangente, arriba).normalize();

        posiciones.push(
            punto.x + perp.x * anchoPista / 2, punto.y, punto.z + perp.z * anchoPista / 2
        );
        posiciones.push(
            punto.x - perp.x * anchoPista / 2, punto.y, punto.z - perp.z * anchoPista / 2
        );
        uvs.push(0, t * 30);
        uvs.push(1, t * 30);
    }

    for (let i = 0; i < numSegmentos; i++) {
        const a = i*2, b = i*2+1, c = i*2+2, d = i*2+3;
        indices.push(a, b, c);
        indices.push(b, d, c);
    }

    const geometriaPista = new THREE.BufferGeometry();
    geometriaPista.setAttribute('position', new THREE.Float32BufferAttribute(posiciones, 3));
    geometriaPista.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometriaPista.setIndex(indices);
    geometriaPista.computeVertexNormals();

    const texturaPista = crearTexturaArcoiris();
    texturaPista.wrapS = THREE.RepeatWrapping;
    texturaPista.wrapT = THREE.RepeatWrapping;
    texturaPista.repeat.set(1, 1);

    pista = new THREE.Mesh(geometriaPista, new THREE.MeshLambertMaterial({ map: texturaPista, side: THREE.DoubleSide }));
    pista.receiveShadow = true;
    scene.add(pista);
}

function crearInteractuables() {
    const datos = PISTAS[pistaActual];

    [0.25, 0.5, 0.75].forEach((t, i) => {
        const punto    = curvaPista.getPointAt(t);
        const tangente = curvaPista.getTangentAt(t);
        const geoCP = new THREE.TorusGeometry(8, 0.5, 16, 100);
        const matCP = new THREE.MeshPhongMaterial({
            map: crearTexturaCheckpoint(),
            color: coloresOriginalesCP[i],
            emissive: coloresOriginalesCP[i],
            emissiveIntensity: 0.4
        });
        const checkpoint = new THREE.Mesh(geoCP, matCP);
        checkpoint.position.copy(punto);
        checkpoint.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangente.clone().normalize());
        checkpoint.tocado = false;
        scene.add(checkpoint);
        checkpoints.push(checkpoint);
    });

    crearMeta();

    datos.aceleradores.forEach(a => {
        const infoPista = obtenerDatosPistaCercana(a.x, a.z);
        const acelerador = new THREE.Mesh(
            new THREE.PlaneGeometry(12, 6),
            new THREE.MeshBasicMaterial({ map: crearTexturaFlechas(), side: THREE.DoubleSide })
        );
        acelerador.position.set(infoPista.punto.x, infoPista.punto.y + 0.1, infoPista.punto.z);
        acelerador.lookAt(infoPista.punto.x + infoPista.tangente.x, infoPista.punto.y + infoPista.tangente.y, infoPista.punto.z + infoPista.tangente.z);
        acelerador.rotateX(Math.PI/2);
        scene.add(acelerador);
        aceleradores.push(acelerador);
    });

    const texLadrillo = crearTexturaLadrillosNeon();
    datos.vallas.forEach(v => {
        const infoPista = obtenerDatosPistaCercana(v.x, v.z);
        const valla = new THREE.Mesh(
            new THREE.BoxGeometry(6, 2, 1),
            new THREE.MeshPhongMaterial({ map: texLadrillo })
        );
        valla.position.set(v.x, infoPista.punto.y + 1, v.z); 
        valla.lookAt(v.x + infoPista.tangente.x, infoPista.punto.y + 1, v.z + infoPista.tangente.z);
        scene.add(valla);
        vallas.push(valla);
    });
}

function updateAspectRatio() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
}

function crearCoche() {
    coche = new THREE.Group();

    const matChasis = new THREE.MeshPhongMaterial({ color: colorCoche });
    const matCabina = new THREE.MeshPhongMaterial({ color: 0x222222 });

    const chasis = new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 2), matChasis);
    chasis.castShadow = true; 
    coche.add(chasis);

    const cabina = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.8), matCabina);
    cabina.position.set(0, 0.4, 0.2);
    cabina.castShadow = true;
    coche.add(cabina);

    const geoPiloto = new THREE.SphereGeometry(0.08, 8, 8);
    [[0.45, 0.1, 1], [-0.45, 0.1, 1]].forEach(pos => {
        const piloto = new THREE.Mesh(geoPiloto, new THREE.MeshBasicMaterial({ color: 0xffff00 }));
        piloto.position.set(pos[0], pos[1], pos[2]);
        coche.add(piloto);
        const luzEsquina = new THREE.PointLight(0x00ffff, 1, 10); 
        luzEsquina.position.set(pos[0], pos[1], pos[2]);
        coche.add(luzEsquina);
    });

    [[0.45, 0.1, -1], [-0.45, 0.1, -1]].forEach(pos => {
        const piloto = new THREE.Mesh(geoPiloto, new THREE.MeshBasicMaterial({ color: 0xff0000 }));
        piloto.position.set(pos[0], pos[1], pos[2]);
        coche.add(piloto);
    });

    luzTurbo = new THREE.PointLight(0xff4400, 0, 8);
    luzTurbo.position.set(0, 0.2, -1.2);
    coche.add(luzTurbo);

    const geoEscape = new THREE.CylinderGeometry(0.1, 0.08, 0.7, 8);
    geoEscape.rotateX(Math.PI / 2);
    const matEscape = new THREE.MeshPhongMaterial({ color: 0x333333, emissive: 0x111111 });
    [-0.3, 0.3].forEach(x => {
        const escape = new THREE.Mesh(geoEscape, matEscape);
        escape.position.set(x, -0.1, -1.0);
        coche.add(escape);
    });

    const geoRueda = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16);
    geoRueda.rotateZ(Math.PI / 2); 
    const matRueda = new THREE.MeshPhongMaterial({ color: 0x334333 });
    const geoLlanta = new THREE.BoxGeometry(0.05, 0.4, 0.1); 
    const matLlanta = new THREE.MeshBasicMaterial({ color: 0xffffff });

    ruedas = []; 
    [[0.6, -0.2, 0.8], [-0.6, -0.2, 0.8], [0.6, -0.2, -0.8], [-0.6, -0.2, -0.8]].forEach(pos => {
        const rueda = new THREE.Group(); 
        rueda.add(new THREE.Mesh(geoRueda, matRueda));
        const llanta = new THREE.Mesh(geoLlanta, matLlanta);
        llanta.position.x = pos[0] > 0 ? 0.11 : -0.11; 
        rueda.add(llanta);
        rueda.position.set(pos[0], pos[1], pos[2]);
        coche.add(rueda);
        ruedas.push(rueda); 
    });

    const aleron = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.4), matChasis);
    aleron.position.set(0, 0.4, -0.9);
    coche.add(aleron);
    const soporte = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.1), matCabina);
    soporte.position.set(0, 0.25, -0.8);
    coche.add(soporte);

    coche.position.copy(puntoReaparicion); 
    coche.rotation.set(0, rotacionReaparicion, 0);
    scene.add(coche);
}

function crearCocheFantasma() {
    if (cocheFantasma) { scene.remove(cocheFantasma); cocheFantasma = null; }
    cocheFantasma = new THREE.Group();
    const matF = new THREE.MeshPhongMaterial({ color: 0xff00ff, transparent: true, opacity: 0.35, emissive: 0xff00ff, emissiveIntensity: 0.3 });
    cocheFantasma.add(new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 2), matF));
    const cabF = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.8), matF);
    cabF.position.set(0, 0.4, 0.2);
    cocheFantasma.add(cabF);
    const aleF = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.4), matF);
    aleF.position.set(0, 0.4, -0.9);
    cocheFantasma.add(aleF);
    cocheFantasma.visible = false;
    scene.add(cocheFantasma);
}

function crearTexturaArcoiris() {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#111133';
    ctx.fillRect(0, 0, 512, 128);
    const colores = ['#ff0000','#ff7700','#ffff00','#00ff00','#0000ff','#4b0082','#9400d3'];
    const aw = canvas.width / colores.length;
    colores.forEach((color, i) => {
        ctx.fillStyle = color;
        ctx.fillRect(i * aw, 0, aw, canvas.height);
    });
    return new THREE.CanvasTexture(canvas);
}

function crearTexturaFlechas() {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#111133'; 
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#00ff00';
    ctx.shadowBlur = 15; ctx.shadowColor = '#00ff00';
    ctx.beginPath();
    ctx.moveTo(30, 200); ctx.lineTo(128, 50); ctx.lineTo(226, 200);
    ctx.lineTo(180, 200); ctx.lineTo(128, 120); ctx.lineTo(76, 200);
    ctx.fill();
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 5);
    return tex;
}

function updateMinimapCamera() {
    if (!coche || !cameraTop) return;
    cameraTop.position.x = coche.position.x;
    cameraTop.position.z = coche.position.z;
    cameraTop.lookAt(coche.position.x, 0, coche.position.z);
}

function crearTexturaCheckpoint() {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000011';
    ctx.fillRect(0, 0, 256, 64);
    for (let x = -64; x < 280; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0); ctx.lineTo(x+20, 0); ctx.lineTo(x+84, 64); ctx.lineTo(x+64, 64);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fill();
    }
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
    ctx.shadowBlur = 10; ctx.shadowColor = '#ffffff';
    ctx.strokeRect(2, 2, 252, 60);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(6, 1);
    return tex;
}

function crearTexturaLadrillosNeon() {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0a0a1a'; ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#ff00ff'; ctx.lineWidth = 4;
    ctx.shadowBlur = 10; ctx.shadowColor = '#ff00ff';
    for(let i = 0; i < 256; i += 64) {
        ctx.strokeRect(i, 0, 64, 128);
        ctx.strokeRect(i-32, 128, 64, 128);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 1);
    return tex;
}

function iniciarAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    reproducirMusicaFondo();
}

function reproducirMusicaFondo() {
    if (!audioCtx) return;
    function crearCapa(freq, dur, vol, delay) {
        setTimeout(() => {
            if (!audioCtx) return;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(vol, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
            osc.start(); osc.stop(audioCtx.currentTime + dur);
        }, delay);
    }
    const notas = [130, 146, 164, 174, 195, 220, 246, 261];
    function bucleMusica() {
        if (!juegoIniciado) { setTimeout(bucleMusica, 500); return; }
        notas.forEach((nota, i) => {
            crearCapa(nota, 0.4, 0.04, i * 250);
            crearCapa(nota * 2, 0.2, 0.02, i * 250 + 125);
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
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
            osc.start(); osc.stop(audioCtx.currentTime + 0.15);
        }, i * 80);
    });
}

function sonidoMeta() {
    if (!audioCtx) return;
    [523, 659, 784, 1046].forEach((freq, i) => {
        setTimeout(() => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
            osc.start(); osc.stop(audioCtx.currentTime + 0.3);
        }, i * 100);
    });
}

function sonidoFinal() {
    if (!audioCtx) return;
    [523, 659, 784, 659, 784, 1046, 784, 1046, 1318].forEach((freq, i) => {
        setTimeout(() => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
            osc.start(); osc.stop(audioCtx.currentTime + 0.25);
        }, i * 120);
    });
}

function sonidoBoost() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
    osc.start(); osc.stop(audioCtx.currentTime + 0.3);
}

function sonidoCaidaResbalon() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.8);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
    osc.start(); osc.stop(audioCtx.currentTime + 0.8);
}

function flashCheckpoint(posicion) {
    const luz = new THREE.PointLight(0x00ff00, 8, 20);
    luz.position.copy(posicion); luz.position.y += 2;
    scene.add(luz);
    fuentesLuz.push({ luz, vida: 0.5 });
}

function lanzarFuegosArtificiales() {
    for (let f = 0; f < 15; f++) {
        setTimeout(() => {
            const origen = curvaPista.getPointAt(Math.random()).clone();
            origen.x += (Math.random() - 0.5) * 40;
            origen.z += (Math.random() - 0.5) * 40;
            origen.y += Math.random() * 10;
            const color = [0xff0000, 0x00ffff, 0xffff00, 0xff00ff, 0x00ff00][Math.floor(Math.random() * 5)];
            const matFA = new THREE.MeshBasicMaterial({ color });
            for (let i = 0; i < 30; i++) {
                const p = new THREE.Mesh(new THREE.SphereGeometry(0.15, 4, 4), matFA);
                p.position.copy(origen);
                const vel = new THREE.Vector3((Math.random()-0.5)*15, 5+Math.random()*15, (Math.random()-0.5)*15);
                scene.add(p);
                fuegosArtificiales.push({ mesh: p, vel, vida: 1.5 + Math.random() });
            }
            const luzFA = new THREE.PointLight(color, 10, 25);
            luzFA.position.copy(origen); luzFA.position.y = 8;
            scene.add(luzFA);
            fuentesLuz.push({ luz: luzFA, vida: 0.4 });
        }, f * 300);
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
    let mejorT = 0, minDist = Infinity;
    for(let i = 0; i <= 100; i++) {
        const t = i / 100;
        const pt = curvaPista.getPointAt(t);
        const dist = Math.hypot(pt.x - x, pt.z - z);
        if(dist < minDist) { minDist = dist; mejorT = t; }
    }
    return { punto: curvaPista.getPointAt(mejorT), tangente: curvaPista.getTangentAt(mejorT) };
}

// Pantalla final mejorada con medalla y estrellas
function mostrarPantallaFin(tiempoTotal, caidas, vueltas, victoria) {
    const panel = document.getElementById('pantallaFin');
    
    let estrellas = 3;
    if (caidas > 5) estrellas = 1;
    else if (caidas > 2) estrellas = 2;
    
    const strEstrellas = '⭐'.repeat(estrellas) + '☆'.repeat(3 - estrellas);
    const medallaColor = estrellas === 3 ? '#FFD700' : estrellas === 2 ? '#C0C0C0' : '#CD7F32';
    const medallaTexto = estrellas === 3 ? '🏆 ORO' : estrellas === 2 ? '🥈 PLATA' : '🥉 BRONCE';

    let extraFantasma = '';
    if (modoJuego === 'fantasma' && mejorTiempoFantasma < Infinity) {
        extraFantasma = `👻 Mejor vuelta: <span style="color:#ff00ff;">${mejorTiempoFantasma.toFixed(2)}s</span><br>`;
    }

    panel.innerHTML = `
        <h1 style="font-size:3rem; color:#00ffff; text-shadow:0 0 10px #00ffff, 0 0 20px #00ffff; margin-bottom:5px; font-family:'Courier New',monospace; text-align:center;">
            ${victoria ? '¡CARRERA TERMINADA!' : '⏱ ¡TIEMPO AGOTADO!'}
        </h1>
        <div style="font-size:2.5rem; margin:8px 0; text-align:center;">${strEstrellas}</div>
        <div style="font-size:1.4rem; color:${medallaColor}; font-family:'Courier New',monospace; margin-bottom:15px; font-weight:bold; text-align:center;">${medallaTexto}</div>
        <div style="font-size:1.1rem; background:rgba(0,0,0,0.6); border:2px solid cyan; border-radius:10px; padding:20px 45px; margin:10px; text-align:center; line-height:3; font-family:'Courier New',monospace; color:white;">
            ⏱️ Tiempo total: <span style="color:#ffff00;">${tiempoTotal}s</span><br>
            🏁 Vueltas: <span style="color:#00ff00;">${vueltas}/${TOTAL_VUELTAS}</span><br>
            💥 Caídas: <span style="color:#ff4444;">${caidas}</span><br>
            ${extraFantasma}
        </div>
        <button id="btnVolver" style="margin-top:20px; padding:15px 40px; font-size:1.6rem; background:transparent; color:#ff00ff; border:3px solid #ff00ff; cursor:pointer; text-transform:uppercase; font-weight:bold; box-shadow:0 0 15px #ff00ff inset; font-family:'Courier New',monospace;">Volver al Menú</button>
    `;
    panel.style.display = 'flex';
    
    document.getElementById('btnVolver').addEventListener('click', () => {
        panel.style.display = 'none';
        document.getElementById('pantallaMenu').style.display = 'flex';
        document.getElementById('pantallaModos').style.display = 'none';
        document.getElementById('pantallaPistas').style.display = 'none';
        document.getElementById('menuInicio').style.display = 'flex';
        document.getElementById('hud').style.display = 'none';
        document.getElementById('hudControlesJuego').style.display = 'none';
        document.getElementById('hudContrareloj').style.display = 'none';
    });
}

// ------------------------------------------------------------------------------------------------
function update() {
    if (!juegoIniciado) return;

    const delta = reloj.getDelta();

    // --- MODO FANTASMA: grabación y reproducción ---
    if (modoJuego === 'fantasma') {
        tiempoVueltaActual += delta;

        // Grabamos cada frame con su timestamp dentro de la vuelta
        if (grabandoFantasma) {
            grabacionActual.push({
                x: coche.position.x,
                y: coche.position.y,
                z: coche.position.z,
                rotY: coche.rotation.y,
                t: tiempoVueltaActual
            });
        }

        // Reproducción sincronizada por tiempo
        if (reproduciendo && mejorGrabacion.length > 1 && cocheFantasma) {
            cocheFantasma.visible = true;
            tiempoFrameAcum += delta;

            // Avanzar al frame correcto según el tiempo transcurrido
            while (frameFantasma < mejorGrabacion.length - 1 && 
                   mejorGrabacion[frameFantasma + 1].t <= tiempoFrameAcum) {
                frameFantasma++;
            }

            if (frameFantasma < mejorGrabacion.length - 1) {
                const fA = mejorGrabacion[frameFantasma];
                const fB = mejorGrabacion[frameFantasma + 1];
                const rango = fB.t - fA.t;
                const alpha = rango > 0.0001 ? Math.min(1, (tiempoFrameAcum - fA.t) / rango) : 0;

                cocheFantasma.position.x = fA.x + (fB.x - fA.x) * alpha;
                cocheFantasma.position.y = fA.y + (fB.y - fA.y) * alpha;
                cocheFantasma.position.z = fA.z + (fB.z - fA.z) * alpha;
                cocheFantasma.rotation.y = fA.rotY + (fB.rotY - fA.rotY) * alpha;
            } else {
                // Fantasma llegó al final — reiniciar
                frameFantasma = 0;
                tiempoFrameAcum = 0;
                cocheFantasma.visible = false;
            }

            // HUD delta: positivo = vamos delante del fantasma (bien), negativo = fantasma nos gana
            const delta_t = mejorTiempoFantasma > 0 ? tiempoFrameAcum - tiempoVueltaActual : 0;
            const elDelta = document.getElementById('deltaTiempoHUD');
            if (elDelta) {
                if (delta_t > 0.05) {
                    elDelta.innerText = `+${delta_t.toFixed(2)}s`;
                    elDelta.style.color = '#00ff00';
                    elDelta.style.textShadow = '0 0 10px #00ff00';
                    cocheFantasma.traverse(m => { if (m.isMesh) { m.material.opacity = 0.35; m.material.emissiveIntensity = 0.3; }});
                } else if (delta_t < -0.05) {
                    elDelta.innerText = `${delta_t.toFixed(2)}s`;
                    elDelta.style.color = '#ff4444';
                    elDelta.style.textShadow = '0 0 10px #ff4444';
                    const pulso = 0.5 + 0.4 * Math.sin(Date.now() * 0.008);
                    cocheFantasma.traverse(m => { if (m.isMesh) { m.material.opacity = pulso; m.material.emissiveIntensity = pulso * 1.5; }});
                } else {
                    elDelta.innerText = `±0.00s`;
                    elDelta.style.color = '#ffff00';
                    elDelta.style.textShadow = '0 0 10px #ffff00';
                }
            }
        }

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

    // Modo contrarreloj
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
            document.getElementById('hud').style.display = 'none';
            document.getElementById('hudContrareloj').style.display = 'none';
            mostrarPantallaFin(tiempoJugado.toFixed(1), contadorCaidas, contadorVueltas, false);
        }
    }
    
    if(document.getElementById('tiempoHUD'))
        document.getElementById('tiempoHUD').innerText = tiempoJugado.toFixed(1);

    if (coche) {
        if (estadoCaida) {
            coche.rotation.x += 5 * delta;
            coche.rotation.z += 8 * delta;
            coche.position.y -= 15 * delta;
        } else {
            // Velocidad y boost
            if (tiempoBoost > 0) {
                tiempoBoost -= delta;
                velocidadActual = velocidadBase * 2;
            } else {
                velocidadActual = velocidadBase;
            }

            let moviendose = false;
            let puedeAvanzar = true;

            // Calcular velocidad objetivo con inercia
            let velocidadObjetivo = 0;
            if (teclas.ArrowUp)   velocidadObjetivo =  velocidadBase * (tiempoBoost > 0 ? 2 : 1);
            if (teclas.ArrowDown) velocidadObjetivo = -velocidadBase * 0.5;

            if (velocidadObjetivo !== 0) {
                // Acelerando o frenando activamente
                const tasa = velocidadReal * velocidadObjetivo < 0 ? frenado : aceleracion;
                velocidadReal = THREE.MathUtils.lerp(velocidadReal, velocidadObjetivo, tasa * delta / velocidadBase);
            } else {
                // Rozamiento natural al soltar el gas
                velocidadReal = THREE.MathUtils.lerp(velocidadReal, 0, rozamiento * delta / velocidadBase);
                if (Math.abs(velocidadReal) < 0.1) velocidadReal = 0;
            }

            // Detección de choque solo si avanzamos
            if (velocidadReal > 0) {
                const rayoValla = new THREE.Raycaster();
                const origenV = coche.position.clone();
                origenV.y += 0.5;
                const dirV = new THREE.Vector3(0, 0, 1).applyQuaternion(coche.quaternion);
                rayoValla.set(origenV, dirV);
                const cols = rayoValla.intersectObjects(vallas);
                if (cols.length > 0 && cols[0].distance < 1.5) {
                    puedeAvanzar = false;
                    velocidadReal *= -0.3; // Rebote suave
                }
            }

            if (puedeAvanzar || velocidadReal < 0) {
                const distanciaMov = velocidadReal * delta;
                coche.translateZ(distanciaMov);
                ruedas.forEach(r => r.rotation.x -= distanciaMov * 2);
                if (Math.abs(velocidadReal) > 0.5) moviendose = true;
            }

           // Girar siempre que se pulse, pero más lento si no se mueve
            const factorGiro = Math.min(1, Math.abs(velocidadReal) / velocidadBase);
            if (teclas.ArrowLeft)  coche.rotation.y += velocidadGiro * factorGiro * delta;
            if (teclas.ArrowRight) coche.rotation.y -= velocidadGiro * factorGiro * delta;

            // Checkpoints
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

                    if (modoJuego === 'fantasma') {
                        // Guardar si es mejor vuelta
                        if (tiempoVueltaActual < mejorTiempoFantasma) {
                            mejorTiempoFantasma = tiempoVueltaActual;
                            mejorGrabacion = [...grabacionActual];
                        }
                        // Reset de grabación y reproducción
                        grabacionActual = [];
                        tiempoVueltaActual = 0;
                        frameFantasma = 0;
                        tiempoFrameAcum = 0;
                        reproduciendo = true;
                        grabandoFantasma = true;
                        if (cocheFantasma) cocheFantasma.visible = false;
                    }

                    contadorVueltas++;
                    sonidoMeta();
                    lanzarFuegosArtificiales();

                    const restantes = TOTAL_VUELTAS - contadorVueltas;
                    if (restantes > 0)
                        mostrarAvisoVuelta(`¡${restantes} VUELTA${restantes > 1 ? 'S' : ''} RESTANTE${restantes > 1 ? 'S' : ''}!`, '#00ffff');

                    if (document.getElementById('vueltasHUD'))
                        document.getElementById('vueltasHUD').innerText = contadorVueltas;

                    meta.material.color.setHex(0x00ff00);
                    setTimeout(() => { if (meta) meta.material.color.setHex(0xffffff); }, 600);

                    indiceSiguienteCheckpoint = 0;
                    checkpoints.forEach((cp, i) => {
                        cp.tocado = false;
                        cp.material.color.setHex(coloresOriginalesCP[i]);
                        cp.material.emissive.setHex(0x000000);
                    });

                    puntoReaparicion.copy(coche.position);
                    rotacionReaparicion = coche.rotation.y;

                    if (contadorVueltas >= TOTAL_VUELTAS) {
                        juegoIniciado = false;
                        document.getElementById('hud').style.display = 'none';
                        document.getElementById('hudContrareloj').style.display = 'none';
                        mostrarPantallaFin(tiempoJugado.toFixed(1), contadorCaidas, TOTAL_VUELTAS, true);
                        sonidoFinal();
                    }
                }
                if (coche.position.distanceTo(meta.position) >= 6) meta.tocada = false;
            }
            
            // Aceleradores
            aceleradores.forEach(acc => {
                if (coche.position.distanceTo(acc.position) < 4) {
                    if (tiempoBoost <= 0) sonidoBoost();
                    tiempoBoost = 1.5;
                }
            });

            // Sistema de caída — SIN DUPLICADO
            const origenRayo = coche.position.clone();
            origenRayo.y += 10; 
            raycaster.set(origenRayo, vectorAbajo);
            const intersecciones = raycaster.intersectObject(pista);

            if (intersecciones.length === 0) {
                // Solo iniciamos la caída si no estábamos ya cayendo
                if (!estadoCaida) {
                    if (timerCaida) clearTimeout(timerCaida);
                    estadoCaida = true;
                    sonidoCaidaResbalon();
                    contadorCaidas++;
                    if(document.getElementById('caidasHUD')) 
                        document.getElementById('caidasHUD').innerText = contadorCaidas;
                    
                    timerCaida = setTimeout(() => {
                        coche.position.copy(puntoReaparicion);
                        coche.rotation.set(0, rotacionReaparicion, 0);  
                        estadoCaida = false;            
                        if (!camaraLibre) {
                            const offset = new THREE.Vector3(0, 4, -7); 
                            offset.applyQuaternion(coche.quaternion); 
                            offset.add(coche.position); 
                            camera.position.copy(offset);
                            camera.lookAt(coche.position);
                        }
                    }, 1000); 
                }
            } else {
                coche.position.y = intersecciones[0].point.y + 0.5; 
            }

            // Partículas de escape
            if (teclas.ArrowUp && !estadoCaida) {
                for (let pIdx = 0; pIdx < 2; pIdx++) {
                    const mat = tiempoBoost > 0 ? matFuego : matHumo;
                    const particula = new THREE.Mesh(geoParticulaBase, mat);
                    const esc = 0.8 + Math.random() * 0.4;
                    particula.scale.set(esc, esc, esc);
                    const offs = [new THREE.Vector3(-0.3, -0.1, -1.5), new THREE.Vector3(0.3, -0.1, -1.5)];
                    const offset = offs[pIdx].clone();
                    offset.x += (Math.random()-0.5)*0.15;
                    offset.y += (Math.random()-0.5)*0.15;
                    offset.applyQuaternion(coche.quaternion);
                    particula.position.copy(coche.position).add(offset);
                    scene.add(particula);
                    particulas.push({ mesh: particula, life: 0.8 });
                }
                if (luzTurbo) luzTurbo.intensity = 1.5 + Math.random() * 2.5;
            } else {
                if (luzTurbo) luzTurbo.intensity = 0;
            }
        }
    }

    // Limpiar partículas
    for (let i = particulas.length - 1; i >= 0; i--) {
        const p = particulas[i];
        p.life -= delta;
        p.mesh.position.y += delta;
        p.mesh.scale.setScalar(p.life);
        if (p.life <= 0) { scene.remove(p.mesh); particulas.splice(i, 1); }
    }

    // Cámara
    if (camaraLibre) {
        if (cameraControls) cameraControls.update();
    } else if (coche && !estadoCaida) {
        const offset = new THREE.Vector3(0, 4, -7); 
        offset.applyQuaternion(coche.quaternion); 
        offset.add(coche.position); 
        camera.position.lerp(offset, 0.1); 
        camera.lookAt(coche.position);
    }

    // Animaciones
    const t = Date.now() * 0.001;
    checkpoints.forEach((cp, i) => { cp.rotation.z = t * (0.8 + i * 0.2); });
    if (meta) meta.rotation.z = t * 1.2;

    // Flashes de luz
    for (let i = fuentesLuz.length - 1; i >= 0; i--) {
        fuentesLuz[i].vida -= delta;
        fuentesLuz[i].luz.intensity *= 0.85;
        if (fuentesLuz[i].vida <= 0) { scene.remove(fuentesLuz[i].luz); fuentesLuz.splice(i, 1); }
    }

    // Fuegos artificiales
    for (let i = fuegosArtificiales.length - 1; i >= 0; i--) {
        const fa = fuegosArtificiales[i];
        fa.vel.y -= 9.8 * delta;
        fa.mesh.position.addScaledVector(fa.vel, delta);
        fa.vida -= delta;
        fa.mesh.material.opacity = fa.vida;
        fa.mesh.material.transparent = true;
        if (fa.vida <= 0) { scene.remove(fa.mesh); fuegosArtificiales.splice(i, 1); }
    }

    updateMinimapCamera();
}

function render() {
    requestAnimationFrame(render);
    update();
    renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.setScissorTest(false);
    renderer.setClearColor(new THREE.Color(0x050510));
    renderer.clear();
    renderer.render(scene, camera);
    if (cameraTop && rendererMinimap) {
        rendererMinimap.clear();
        rendererMinimap.render(scene, cameraTop);
    }
}
// ------------------------------------------------------------------------------------------------

window.addEventListener('keydown', (event) => {
    if (teclas.hasOwnProperty(event.code)) teclas[event.code] = true;
    if (event.code === 'KeyV') {
        camaraLibre = !camaraLibre; 
        cameraControls.enabled = camaraLibre;
        if(camaraLibre && coche) cameraControls.target.copy(coche.position);
    }
});

window.addEventListener('keyup', (event) => {
    if (teclas.hasOwnProperty(event.code)) teclas[event.code] = false;
});

init();