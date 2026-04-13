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
let velocidadActual = 0;
const aceleracion = 20;  // Cuánto acelera por segundo
const friccion = 0.98;   // Resistencia (rozamiento)

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
    
    // Inicialmente lo desactivamos para que siga al coche
    cameraControls.enabled = false; 

    // Monitor de estadísticas
    stats.showPanel(0);

    document.getElementById('container').appendChild(stats.domElement);

    window.addEventListener('resize', updateAspectRatio);

    stats.dom.style.position = 'absolute';
    stats.dom.style.bottom = '10px';
    stats.dom.style.right = '10px';
    stats.dom.style.top = 'auto';
    stats.dom.style.left = 'auto';

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
    const luzAmbiental = new THREE.AmbientLight(0xffffff, 0.3); 
    scene.add(luzAmbiental);

    const luzDireccional = new THREE.DirectionalLight(0xffffff, 0.6);
    luzDireccional.position.set(20, 50, -20);

    luzDireccional.castShadow = true;
    
    // Configurar la calidad de la sombra (opcional pero recomendado)
    luzDireccional.shadow.mapSize.width = 1024;
    luzDireccional.shadow.mapSize.height = 1024;
    // Definir el área que abarca la luz direccional (el "frustum")
    luzDireccional.shadow.camera.near = 0.5;
    luzDireccional.shadow.camera.far = 100;
    luzDireccional.shadow.camera.left = -100;
    luzDireccional.shadow.camera.right = 100;
    luzDireccional.shadow.camera.top = 100;
    luzDireccional.shadow.camera.bottom = -100;

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

    const centroPista = new THREE.Vector3(15, 0, 10); // Centro aproximado de tus waypoints

    for(let i = 0; i < cantidadEstrellas * 3; i+=3) {
        const r = 100 + Math.random() * 200;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        
        posiciones[i] = Math.sin(phi) * Math.cos(theta) * r;
        posiciones[i+1] = Math.sin(phi) * Math.sin(theta) * r * 0.6;
        posiciones[i+2] = Math.cos(phi) * r;

        // COLORES MÁS VIBRANTES Y VARIADOS (Rojos, Azules, Amarillos, Verdes)
        const colorTipo = Math.random();
        if (colorTipo < 0.33) {
            coloresEstrellas[i] = 1.0; coloresEstrellas[i+1] = 0.6; coloresEstrellas[i+2] = 0.6; // Rojiza
        } else if (colorTipo < 0.66) {
            coloresEstrellas[i] = 0.6; coloresEstrellas[i+1] = 0.8; coloresEstrellas[i+2] = 1.0; // Azulada
        } else {
            coloresEstrellas[i] = 1.0; coloresEstrellas[i+1] = 1.0; coloresEstrellas[i+2] = 0.7; // Amarillenta
        }
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
    pista.receiveShadow = true;
    pista.castShadow = false;

    // Aplastar el tubo en el eje Y (vertical) 
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
    chasis.castShadow = true; // El chasis proyecta sombra
    coche.add(chasis);

    // La cabina
    const geoCabina = new THREE.BoxGeometry(0.8, 0.4, 0.8);
    const matCabina = new THREE.MeshPhongMaterial({ color: 0x222222 });
    const cabina = new THREE.Mesh(geoCabina, matCabina);
    cabina.position.set(0, 0.4, 0.2);
    cabina.castShadow = true;
    coche.add(cabina);

    // Luces delanteras
    const posicionesLucesAlante = [
        [0.45, 0.1, 1],   // Delantera Izquierda
        [-0.45, 0.1, 1],  // Delantera Derecha
    ];

    // Luces traseras
    const posicionesLucesDetras = [
        [0.45, 0.1, -1],  // Trasera Izquierda
        [-0.45, 0.1, -1]  // Trasera Derecha
    ];
    // Para que se vean como unos "pilotitos" luminosos, les ponemos una esferita pequeña
    const geoPiloto = new THREE.SphereGeometry(0.08, 8, 8);
    const matPilotoAlant = new THREE.MeshBasicMaterial({ color: 0xffff00 }); // Color neón que no le afectan las sombras

    posicionesLucesAlante.forEach(pos => {
        // El objeto visual
        const piloto = new THREE.Mesh(geoPiloto, matPilotoAlant);
        piloto.position.set(pos[0], pos[1], pos[2]);
        coche.add(piloto);

        // La luz real que emite
        const luzEsquina = new THREE.PointLight(0x00ffff, 1, 10); // Intensidad 0.6, Distancia 5
        luzEsquina.position.set(pos[0], pos[1], pos[2]);
        coche.add(luzEsquina);
    });

    const matPilotoDetra = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Color neón que no le afectan las sombras

    posicionesLucesDetras.forEach(pos => {
        const piloto = new THREE.Mesh(geoPiloto, matPilotoDetra);
        piloto.position.set(pos[0], pos[1], pos[2]);
        coche.add(piloto);
    });

    // LLANTAS Y RUEDAS
    const geoRueda = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16);
    geoRueda.rotateZ(Math.PI / 2); 
    const matRueda = new THREE.MeshPhongMaterial({ color: 0x334333 });
    const geoLlanta = new THREE.BoxGeometry(0.05, 0.4, 0.1); 
    const matLlanta = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const posicionesRuedas = [
        [0.6, -0.2, 0.8],  
        [-0.6, -0.2, 0.8], 
        [0.6, -0.2, -0.8], 
        [-0.6, -0.2, -0.8] 
    ];

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
        gradient.addColorStop(0.4, color);
        gradient.addColorStop(0.6, color);
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

    //Antiguo movimiento del coche
    if (coche) {
        if (teclas.ArrowLeft) coche.rotation.y += velocidadGiro * delta; 
        if (teclas.ArrowRight) coche.rotation.y -= velocidadGiro * delta; 
        
        if (teclas.ArrowUp){ 
            coche.translateZ(velocidadMax * delta);  
            // Llantas
            ruedas.forEach(r => r.rotation.x += velocidadMax * delta * 2); 
        }
        if (teclas.ArrowDown){ 
            coche.translateZ(-velocidadMax * delta); 
            ruedas.forEach(r => r.rotation.x -= velocidadMax * delta * 2);
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

    /*
    if (coche) {
        // 1. Aceleración y Frenado
        if (teclas.ArrowUp) {
            velocidadActual += aceleracion * delta;
        } else if (teclas.ArrowDown) {
            velocidadActual -= aceleracion * delta;
        }
        
        // 2. Fricción (el coche se va frenando solo si no aceleras)
        velocidadActual *= friccion;

        // 3. Limitar la velocidad máxima (hacia adelante y marcha atrás)
        if (velocidadActual > velocidadMax) velocidadActual = velocidadMax;
        if (velocidadActual < -velocidadMax / 2) velocidadActual = -velocidadMax / 2; // Marcha atrás más lenta

        // 4. Giro (Solo permitimos girar si el coche se está moviendo)
        if (Math.abs(velocidadActual) > 0) {
            // Si vamos marcha atrás, invertimos el giro para que sea realista
            const direccionGiro = velocidadActual > 0 ? 1 : -1;
            
            if (teclas.ArrowLeft) coche.rotation.y += velocidadGiro * delta * direccionGiro; 
            if (teclas.ArrowRight) coche.rotation.y -= velocidadGiro * delta * direccionGiro; 
        }

        // 5. Aplicar el movimiento final
        coche.translateZ(velocidadActual * delta);  
        
        // 6. Animar llantas en base a la velocidad real
        ruedas.forEach(r => r.rotation.x += velocidadActual * delta * 2);

        // Posicionamos el origen del láser un poquito por encima del centro del coche
        const origenRayo = coche.position.clone();
        origenRayo.y += 1; 
        raycaster.set(origenRayo, vectorAbajo);
        const intersecciones = raycaster.intersectObject(pista);

        // Si la lista de intersecciones está vacía (longitud 0), no hay suelo debajo
        if (intersecciones.length === 0) {
            coche.position.set(0, 0.5, 0);
            coche.rotation.set(0, 90, 0);
            velocidadActual = 0; // Reiniciamos la velocidad al caer para evitar que salga disparado al volver a aparecer

            contadorCaidas++;
            if(document.getElementById('caidasHUD')) {
                document.getElementById('caidasHUD').innerText = contadorCaidas;
            }
        }

    }*/

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